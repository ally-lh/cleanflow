import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

const IMAGES_DIR = path.join(
  process.cwd(),
  "src/lib/ai-for-rental/DeepFashion/img"
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const imagePath = searchParams.get("path");

    if (!imagePath) {
      return NextResponse.json({ error: "No path provided" }, { status: 400 });
    }

    const decodedPath = decodeURIComponent(imagePath);
    // Handle path that may include "DeepFashion/img/" prefix
    let relativePath = decodedPath;
    if (decodedPath.startsWith("DeepFashion/img/")) {
      relativePath = decodedPath.replace("DeepFashion/img/", "");
    }
    const fullPath = path.join(IMAGES_DIR, relativePath);

    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const imageBuffer = fs.readFileSync(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    
    const contentType = ext === ".png" ? "image/png" : "image/jpeg";

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("Image error:", error);
    return NextResponse.json({ error: "Failed to load image" }, { status: 500 });
  }
}
