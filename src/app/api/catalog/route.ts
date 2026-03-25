import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const brand = searchParams.get("brand");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");

    const where: any = { isAvailable: true };

    if (category && category !== "all") {
      where.category = category.toUpperCase();
    }

    if (brand && brand !== "all") {
      where.brand = brand;
    }

    if (minPrice || maxPrice) {
      where.pricePerMonth = {};
      if (minPrice) where.pricePerMonth.gte = parseFloat(minPrice);
      if (maxPrice) where.pricePerMonth.lte = parseFloat(maxPrice);
    }

    const items = await db.clothingItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching catalog:", error);
    return NextResponse.json(
      { error: "Failed to fetch catalog" },
      { status: 500 }
    );
  }
}
