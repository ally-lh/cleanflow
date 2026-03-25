import type {
  AnalyticsSnapshot,
  BusinessData,
  ExpansionData,
} from "./types";

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = asNumber(v);
  }
  return out;
}

export function buildRouteKpis(snapshot: AnalyticsSnapshot) {
  const route = snapshot.geo?.routeOptimization;
  return {
    baselineKm: asNumber(route?.baselineKm),
    optimizedKm: asNumber(route?.optimizedKm),
    savingsKm: asNumber(route?.savingsKm),
    savingsPercent: asNumber(route?.savingsPercent),
    assumption: route?.assumption ?? "No assumptions provided.",
    nStops: asNumber(route?.nStops),
    twoOptApplied: Boolean(route?.twoOptApplied),
    roadFactor: asNumber(route?.roadFactor, 1),
    ok: route?.ok !== false,
  };
}

export function buildDistrictHeatData(snapshot: AnalyticsSnapshot) {
  const districtMap = asRecord(snapshot.geo?.densityByDistrict?.byDistrictPrefix);
  const max = Math.max(1, ...Object.values(districtMap));
  return Object.entries(districtMap)
    .map(([district, count]) => ({
      district,
      count,
      intensity: count / max,
    }))
    .sort((a, b) => b.count - a.count);
}

export function buildDistrictHeatMatrix(snapshot: AnalyticsSnapshot, columns = 5) {
  const rows = buildDistrictHeatData(snapshot);
  const chunked: Array<typeof rows> = [];
  for (let i = 0; i < rows.length; i += columns) {
    chunked.push(rows.slice(i, i + columns));
  }
  return chunked;
}

export function buildRevenueBars(business: BusinessData | undefined) {
  const revenue = business?.revenueByServiceType ?? {};
  return Object.entries(revenue).map(([serviceType, metric]) => ({
    serviceType,
    totalRevenue: asNumber(metric.sum),
    avgOrderValue: asNumber(metric.mean),
    orderCount: asNumber(metric.count),
  }));
}

export function buildPieData(values?: Record<string, number>) {
  const map = asRecord(values);
  const total = Math.max(1, Object.values(map).reduce((a, b) => a + b, 0));
  return Object.entries(map).map(([name, value]) => ({
    name,
    value,
    percent: (value / total) * 100,
  }));
}

export function buildExpansionScatter(expansion: ExpansionData | undefined) {
  const districts = expansion?.districts ?? [];
  const xVals = districts.map((d) => asNumber(d.meanDistanceFromDepotKm));
  const yVals = districts.map((d) => asNumber(d.orderCount));
  const medianX = xVals.length ? xVals.sort((a, b) => a - b)[Math.floor(xVals.length / 2)] : 0;
  const medianY = yVals.length ? yVals.sort((a, b) => a - b)[Math.floor(yVals.length / 2)] : 0;
  const heuristic = new Set(expansion?.highDemandFarDistrictsHeuristic ?? []);
  return {
    points: districts.map((d) => ({
      district: d.district,
      orderCount: asNumber(d.orderCount),
      distanceKm: asNumber(d.meanDistanceFromDepotKm),
      candidate:
        heuristic.has(d.district) ||
        (asNumber(d.orderCount) >= medianY &&
          asNumber(d.meanDistanceFromDepotKm) >= medianX),
    })),
    medianX,
    medianY,
  };
}

interface RouteKpiLike {
  baselineKm: number;
  optimizedKm: number;
  savingsKm: number;
  savingsPercent: number;
  nStops: number;
}

export function buildDriverRouteProfiles(route: RouteKpiLike) {
  const presets = [
    { id: "driver-1", name: "Driver A (Aisha)", eff: 1.0, load: 0.27 },
    { id: "driver-2", name: "Driver B (Ben)", eff: 0.97, load: 0.24 },
    { id: "driver-3", name: "Driver C (Chen)", eff: 1.04, load: 0.26 },
    { id: "driver-4", name: "Driver D (Deepa)", eff: 1.01, load: 0.23 },
  ];

  return presets.map((preset) => {
    const base = route.baselineKm * preset.load;
    const opt = route.optimizedKm * preset.load * preset.eff;
    const savingsKm = base - opt;
    const savingsPercent = base > 0 ? (savingsKm / base) * 100 : 0;
    return {
      id: preset.id,
      name: preset.name,
      tag: preset.eff < 1 ? "Most efficient" : preset.eff > 1.02 ? "Heavy traffic zone" : "Balanced route",
      baselineKm: base,
      optimizedKm: opt,
      savingsKm,
      savingsPercent,
      nStops: Math.round(route.nStops * preset.load),
    };
  });
}
