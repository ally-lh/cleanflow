// AI Laundry Image Analysis Service
//
// This module provides the analyzeLaundryImage() abstraction.
// Currently uses a MOCK implementation that returns simulated results.
//
// To integrate a real model (e.g. OpenAI Vision, Google Vision, Claude):
//   1. Replace the body of `callAIModel()` with the real API call
//   2. Parse the real response into AIAnalysisResult
//   3. Update modelUsed to the actual model name
//   4. Set NEXT_PUBLIC_AI_ENABLED=true in .env

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

async function callMockModel(_imageUrl: string): Promise<AIAnalysisResult> {
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
// REAL AI MODEL PLACEHOLDER
// Swap in OpenAI / Claude / Google Vision here
// ──────────────────────────────────────────

async function callRealAIModel(_imageUrl: string): Promise<AIAnalysisResult> {
  // Example OpenAI Vision integration (commented out):
  //
  // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  // const response = await openai.chat.completions.create({
  //   model: "gpt-4o",
  //   messages: [{
  //     role: "user",
  //     content: [
  //       { type: "text", text: LAUNDRY_ANALYSIS_PROMPT },
  //       { type: "image_url", image_url: { url: imageUrl } }
  //     ]
  //   }]
  // });
  // return parseOpenAIResponse(response.choices[0].message.content);

  throw new Error("Real AI model not yet configured. Set ENABLE_REAL_AI=false.");
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
