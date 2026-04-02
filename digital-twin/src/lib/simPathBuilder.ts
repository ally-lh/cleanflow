import { ROAD_PATHS } from "./roadPaths";

// ── FlatPath: a stitched sequence of road coordinates ──────

export interface FlatPath {
  coords: { lat: number; lng: number }[];
  segDists: number[]; // cumulative distance at each coord
  totalDist: number;
}

// ── Haversine distance ─────────────────────────────────────

export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
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

// ── Get a waypoint's road-endpoint coordinate ──────────────

export function waypointCoord(name: string): { lat: number; lng: number } {
  for (const [key, seg] of Object.entries(ROAD_PATHS)) {
    if (key.endsWith(`|${name}`) && seg.c.length > 0) {
      const [lng, lat] = seg.c[seg.c.length - 1];
      return { lat, lng };
    }
  }
  for (const [key, seg] of Object.entries(ROAD_PATHS)) {
    if (key.startsWith(`${name}|`) && seg.c.length > 0) {
      const [lng, lat] = seg.c[0];
      return { lat, lng };
    }
  }
  return { lat: 1.3521, lng: 103.8198 };
}

// ── Build a flat path from a sequence of waypoint names ────

export function buildFlatPath(waypoints: string[]): FlatPath {
  // Stitch raw coordinates from each segment
  const raw: { lat: number; lng: number }[] = [];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const key = `${waypoints[i]}|${waypoints[i + 1]}`;
    const seg = ROAD_PATHS[key];
    if (!seg || seg.c.length === 0) continue;

    const startIdx = raw.length > 0 ? 1 : 0;
    for (let j = startIdx; j < seg.c.length; j++) {
      const [lng, lat] = seg.c[j];
      raw.push({ lat, lng });
    }
  }

  // Remove backtracking: drop points that move away from the final destination
  const cleaned = removeBacktracks(raw);

  // Build cumulative distances
  const coords = cleaned;
  const segDists: number[] = [];
  let totalDist = 0;

  for (let i = 0; i < coords.length; i++) {
    if (i === 0) {
      segDists.push(0);
    } else {
      const prev = coords[i - 1];
      totalDist += haversineKm(prev.lat, prev.lng, coords[i].lat, coords[i].lng);
      segDists.push(totalDist);
    }
  }

  return { coords, segDists, totalDist };
}

/**
 * Remove only obvious backtrack points — where 3 consecutive points
 * form a spike (go out and come right back to nearly the same spot).
 * Very conservative to avoid removing legitimate road curves.
 */
function removeBacktracks(pts: { lat: number; lng: number }[]): { lat: number; lng: number }[] {
  if (pts.length <= 3) return pts;

  const result = [pts[0]];

  for (let i = 1; i < pts.length - 1; i++) {
    const prev = result[result.length - 1];
    const curr = pts[i];
    const next = pts[i + 1];

    // Only remove if prev→curr→next is a tight spike:
    // the point goes out and comes back to almost the same place
    const distPrevNext = haversineKm(prev.lat, prev.lng, next.lat, next.lng);
    const distPrevCurr = haversineKm(prev.lat, prev.lng, curr.lat, curr.lng);

    // Skip if the detour through curr is >3x the direct prev→next distance
    // AND the spike is significant (>50m). This only catches obvious U-turns.
    if (distPrevNext > 0 && distPrevCurr > 0.05) {
      const distCurrNext = haversineKm(curr.lat, curr.lng, next.lat, next.lng);
      const ratio = (distPrevCurr + distCurrNext) / distPrevNext;
      if (ratio > 3.0) continue;
    }

    result.push(curr);
  }

  result.push(pts[pts.length - 1]);
  return result;
}

// ── Common junction waypoints for multi-hop routing ────────
// These are well-connected nodes that can bridge between regions.
// All waypoints that appear in ROAD_PATHS — used as routing intermediaries.
const JUNCTIONS: string[] = [];
const _seen = new Set<string>();
for (const key of Object.keys(ROAD_PATHS)) {
  for (const wp of key.split("|")) {
    if (!_seen.has(wp)) {
      _seen.add(wp);
      JUNCTIONS.push(wp);
    }
  }
}

function hasSegment(from: string, to: string): boolean {
  return (ROAD_PATHS[`${from}|${to}`]?.c.length ?? 0) > 0;
}

// ── Build path between any two waypoints ───────────────────
// Tries: direct → 1-hop via junction → 2-hop via junctions → straight line fallback

export function buildRoutePath(from: string, to: string, _hub?: string): FlatPath {
  if (from === to) {
    const c = waypointCoord(from);
    return { coords: [c], segDists: [0], totalDist: 0 };
  }

  // 1. Direct
  if (hasSegment(from, to)) {
    return buildFlatPath([from, to]);
  }

  // 2. One-hop: from → J → to
  for (const j of JUNCTIONS) {
    if (j === from || j === to) continue;
    if (hasSegment(from, j) && hasSegment(j, to)) {
      return buildFlatPath([from, j, to]);
    }
  }

  // 3. Two-hop: from → J1 → J2 → to (pick shortest by segment count)
  let bestPath: string[] | null = null;
  let bestDist = Infinity;
  for (const j1 of JUNCTIONS) {
    if (j1 === from || j1 === to) continue;
    if (!hasSegment(from, j1)) continue;
    for (const j2 of JUNCTIONS) {
      if (j2 === from || j2 === to || j2 === j1) continue;
      if (hasSegment(j1, j2) && hasSegment(j2, to)) {
        // Estimate distance to prefer shorter routes
        const c1 = waypointCoord(j1);
        const c2 = waypointCoord(j2);
        const cTo = waypointCoord(to);
        const d = haversineKm(c1.lat, c1.lng, c2.lat, c2.lng) +
                  haversineKm(c2.lat, c2.lng, cTo.lat, cTo.lng);
        if (d < bestDist) {
          bestDist = d;
          bestPath = [from, j1, j2, to];
        }
      }
    }
  }
  if (bestPath) {
    return buildFlatPath(bestPath);
  }

  // 4. Three-hop: from → J1 → J2 → J3 → to (for reaching far regions like North)
  let best3: string[] | null = null;
  let best3Dist = Infinity;
  for (const j1 of JUNCTIONS) {
    if (j1 === from || j1 === to) continue;
    if (!hasSegment(from, j1)) continue;
    for (const j2 of JUNCTIONS) {
      if (j2 === from || j2 === to || j2 === j1) continue;
      if (!hasSegment(j1, j2)) continue;
      for (const j3 of JUNCTIONS) {
        if (j3 === from || j3 === to || j3 === j1 || j3 === j2) continue;
        if (hasSegment(j2, j3) && hasSegment(j3, to)) {
          const c1 = waypointCoord(j1);
          const c3 = waypointCoord(j3);
          const cTo = waypointCoord(to);
          const d = haversineKm(c1.lat, c1.lng, c3.lat, c3.lng) +
                    haversineKm(c3.lat, c3.lng, cTo.lat, cTo.lng);
          if (d < best3Dist) {
            best3Dist = d;
            best3 = [from, j1, j2, j3, to];
          }
        }
      }
    }
  }
  if (best3) {
    return buildFlatPath(best3);
  }

  // 5. Fallback: straight line
  const a = waypointCoord(from);
  const b = waypointCoord(to);
  const dist = haversineKm(a.lat, a.lng, b.lat, b.lng);
  return {
    coords: [a, b],
    segDists: [0, dist],
    totalDist: dist,
  };
}

// ── Interpolate position along a FlatPath ──────────────────

export function posOnPath(
  path: FlatPath,
  fraction: number,
): { lat: number; lng: number } {
  if (path.coords.length === 0) return { lat: 1.3521, lng: 103.8198 };
  if (fraction <= 0) return path.coords[0];
  if (fraction >= 1) return path.coords[path.coords.length - 1];

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
