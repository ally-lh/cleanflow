// Analytics API — Order data export endpoint
//
// This endpoint is designed for the Python analytics teammate.
// It returns structured order data suitable for analysis.
//
// Usage from Python:
//   import requests
//   data = requests.get("http://localhost:3000/api/analytics/orders",
//                       headers={"Authorization": f"Bearer {API_KEY}"}).json()
//
// Future: add date range filters, pagination, and authentication.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  // Basic API key check (set ANALYTICS_API_KEY in .env)
  const apiKey = req.headers.get("authorization")?.replace("Bearer ", "");
  if (
    process.env.ANALYTICS_API_KEY &&
    apiKey !== process.env.ANALYTICS_API_KEY
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const limit = parseInt(searchParams.get("limit") ?? "500");
  const offset = parseInt(searchParams.get("offset") ?? "0");

  const orders = await db.order.findMany({
    take: limit,
    skip: offset,
    include: {
      address: true,
      items: true,
      invoice: true,
      pickupRequest: true,
      deliveryRequest: true,
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Flatten for analytics consumption
  const data = orders.map((order) => ({
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    serviceType: order.serviceType,
    pickupMethod: order.pickupMethod,
    collectionMethod: order.collectionMethod,
    createdAt: order.createdAt.toISOString(),
    confirmedAt: order.confirmedAt?.toISOString() ?? null,
    pickedUpAt: order.pickedUpAt?.toISOString() ?? null,
    completedAt: order.completedAt?.toISOString() ?? null,
    // Geo fields for spatial analysis
    postalCode: order.address?.postalCode ?? null,
    city: order.address?.city ?? null,
    lat: order.address?.lat ?? null,
    lng: order.address?.lng ?? null,
    // Financial
    estimatedTotal: order.invoice?.estimatedTotal ?? null,
    confirmedTotal: order.invoice?.confirmedTotal ?? null,
    finalTotal: order.invoice?.finalTotal ?? null,
    deliveryFee: order.invoice?.deliveryFee ?? null,
    // Items summary
    totalItems: order.items.reduce((s, i) => s + i.quantity, 0),
    itemCategories: order.items.map((i) => ({ category: i.category, quantity: i.quantity })),
    // Logistics
    estimatedPickupDistance: order.pickupRequest?.estimatedDistance ?? null,
    estimatedDeliveryDistance: order.deliveryRequest?.estimatedDistance ?? null,
  }));

  return NextResponse.json({
    count: data.length,
    total: await db.order.count(),
    data,
  });
}
