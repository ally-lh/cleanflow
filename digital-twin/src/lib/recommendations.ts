import type { SimTruckRuntime, SimOrder } from "./simTypes";
import type { AnalyticsSnapshot } from "../types";
import { DISTRICT_CONFIG, CONGESTION_IDX, type DistrictCongestion } from "./congestionData";
import { DISTRICT_CENTROIDS } from "./districtCentroids";
import { haversineKm } from "./simPathBuilder";

// ── Types ──────────────────────────────────────────────────

export interface Recommendation {
  id: string;
  type: "congestion" | "demand" | "expansion" | "fleet" | "window";
  priority: "critical" | "high" | "medium";
  icon: string;
  title: string;
  detail: string;
  truckId?: string;
}

// ── Fallback analytics data (used when snapshot is unavailable) ──

const FALLBACK_TOP_DISTRICTS = [
  { district: "33", orders: 60 },
  { district: "21", orders: 37 },
  { district: "38", orders: 35 },
  { district: "20", orders: 24 },
  { district: "36", orders: 15 },
];

const FALLBACK_EXPANSION_HOT = ["52", "73", "64"];

const FALLBACK_EXPANSION_DISTRICTS = [
  { district: "52", orderCount: 10, meanDistanceFromDepotKm: 13.44 },
  { district: "73", orderCount: 6, meanDistanceFromDepotKm: 15.56 },
  { district: "64", orderCount: 6, meanDistanceFromDepotKm: 14.58 },
];

// ── Helpers ────────────────────────────────────────────────

function getCityIndex(simHour: number): number {
  const idx = Math.floor(simHour) - 5;
  if (idx < 0 || idx >= CONGESTION_IDX.length) return 1.0;
  return CONGESTION_IDX[idx];
}

function findNearestDistrict(lat: number, lng: number): DistrictCongestion | null {
  let best: DistrictCongestion | null = null;
  let bestDist = Infinity;
  for (const cfg of DISTRICT_CONFIG) {
    const c = DISTRICT_CENTROIDS[cfg.code];
    if (!c) continue;
    const d = haversineKm(lat, lng, c.lat, c.lng);
    if (d < bestDist && d < 8) {
      bestDist = d;
      best = cfg;
    }
  }
  return best;
}

function getStopDistrict(waypoint: string): DistrictCongestion | null {
  // Find which district a waypoint is in by checking centroids
  for (const cfg of DISTRICT_CONFIG) {
    const c = DISTRICT_CENTROIDS[cfg.code];
    if (!c) continue;
    // Match by name similarity
    const name = c.name.toUpperCase();
    const wp = waypoint.toUpperCase();
    if (name.includes(wp) || wp.includes(name.split(" ")[0])) return cfg;
  }
  return null;
}

// ── Recommendation generators ──────────────────────────────

function congestionAlerts(
  trucks: SimTruckRuntime[],
  simHour: number,
): Recommendation[] {
  const results: Recommendation[] = [];
  const cityIdx = getCityIndex(simHour);
  if (cityIdx < 1.3) return results; // no congestion concern

  for (const truck of trucks) {
    if (truck.state !== "EN_ROUTE") continue;

    const district = findNearestDistrict(truck.lat, truck.lng);
    if (!district || district.risk !== "High") continue;

    const centroid = DISTRICT_CENTROIDS[district.code];
    const districtName = centroid?.name ?? `District ${district.code}`;

    results.push({
      id: `congestion-${truck.truckId}-${district.code}`,
      type: "congestion",
      priority: "critical",
      icon: "!",
      title: `${districtName} — Peak congestion`,
      detail: `${truck.driverName.split(" (")[0]} in high-risk zone. Factor x${district.factor.toFixed(2)} on ${district.expressway}. Best window: ${district.window}.`,
      truckId: truck.truckId,
    });
  }

  return results;
}

function fleetImpact(
  trucks: SimTruckRuntime[],
  simHour: number,
): Recommendation | null {
  const cityIdx = getCityIndex(simHour);
  if (cityIdx < 1.5) return null;

  const activeTrucks = trucks.filter((t) => t.state === "EN_ROUTE" || t.state === "RETURNING");
  if (activeTrucks.length < 2) return null;

  const delayMins = Math.round((cityIdx - 1.0) * 15 * activeTrucks.length);
  const peak = simHour < 10 ? "AM" : "PM";

  return {
    id: `fleet-peak-${Math.floor(simHour)}`,
    type: "fleet",
    priority: "high",
    icon: "~",
    title: `${peak} peak — ${activeTrucks.length} trucks affected`,
    detail: `City congestion index at x${cityIdx.toFixed(2)}. Estimated +${delayMins}min total delay across fleet. Consider deferring non-urgent stops.`,
  };
}

function demandInsights(
  trucks: SimTruckRuntime[],
  snapshot: AnalyticsSnapshot | null,
): Recommendation[] {
  const topDistricts = snapshot?.charts?.demandPatterns?.topDistricts ?? FALLBACK_TOP_DISTRICTS;

  const results: Recommendation[] = [];
  const seen = new Set<string>();

  for (const truck of trucks) {
    if (truck.state === "AT_DEPOT") continue;
    const run = truck.runs[truck.currentRunIndex];
    if (!run || run.completed) continue;

    for (const stop of run.stops) {
      const match = topDistricts.find((d) => {
        const centroid = DISTRICT_CENTROIDS[d.district];
        return centroid && stop.toUpperCase().includes(centroid.name.toUpperCase().split(" ")[0]);
      });

      if (match && match.orders >= 30 && !seen.has(match.district)) {
        seen.add(match.district);
        const centroid = DISTRICT_CENTROIDS[match.district];
        results.push({
          id: `demand-${match.district}`,
          type: "demand",
          priority: "medium",
          icon: "#",
          title: `${centroid?.name ?? match.district} — High demand zone`,
          detail: `${match.orders} orders from this district (7d). ${run.type === "collection" ? "Consider dedicated collection run" : "Prioritize delivery efficiency"} for this area.`,
          truckId: truck.truckId,
        });
      }
    }
  }

  return results;
}

function expansionOpportunities(
  trucks: SimTruckRuntime[],
  snapshot: AnalyticsSnapshot | null,
): Recommendation[] {
  const hotDistricts = snapshot?.expansion?.highDemandFarDistrictsHeuristic ?? FALLBACK_EXPANSION_HOT;
  const districts = snapshot?.expansion?.districts ?? FALLBACK_EXPANSION_DISTRICTS;

  const results: Recommendation[] = [];
  const seen = new Set<string>();

  for (const truck of trucks) {
    if (truck.state === "AT_DEPOT") continue;
    const run = truck.runs[truck.currentRunIndex];
    if (!run || run.completed) continue;

    for (const stop of run.stops) {
      for (const code of hotDistricts) {
        if (seen.has(code)) continue;
        const centroid = DISTRICT_CENTROIDS[code];
        if (!centroid) continue;

        // Check if this stop is near the expansion district
        const stopName = stop.toUpperCase();
        const distName = centroid.name.toUpperCase();
        if (!stopName.includes(distName.split(" ")[0]) && !distName.includes(stopName.split(" ")[0])) continue;

        const distData = districts.find((d) => d.district === code);
        if (!distData) continue;

        seen.add(code);
        results.push({
          id: `expansion-${code}`,
          type: "expansion",
          priority: "medium",
          icon: "+",
          title: `${centroid.name} — Expansion opportunity`,
          detail: `${distData.orderCount} orders, ${distData.meanDistanceFromDepotKm.toFixed(1)}km from depot. A satellite hub here could reduce travel distance by ~46%.`,
        });
      }
    }
  }

  return results;
}

function dispatchWindowSuggestions(
  trucks: SimTruckRuntime[],
  simHour: number,
): Recommendation[] {
  const results: Recommendation[] = [];

  for (const truck of trucks) {
    if (truck.state !== "AT_DEPOT") continue;
    const nextRun = truck.runs[truck.currentRunIndex];
    if (!nextRun || nextRun.completed) continue;
    if (simHour >= nextRun.startHour) continue; // already departing

    // Check if any stop in the upcoming run is in a congested district
    for (const stop of nextRun.stops) {
      const district = getStopDistrict(stop);
      if (!district || district.risk === "Low") continue;

      const centroid = DISTRICT_CENTROIDS[district.code];
      results.push({
        id: `window-${truck.truckId}-${district.code}`,
        type: "window",
        priority: district.risk === "High" ? "high" : "medium",
        icon: "i",
        title: `Dispatch timing for ${truck.driverName.split(" (")[0]}`,
        detail: `Next run includes ${centroid?.name ?? stop} (${district.risk} risk). Optimal window: ${district.window}. Current time: ${formatHour(simHour)}.`,
        truckId: truck.truckId,
      });
      break; // one suggestion per truck
    }
  }

  return results;
}

function formatHour(h: number): string {
  const hr = Math.floor(h);
  const min = Math.floor((h - hr) * 60);
  const p = hr >= 12 ? "PM" : "AM";
  return `${hr > 12 ? hr - 12 : hr}:${String(min).padStart(2, "0")} ${p}`;
}

// ── Main entry point ───────────────────────────────────────

const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2 };

export function generateRecommendations(
  trucks: SimTruckRuntime[],
  _orders: SimOrder[],
  simHour: number,
  snapshot: AnalyticsSnapshot | null,
): Recommendation[] {
  const all: Recommendation[] = [
    ...congestionAlerts(trucks, simHour),
    ...(() => { const r = fleetImpact(trucks, simHour); return r ? [r] : []; })(),
    ...demandInsights(trucks, snapshot),
    ...expansionOpportunities(trucks, snapshot),
    ...dispatchWindowSuggestions(trucks, simHour),
  ];

  // Deduplicate by id, sort by priority, cap at 3
  const unique = new Map<string, Recommendation>();
  for (const r of all) {
    if (!unique.has(r.id)) unique.set(r.id, r);
  }

  return Array.from(unique.values())
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
    .slice(0, 3);
}
