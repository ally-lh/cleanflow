import { useEffect, useRef, useState } from "react";
import type { DispatchDriver, DispatchDelivery } from "../types";
import { ROAD_PATHS } from "../lib/roadPaths";

// ── Helpers ────────────────────────────────────────────────

/** Get the road-endpoint coordinate for a named waypoint by looking up
 *  any ROAD_PATHS segment that ends at `|name` and taking its last coord. */
function waypointCoord(name: string): { lat: number; lng: number } {
  // Try to find a segment ending at this waypoint
  for (const [key, seg] of Object.entries(ROAD_PATHS)) {
    if (key.endsWith(`|${name}`) && seg.c.length > 0) {
      const [lng, lat] = seg.c[seg.c.length - 1];
      return { lat, lng };
    }
  }
  // Fallback: try a segment starting from this waypoint
  for (const [key, seg] of Object.entries(ROAD_PATHS)) {
    if (key.startsWith(`${name}|`) && seg.c.length > 0) {
      const [lng, lat] = seg.c[0];
      return { lat, lng };
    }
  }
  return { lat: 1.3521, lng: 103.8198 }; // SG centroid fallback
}

// ── Truck definitions ──────────────────────────────────────
// Each truck's route is: Hub → stop1 → stop2 → ... → Hub.
// Deliveries are placed at the intermediate (non-hub) waypoints.

interface SimTruckDef {
  id: string;
  name: string;
  hub: string;
  waypoints: string[];
  speedKmh: number;
}

const TRUCK_DEFS: SimTruckDef[] = [
  { id: "sim-01", name: "Alpha",   hub: "Central", waypoints: ["HUB_CENTRAL", "TOA PAYOH", "BISHAN", "ANG MO KIO", "HUB_CENTRAL"], speedKmh: 35 },
  { id: "sim-02", name: "Bravo",   hub: "Central", waypoints: ["HUB_CENTRAL", "QUEENSTOWN", "BUKIT MERAH", "KALLANG", "HUB_CENTRAL"], speedKmh: 32 },
  { id: "sim-03", name: "Charlie", hub: "East",    waypoints: ["HUB_EAST", "BEDOK", "TAMPINES", "PASIR RIS", "HUB_EAST"], speedKmh: 38 },
  { id: "sim-04", name: "Delta",   hub: "East",    waypoints: ["HUB_EAST", "HOUGANG", "SENGKANG", "PUNGGOL", "HUB_EAST"], speedKmh: 34 },
  { id: "sim-05", name: "Echo",    hub: "North",   waypoints: ["HUB_NORTH", "WOODLANDS", "SEMBAWANG", "YISHUN", "HUB_NORTH"], speedKmh: 40 },
  { id: "sim-06", name: "Foxtrot", hub: "North",   waypoints: ["HUB_NORTH", "YISHUN", "ANG MO KIO", "SERANGOON", "HUB_NORTH"], speedKmh: 36 },
  { id: "sim-07", name: "Golf",    hub: "West",    waypoints: ["HUB_WEST", "JURONG EAST", "CLEMENTI", "BUKIT BATOK", "HUB_WEST"], speedKmh: 33 },
  { id: "sim-08", name: "Hotel",   hub: "West",    waypoints: ["HUB_WEST", "QUEENSTOWN", "BUKIT MERAH", "KALLANG", "HUB_CENTRAL"], speedKmh: 31 },
];

// Build orders automatically from intermediate waypoints (skip hubs)
function buildOrders(truck: SimTruckDef, truckIdx: number) {
  const stops = truck.waypoints.filter((wp) => !wp.startsWith("HUB_"));
  return stops.map((wp, i) => {
    const coord = waypointCoord(wp);
    return {
      id: `s${truckIdx * 10 + i + 1}`,
      num: `CF-SIM-${String(truckIdx * 10 + i + 1).padStart(4, "0")}`,
      addr: `${wp.replace(/_/g, " ")} delivery`,
      lat: coord.lat,
      lng: coord.lng,
    };
  });
}

// Full truck data with generated orders
export const TRUCKS = TRUCK_DEFS.map((def, i) => ({
  ...def,
  orders: buildOrders(def, i),
}));

// ── Build flattened coordinate path for a truck ────────────

export interface FlatPath {
  coords: { lat: number; lng: number }[];
  segDists: number[]; // cumulative distance at each coord
  totalDist: number;
}

function buildFlatPath(waypoints: string[]): FlatPath {
  const coords: { lat: number; lng: number }[] = [];
  const segDists: number[] = [];
  let totalDist = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const key = `${waypoints[i]}|${waypoints[i + 1]}`;
    const seg = ROAD_PATHS[key];
    if (!seg || seg.c.length === 0) continue;

    const startIdx = coords.length > 0 ? 1 : 0;
    for (let j = startIdx; j < seg.c.length; j++) {
      const [lng, lat] = seg.c[j];
      coords.push({ lat, lng });

      if (coords.length === 1) {
        segDists.push(0);
      } else {
        const prev = coords[coords.length - 2];
        const d = haversineKm(prev.lat, prev.lng, lat, lng);
        totalDist += d;
        segDists.push(totalDist);
      }
    }
  }

  return { coords, segDists, totalDist };
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function posOnPath(path: FlatPath, fraction: number): { lat: number; lng: number } {
  if (path.coords.length === 0) return { lat: 1.3521, lng: 103.8198 };
  const targetDist = fraction * path.totalDist;
  for (let i = 1; i < path.segDists.length; i++) {
    if (path.segDists[i] >= targetDist) {
      const prevDist = path.segDists[i - 1];
      const segLen = path.segDists[i] - prevDist;
      const t = segLen > 0 ? (targetDist - prevDist) / segLen : 0;
      const a = path.coords[i - 1];
      const b = path.coords[i];
      return {
        lat: a.lat + (b.lat - a.lat) * t,
        lng: a.lng + (b.lng - a.lng) * t,
      };
    }
  }
  return path.coords[path.coords.length - 1];
}

// ── Pre-build all paths ────────────────────────────────────

export const TRUCK_PATHS: FlatPath[] = TRUCKS.map((t) => buildFlatPath(t.waypoints));

// ── Hook ───────────────────────────────────────────────────

export function useSimulatedTrucks(enabled: boolean) {
  const [drivers, setDrivers] = useState<DispatchDriver[]>([]);
  const [deliveries, setDeliveries] = useState<DispatchDelivery[]>([]);
  const intervalRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) {
      setDrivers([]);
      setDeliveries([]);
      return;
    }

    const simDeliveries: DispatchDelivery[] = TRUCKS.flatMap((t) =>
      t.orders.map((o) => ({
        orderId: o.id,
        orderNumber: o.num,
        driverId: t.id,
        dropoffLat: o.lat,
        dropoffLng: o.lng,
        dropoffAddress: o.addr,
        status: "OUT_FOR_DELIVERY",
      })),
    );
    setDeliveries(simDeliveries);

    const now = new Date().toISOString();

    function tick() {
      const simDrivers: DispatchDriver[] = TRUCKS.map((t, i) => {
        const path = TRUCK_PATHS[i];
        const loopMs = (path.totalDist / t.speedKmh) * 3_600_000;
        const stagger = i * 4_800_000;
        const fraction = loopMs > 0 ? ((Date.now() + stagger) % loopMs) / loopMs : 0;
        const pos = posOnPath(path, fraction);
        return {
          driverId: t.id,
          driverName: `${t.name} (${t.hub})`,
          lat: pos.lat,
          lng: pos.lng,
          lastUpdated: now,
          isLive: true,
        };
      });
      setDrivers(simDrivers);
    }

    // Update every 500ms — smooth enough visually, light on React renders
    tick();
    intervalRef.current = window.setInterval(tick, 500);
    return () => clearInterval(intervalRef.current);
  }, [enabled]);

  return { drivers, deliveries };
}
