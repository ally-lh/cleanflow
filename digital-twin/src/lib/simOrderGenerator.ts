import type { SimOrder, SimRun } from "./simTypes";
import { waypointCoord, haversineKm } from "./simPathBuilder";
import { ROAD_PATHS } from "./roadPaths";

// ── Service regions per hub ────────────────────────────────

const HUB_REGIONS: Record<string, string[]> = {
  "HUB_CENTRAL": ["TOA PAYOH", "BISHAN", "ANG MO KIO", "QUEENSTOWN", "BUKIT MERAH", "KALLANG", "NOVENA", "LITTLE INDIA", "GEYLANG"],
  "HUB_EAST":    ["BEDOK", "TAMPINES", "PASIR RIS", "HOUGANG", "SENGKANG", "PUNGGOL"],
  "HUB_NORTH":   ["WOODLANDS", "SEMBAWANG", "YISHUN", "ANG MO KIO", "SERANGOON"],
  "HUB_WEST":    ["JURONG EAST", "CLEMENTI", "BUKIT BATOK", "QUEENSTOWN"],
};

// ── Truck definitions ──────────────────────────────────────

export interface TruckDef {
  id: string;
  name: string;
  hub: string;
  hubWaypoint: string;
  baseSpeedKmh: number;
}

export const TRUCK_DEFS: TruckDef[] = [
  { id: "sim-01", name: "Alpha",   hub: "Central", hubWaypoint: "HUB_CENTRAL", baseSpeedKmh: 35 },
  { id: "sim-02", name: "Bravo",   hub: "Central", hubWaypoint: "HUB_CENTRAL", baseSpeedKmh: 32 },
  { id: "sim-03", name: "Charlie", hub: "East",    hubWaypoint: "HUB_EAST",    baseSpeedKmh: 38 },
  { id: "sim-04", name: "Delta",   hub: "East",    hubWaypoint: "HUB_EAST",    baseSpeedKmh: 34 },
  { id: "sim-05", name: "Echo",    hub: "North",   hubWaypoint: "HUB_NORTH",   baseSpeedKmh: 40 },
  { id: "sim-06", name: "Foxtrot", hub: "North",   hubWaypoint: "HUB_NORTH",   baseSpeedKmh: 36 },
  { id: "sim-07", name: "Golf",    hub: "West",    hubWaypoint: "HUB_WEST",    baseSpeedKmh: 33 },
  { id: "sim-08", name: "Hotel",   hub: "West",    hubWaypoint: "HUB_WEST",    baseSpeedKmh: 31 },
];

// ── Seeded random ──────────────────────────────────────────

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Check path connectivity ────────────────────────────────

function canReach(from: string, to: string, hub: string): boolean {
  if (from === to) return true;
  if (ROAD_PATHS[`${from}|${to}`]?.c.length) return true;
  if (ROAD_PATHS[`${from}|${hub}`]?.c.length && ROAD_PATHS[`${hub}|${to}`]?.c.length) return true;
  return false;
}

// ── Pick N unique reachable stops for a truck ──────────────

function pickStops(region: string[], hub: string, count: number, rand: () => number): string[] {
  // Pick random reachable stops (each just needs to be reachable from/to the hub)
  const shuffled = shuffle(region, rand);
  const stops: string[] = [];

  for (const wp of shuffled) {
    if (stops.length >= count) break;
    if (canReach(hub, wp, hub)) {
      stops.push(wp);
    }
  }

  // Sort by distance from hub (nearest first) so the truck doesn't overshoot
  const hubCoord = waypointCoord(hub);
  stops.sort((a, b) => {
    const ca = waypointCoord(a);
    const cb = waypointCoord(b);
    return haversineKm(hubCoord.lat, hubCoord.lng, ca.lat, ca.lng)
         - haversineKm(hubCoord.lat, hubCoord.lng, cb.lat, cb.lng);
  });

  return stops;
}

// ── Generate day plan ──────────────────────────────────────

export interface DayPlan {
  orders: SimOrder[];
  runs: SimRun[];
}

export function generateDayPlan(dayNumber: number = 0): DayPlan {
  const rand = seededRandom(42 + dayNumber * 137);
  const orders: SimOrder[] = [];
  const runs: SimRun[] = [];
  let orderId = 1;
  let runId = 1;

  for (const truck of TRUCK_DEFS) {
    const region = HUB_REGIONS[truck.hubWaypoint] ?? [];

    // ── Run 1: Delivery run (yesterday's clean orders) ──
    const deliveryStops = pickStops(region, truck.hubWaypoint, 3 + Math.floor(rand() * 2), rand);
    const deliveryOrderIds: string[] = [];

    for (const wp of deliveryStops) {
      const coord = waypointCoord(wp);
      const oid = `order-${orderId++}`;
      deliveryOrderIds.push(oid);
      orders.push({
        id: oid,
        orderNumber: `CF-${String(orderId - 1).padStart(4, "0")}`,
        type: "delivery",
        waypoint: wp,
        lat: coord.lat,
        lng: coord.lng,
        status: "PENDING",
        isLate: false,
        completedAtHour: null,
        runId: `run-${runId}`,
      });
    }

    runs.push({
      id: `run-${runId++}`,
      type: "delivery",
      truckId: truck.id,
      stops: deliveryStops,
      orderIds: deliveryOrderIds,
      startHour: 8.15 + rand() * 0.15, // stagger departures slightly
      completed: false,
    });

    // ── Run 2: Collection run (today's dirty laundry) ──
    const collectionStops = pickStops(region, truck.hubWaypoint, 3 + Math.floor(rand() * 2), rand);
    const collectionOrderIds: string[] = [];

    for (const wp of collectionStops) {
      const coord = waypointCoord(wp);
      const oid = `order-${orderId++}`;
      collectionOrderIds.push(oid);
      orders.push({
        id: oid,
        orderNumber: `CF-${String(orderId - 1).padStart(4, "0")}`,
        type: "collection",
        waypoint: wp,
        lat: coord.lat,
        lng: coord.lng,
        status: "PENDING",
        isLate: false,
        completedAtHour: null,
        runId: `run-${runId}`,
      });
    }

    runs.push({
      id: `run-${runId++}`,
      type: "collection",
      truckId: truck.id,
      stops: collectionStops,
      orderIds: collectionOrderIds,
      startHour: 10.5 + rand() * 0.5, // after first run returns
      completed: false,
    });
  }

  return { orders, runs };
}
