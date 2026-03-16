// Dispatch Live API — Placeholder for Three.js / Digital Twin integration
//
// This endpoint will serve real-time driver and delivery data
// to the 3D operations map dashboard.
//
// Future implementation:
//   - Connect to GPS tracking (driver mobile app posts to /api/dispatch/location)
//   - Return live driver positions and active delivery routes
//   - Integrate with digital twin simulation for route prediction

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const [activeDrivers, activeDeliveries] = await Promise.all([
    db.driver.findMany({
      where: { isActive: true },
      include: { user: { select: { name: true } } },
    }),
    db.order.findMany({
      where: { status: "OUT_FOR_DELIVERY" },
      include: {
        address: true,
        deliveryRequest: { include: { driver: true } },
      },
    }),
  ]);

  return NextResponse.json({
    drivers: activeDrivers.map((d) => ({
      driverId: d.id,
      driverName: d.user.name ?? "Unknown",
      lat: d.lastLat ?? 1.3521, // fallback to SG centroid
      lng: d.lastLng ?? 103.8198,
      lastUpdated: d.lastLocationAt?.toISOString() ?? null,
      isLive: !!d.lastLocationAt,
    })),
    deliveries: activeDeliveries.map((o) => ({
      orderId: o.id,
      orderNumber: o.orderNumber,
      driverId: o.deliveryRequest?.driverId ?? null,
      dropoffLat: o.address?.lat ?? null,
      dropoffLng: o.address?.lng ?? null,
      dropoffAddress: o.address?.streetLine1 ?? null,
      status: o.status,
    })),
    lastUpdated: new Date().toISOString(),
  });
}
