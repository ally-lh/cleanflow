import { NextResponse } from "next/server";
import { rentalCatalog } from "@/data/rentalCatalog";

const PYTHON_API_URL = process.env.PYTHON_RENTAL_API_URL || "http://127.0.0.1:8003";

const OCCASION_KEYWORDS: Record<string, string[]> = {
  work: ["work", "office", "business", "professional"],
  casual: ["casual", "relaxed", "everyday", "day", "brunch", "lunch"],
  festive: ["festive", "celebration", "chinese new year", "christmas", "holiday"],
  dinner: ["dinner", "evening", "formal", "gala", "party", "date", "night", "wedding"],
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  dress: ["dress", "gown", "dresses"],
  jumpsuit: ["jumpsuit"],
  romper: ["romper"],
  top: ["top", "tops", "vest", "blouse", "shirt"],
  suit: ["suit", "suits", "blazer"],
  jacket: ["jacket", "coat"],
};

function extractBudget(query: string): number | null {
  const patterns = [
    /\$?\s*(\d+)\s*(?:sgd|sg|euro|eur|dollar|usd)?/gi,
    /(?:under|budget|less\s*than|below|not\s*more\s*than)\s*\$?\s*(\d+)/gi,
    /(\d+)\s*(?:sgd|sg|euro|eur|dollar|usd)/gi,
  ];
  
  for (const pattern of patterns) {
    const matches = query.match(pattern);
    if (matches) {
      for (const match of matches) {
        const numMatch = match.match(/(\d+)/);
        if (numMatch) {
          return parseInt(numMatch[1], 10);
        }
      }
    }
  }
  return null;
}

function keywordSearch(query: string, budget: number | null) {
  const q = query.toLowerCase();
  const queryWords = q.split(/\s+/).filter(w => w.length > 1);
  const scores: { id: string; imageFilename: string; score: number }[] = [];
  
  let extractedCategory: string | null = null;
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => q.includes(kw))) {
      extractedCategory = cat;
      break;
    }
  }

  for (const item of rentalCatalog) {
    let score = 0;
    const name = item.name.toLowerCase();
    const category = item.category.toLowerCase();
    const occasion = item.occasion.toLowerCase();
    const color = item.color.toLowerCase();
    const description = item.description.toLowerCase();
    const brand = item.brand.toLowerCase();
    
    if (extractedCategory && category === extractedCategory) {
      score += 10;
    } else if (extractedCategory && category.includes(q)) {
      score += 5;
    } else if (!extractedCategory && category.includes(q)) {
      score += 5;
    }
    
    const occasionMatch = Object.entries(OCCASION_KEYWORDS).find(([_, kws]) =>
      kws.some(kw => q.includes(kw))
    );
    if (occasionMatch && occasion.includes(occasionMatch[0])) {
      score += 8;
    } else if (occasionMatch && !occasion.includes(occasionMatch[0])) {
      score -= 5;
    }

    if (color.includes(q) || q.split(/\s+/).some(w => w.length >= 3 && color.includes(w))) score += 5;

    // const clothingTypes = ["dress", "jumpsuit", "romper", "top", "suit", "vest", "jacket"];
    // for (const type of clothingTypes) {
      // if (q.includes(type) && (name.includes(type) || category.includes(type))) {
      //   score += 6;
      //   break;
      // }
    // }

    if (brand.includes(q)) score += 2;

    if (q.includes("cheap") || q.includes("budget") || q.includes("affordable") || q.includes("under") || q.includes("$") || /\d+\s*(?:sgd|sg)/i.test(q)) {
      if (budget && item.price <= budget) {
        score += 10;
      } else if (item.price < 50) {
        score += 3;
      }
    }

    if (q.includes("expensive") || q.includes("luxury") || q.includes("elegant") || q.includes("premium")) {
      if (item.price >= 80) score += 4;
      if (item.category === "Dress" || item.category === "Suit") score += 3;
    }

    if (q.includes("formal") || q.includes("gala") || q.includes("wedding")) {
      if (item.category === "Dress" || item.category === "Suit") score += 3;
    }

    for (const word of queryWords) {
      if (description.includes(word)) score += 1;
    }

    const imageFilename = item.image.split('/').pop() || '';
    scores.push({ id: item.id, imageFilename, score });
  }

  return scores.sort((a, b) => b.score - a.score);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message } = body as { message: string; history?: unknown[] };
    const userMessage = message.toLowerCase().trim();

    const fashionKeywords = [
      "wear", "clothing", "dress", "outfit", "fit", "shirt", "style", "fashion", "jumpsuit",
      "romper", "top", "suit", "color", "casual", "formal", "party", "wedding",
      "work", "office", "evening", "elegant", "cheap", "budget", "black", "white",
      "blue", "green", "yellow", "red", "pink", "beige", "grey", "luxury",
      "expensive", "premium", "affordable", "chic", "vintage", "modern", "flowy", "fitted"
    ];

    if (!fashionKeywords.some(kw => userMessage.includes(kw))) {
      return NextResponse.json({
        response: "I'm a fashion style assistant for rental clothing. Tell me about what you're looking for - the event, style, colors, or budget!",
        suggestItems: false,
        items: []
      });
    }

    const budget = extractBudget(userMessage);

    const keywordScores = keywordSearch(userMessage, budget);

    let clipScoresByFilename: Record<string, number> = {};
    let clipServerWorking = false;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const clipResponse = await fetch(`${PYTHON_API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, catalog: "rental" }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (clipResponse.ok) {
        const clipData = await clipResponse.json();
        
        if (clipData.items && Array.isArray(clipData.items)) {
          clipServerWorking = true;
          
          for (const item of clipData.items) {
            const clipPercent = item.clip_percent || item.similarity || 0;
            const filename = item.image || item.image_path || '';
            
            clipScoresByFilename[filename] = clipPercent / 100;
            
            if (item.id) {
              const matchingItem = rentalCatalog.find(ri => ri.id === item.id);
              if (matchingItem) {
                const catalogFilename = matchingItem.image.split('/').pop() || matchingItem.image;
                clipScoresByFilename[catalogFilename] = clipPercent / 100;
              }
            }
          }
        }
      }
    } catch (error) {
      console.log("CLIP API not available:", error);
    }

    const combined = keywordScores.map(kw => {
      const clipScore = clipScoresByFilename[kw.imageFilename] || 0;
      
      const normalizedKeyword = Math.min(kw.score / 15, 1);
      const keywordPercent = normalizedKeyword * 100;
      
      const finalScore = normalizedKeyword + clipScore;
      const finalPercent = Math.min(finalScore * 50, 100);
      
      return {
        id: kw.id,
        imageFilename: kw.imageFilename,
        keywordScore: kw.score,
        keywordPercent: Math.round(keywordPercent),
        clipScore,
        clipPercent: Math.round(clipScore * 100),
        finalPercent: Math.round(finalPercent),
      };
    });

    combined.sort((a, b) => b.finalPercent - a.finalPercent);
    
    const filteredCombined = combined.filter(item => 
      item.keywordPercent > 0 || item.clipPercent > 0
    );
    
    const topItems = filteredCombined.slice(0, 5);

    const responseItems = topItems.map(result => {
      const item = rentalCatalog.find(i => i.id === result.id);
      if (!item) return null;
      return {
        id: item.id,
        name: item.name,
        image: item.image,
        category: item.category,
        price: item.price,
        color: item.color,
        occasion: item.occasion,
        brand: item.brand,
        description: item.description,
        keywordPercent: result.keywordPercent,
        clipPercent: result.clipPercent,
        finalPercent: result.finalPercent,
      };
    }).filter(Boolean);

    if (responseItems.length === 0) {
      return NextResponse.json({
        response: "I couldn't find any items matching your description. Try describing the occasion, style, colors, or budget!",
        suggestItems: false,
        items: []
      });
    }

    const topItem = responseItems[0];
    let response = `I found top ${responseItems.length} items for you!`;
    
    if (budget) {
      response += ` Showing items within SGD ${budget}.`;
    }
    
    response += ` Top pick: ${topItem?.name} - ${topItem?.category?.toLowerCase()} for ${topItem?.occasion?.toLowerCase()}.`;

    return NextResponse.json({
      response,
      suggestItems: true,
      items: responseItems,
      budgetUsed: budget,
      clipServerWorking
    });

  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({
      response: "Sorry, I encountered an error. Please try again.",
      suggestItems: false,
      items: []
    }, { status: 500 });
  }
}
