import { DISTRICT_CONFIG, CONGESTION_IDX } from "./congestionData";
import { DISTRICT_CENTROIDS } from "./districtCentroids";
import { haversineKm } from "./simPathBuilder";

/**
 * Returns a speed divisor (>= 1.0) for a truck at the given position and sim hour.
 * Higher values = slower travel. During off-peak or outside congestion zones, returns ~1.0.
 */
export function getCongestionFactor(lat: number, lng: number, simHour: number): number {
  // Get city-wide hourly index (covers 5am–10pm)
  const hourIdx = Math.floor(simHour) - 5;
  if (hourIdx < 0 || hourIdx >= CONGESTION_IDX.length) return 1.0;
  const cityIndex = CONGESTION_IDX[hourIdx];

  // Find nearest district with congestion config
  let nearestDist = Infinity;
  let nearestConfig: (typeof DISTRICT_CONFIG)[number] | null = null;

  for (const cfg of DISTRICT_CONFIG) {
    const centroid = DISTRICT_CENTROIDS[cfg.code];
    if (!centroid) continue;
    const d = haversineKm(lat, lng, centroid.lat, centroid.lng);
    if (d < nearestDist && d < 5) {
      // Only match if within 5km of a district centroid
      nearestDist = d;
      nearestConfig = cfg;
    }
  }

  if (!nearestConfig) return cityIndex;

  // Scale district factor by how "peak" the current hour is.
  // At peak (cityIndex ~1.85) → full district factor.
  // At off-peak (cityIndex ~1.05) → minimal district factor.
  const peakIntensity = Math.max(0, (cityIndex - 1.0) / 0.85);
  return 1.0 + (nearestConfig.factor - 1.0) * peakIntensity;
}
