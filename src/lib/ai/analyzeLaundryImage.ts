// AI Laundry Image Analysis Service
//
// Uses Google Gemini for vision-based laundry detection.
// Set ENABLE_REAL_AI=true and GEMINI_API_KEY in .env to activate.
// Falls back to mock data when ENABLE_REAL_AI is not set.

import type { AIAnalysisResult, DetectedItem } from "@/types";
import { ClothingCategory } from "@prisma/client";

// ──────────────────────────────────────────
// PUBLIC API
// ──────────────────────────────────────────

/**
 * Analyze a laundry image and return AI-detected clothing items.
 * The caller must treat this as a DRAFT ESTIMATE — always allow manual editing.
 *
 * @param imageUrl - URL of the uploaded image
 * @returns Structured analysis result with detected items and warnings
 */
export async function analyzeLaundryImage(
  imageUrl: string
): Promise<AIAnalysisResult> {
  // Future: route to real model based on env flag
  const useRealAI = process.env.ENABLE_REAL_AI === "true";

  if (useRealAI) {
    return await callRealAIModel(imageUrl);
  }

  return await callMockModel(imageUrl);
}

// ──────────────────────────────────────────
// MOCK IMPLEMENTATION
// (Replace callRealAIModel with a real integration)
// ──────────────────────────────────────────

async function callMockModel(imageUrl: string): Promise<AIAnalysisResult> {
  void imageUrl;

  // Simulate network delay
  await new Promise((r) => setTimeout(r, 1200));

  const detectedItems: DetectedItem[] = generateMockDetections();
  const totalEstimatedPieces = detectedItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const warnings = generateWarnings(detectedItems);

  return {
    detectedItems,
    totalEstimatedPieces,
    detectedItemsSummary: buildSummary(detectedItems),
    previewWarnings: warnings,
    modelUsed: "mock-v1",
  };
}

// ──────────────────────────────────────────
// REAL AI — Google Gemini (Vision)
// ──────────────────────────────────────────

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

async function callRealAIModel(imageUrl: string): Promise<AIAnalysisResult> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set in environment.");

  const modelName = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  // imageUrl is a data URL (e.g. data:image/jpeg;base64,...)
  const [header, base64Data] = imageUrl.split(",");
  const mimeType = header.match(/data:(.*);base64/)?.[1] ?? "image/jpeg";

  let result;
  try {
    result = await model.generateContent([
      LAUNDRY_ANALYSIS_PROMPT,
      { inlineData: { data: base64Data, mimeType } },
    ]);
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 429) {
      const fallback = await callMockModel(imageUrl);
      return {
        ...fallback,
        previewWarnings: [
          "AI analysis is temporarily unavailable (quota exceeded). Showing estimated data — please adjust quantities manually.",
          ...fallback.previewWarnings,
        ],
        modelUsed: "mock-v1-quota-fallback",
      };
    }
    if (status === 404) {
      const fallback = await callMockModel(imageUrl);
      return {
        ...fallback,
        previewWarnings: [
          `AI model "${modelName}" is unavailable for this API key. Showing estimated data instead — please verify quantities manually.`,
          ...fallback.previewWarnings,
        ],
        modelUsed: `mock-v1-missing-model-fallback:${modelName}`,
      };
    }
    throw err;
  }

  const text = result.response.text();

  // Strip markdown code fences if Gemini wraps the JSON
  const jsonText = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  const parsed = JSON.parse(jsonText) as {
    detectedItems?: Array<{
      category: string;
      label: string;
      quantity: number;
      confidence: number;
    }>;
    totalEstimatedPieces?: number;
    previewWarnings?: string[];
  };

  const detectedItems: DetectedItem[] = (parsed.detectedItems ?? []).map(
    (item) => ({
      category: item.category as ClothingCategory,
      label: item.label,
      quantity: item.quantity,
      confidence: item.confidence,
    })
  );

  const totalEstimatedPieces =
    parsed.totalEstimatedPieces ??
    detectedItems.reduce((sum, i) => sum + i.quantity, 0);

  const warnings = [
    ...(parsed.previewWarnings ?? []),
    "This is an AI estimate only. Please verify quantities before submitting.",
  ];

  return {
    detectedItems,
    totalEstimatedPieces,
    detectedItemsSummary: buildSummary(detectedItems),
    previewWarnings: warnings,
    modelUsed: modelName,
  };
}

// ──────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────

function generateMockDetections(): DetectedItem[] {
  // Simulate a realistic laundry pile
  const possible: Array<{ category: ClothingCategory; label: string }> = [
    { category: ClothingCategory.SHIRT, label: "Shirt / Blouse" },
    { category: ClothingCategory.PANTS, label: "Pants / Trousers" },
    { category: ClothingCategory.DRESS, label: "Dress" },
    { category: ClothingCategory.SWEATER, label: "Sweater" },
    { category: ClothingCategory.TOWEL, label: "Towel" },
    { category: ClothingCategory.SOCKS, label: "Socks (pair)" },
    { category: ClothingCategory.UNDERWEAR, label: "Underwear" },
  ];

  // Randomly select 3–5 categories
  const count = 3 + Math.floor(Math.random() * 3);
  const shuffled = possible.sort(() => Math.random() - 0.5).slice(0, count);

  return shuffled.map((item) => ({
    category: item.category,
    label: item.label,
    quantity: 1 + Math.floor(Math.random() * 4),
    confidence: parseFloat((0.7 + Math.random() * 0.28).toFixed(2)),
  }));
}

function generateWarnings(items: DetectedItem[]): string[] {
  const warnings: string[] = [];

  const total = items.reduce((sum, i) => sum + i.quantity, 0);
  if (total > 10) {
    warnings.push(
      "Large pile detected — some items may be hidden underneath others."
    );
  }

  const lowConfidence = items.filter((i) => i.confidence < 0.8);
  if (lowConfidence.length > 0) {
    warnings.push(
      `${lowConfidence.length} item(s) detected with lower confidence. Please review and adjust.`
    );
  }

  warnings.push(
    "This is an AI estimate only. Please verify quantities before submitting."
  );

  return warnings;
}

function buildSummary(items: DetectedItem[]): string {
  const parts = items.map((i) => `${i.quantity}× ${i.label}`);
  return parts.join(", ");
}

// ──────────────────────────────────────────
// PROMPT TEMPLATE (for real AI integration)
// ──────────────────────────────────────────

export const LAUNDRY_ANALYSIS_PROMPT = `
You are a laundry intake assistant. Analyze the provided image of laundry items.

Return a JSON object with this exact structure:
{
  "detectedItems": [
    {
      "category": "<CLOTHING_CATEGORY_ENUM_VALUE>",
      "label": "<human readable name>",
      "quantity": <integer>,
      "confidence": <float 0-1>
    }
  ],
  "totalEstimatedPieces": <integer>,
  "previewWarnings": ["<warning string>", ...]
}

Valid category values: SHIRT, PANTS, DRESS, SUIT_JACKET, SUIT_PANTS, COAT, SWEATER, SHORTS, SKIRT, UNDERWEAR, SOCKS, BEDSHEET, TOWEL, CURTAIN, OTHER

Rules:
- Count each individual item (a pair of socks = 1 entry with quantity 1)
- If items overlap or are hard to see, add a warning
- Be conservative — it is better to undercount than overcount
- Only include items you can clearly identify
`.trim();
