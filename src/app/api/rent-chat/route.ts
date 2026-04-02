import { NextResponse } from "next/server";
import { rentalCatalog } from "@/data/rentalCatalog";

// CONFIGURATION
const STYLIST_API_URL = "http://127.0.0.1:8005"; // Local SmolLM2 Port
const CATALOG_API_URL = "http://127.0.0.1:8003"; // CLIP/Catalog Port

// HELPER DATA
const OCCASION_KEYWORDS: Record<string, string[]> = {
  work: ["work", "office", "business", "professional"],
  casual: ["casual", "relaxed", "everyday", "day", "brunch", "lunch"],
  festive: ["festive", "celebration", "chinese new year", "christmas", "holiday"],
  dinner: ["dinner", "evening", "formal", "gala", "party", "date", "night", "wedding"],
};

// HELPER FUNCTIONS
function extractBudget(query: string): number | null {
  const patterns = [
    /\$?\s*(\d+)\s*(?:sgd|sg|euro|eur|dollar|usd)?/gi,
    /(?:under|budget|less\s*than|below|not\s*more\s*than)\s*\$?\s*(\d+)/gi,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(query);
    if (match) return parseInt(match[1], 10);
  }
  return null;
}

function keywordSearch(query: string, budget: number | null) {
  const q = query.toLowerCase();
  const queryWords = q.split(/\s+/).filter(w => w.length > 1);
  const scores: { id: string; imageFilename: string; score: number }[] = [];

  for (const item of rentalCatalog) {
    let score = 0;
    const name = item.name.toLowerCase();
    const category = item.category.toLowerCase();
    const occasion = item.occasion.toLowerCase();
    const color = item.color.toLowerCase();
    const description = item.description.toLowerCase();

    if (category.includes(q)) score += 5;
    if (color.includes(q)) score += 3;
    
    const occasionMatch = Object.entries(OCCASION_KEYWORDS).find(([_, kws]) =>
      kws.some(kw => q.includes(kw))
    );
    if (occasionMatch && occasion.includes(occasionMatch[0])) score += 4;
    if (budget && item.price <= budget) score += 10;

    for (const word of queryWords) {
      if (description.includes(word)) score += 1;
    }

    const imageFilename = item.image.split('/').pop() || '';
    scores.push({ id: item.id, imageFilename, score });
  }
  return scores.sort((a, b) => b.score - a.score);
}

// MAIN HANDLER
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message } = body;
    const userMessage = message.toLowerCase().trim();

    // --- STEP A: REFINED ROUTER LOGIC (The Gatekeeper) ---
    
    // 1. Check for specific "Advice" keywords
    const wantsAdvice = ["pair", "with", "style", "goes", "advice", "suggest", "wear"].some(kw => userMessage.includes(kw));

    // 2. Check for "Shopping" keywords
    const isShopping = ["rent", "show", "catalog", "find", "buy", "available", "stock"].some(kw => userMessage.includes(kw));

    // 3. LOGIC: If they want advice OR aren't explicitly shopping, use SmolLM2
    if (wantsAdvice || !isShopping) {
      try {
        const stylistResponse = await fetch(`${STYLIST_API_URL}/api/v1/style-chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: message }), 
        });
        
        if (stylistResponse.ok) {
          const aiData = await stylistResponse.json();
          return NextResponse.json({
            response: aiData.response,
            items: [], 
            queryType: "SmolLM2 Local Stylist"
          });
        }
      } catch (e) {
        console.log("Stylist Backend (8005) unreachable, falling back to catalog...");
      }
    }

    // --- STEP B: CATALOG LOGIC (CLIP + KEYWORDS) ---
    const budget = extractBudget(userMessage);
    const keywordScores = keywordSearch(userMessage, budget);

    let clipScoresByFilename: Record<string, number> = {};
    let clipServerWorking = false;
    
    try {
      const clipResponse = await fetch(`${CATALOG_API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message }),
      });

      if (clipResponse.ok) {
        const clipData = await clipResponse.json();
        if (clipData.items) {
          clipServerWorking = true;
          clipData.items.forEach((item: any) => {
            const filename = item.image || item.image_path || '';
            clipScoresByFilename[filename] = (item.clip_percent || item.similarity || 0) / 100;
          });
        }
      }
    } catch (error) {
      console.log("CLIP Server on 8003 unreachable");
    }

    const combined = keywordScores.map(kw => {
      const clipScore = clipScoresByFilename[kw.imageFilename] || 0;
      const normalizedKeyword = Math.min(kw.score / 15, 1);
      const finalScore = (0.5 * normalizedKeyword) + (0.5 * clipScore);
      
      return {
        id: kw.id,
        keywordPercent: Math.round(normalizedKeyword * 100),
        clipPercent: Math.round(clipScore * 100),
        finalPercent: Math.round(finalScore * 100),
      };
    });

    combined.sort((a, b) => b.finalPercent - a.finalPercent);
    const topItems = combined.slice(0, 5).map(result => {
      const item = rentalCatalog.find(i => i.id === result.id);
      return item ? { ...item, ...result } : null;
    }).filter(Boolean);

    return NextResponse.json({
      response: `I found some matches for you! Top pick: ${topItems[0]?.name || 'curated selection'}.`,
      items: topItems,
      queryType: "Catalog Search",
      clipServerWorking
    });

  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ response: "Internal error", items: [] }, { status: 500 });
  }
}