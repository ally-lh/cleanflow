// CleanFlow — Route Estimator (Placeholder)
//
// Estimates delivery/pickup distance and duration.
// Designed so the digital twin teammate can replace this with
// a real routing engine (Google Directions, HERE, OSRM).

import { haversineDistance, STORE_GEO, type GeoPoint } from "@/lib/geo/geocoding";

export interface RouteEstimateResult {
  distanceKm: number;
  durationMinutes: number;
  origin: GeoPoint;
  destination: GeoPoint;
}

/**
 * Estimate route from store to customer address.
 * Currently uses straight-line distance × 1.4 road factor.
 *
 * Future: replace with real routing API call.
 */
export async function estimateRoute(
  customerGeo: GeoPoint
): Promise<RouteEstimateResult> {
  const straightLine = haversineDistance(STORE_GEO, customerGeo);
  const roadFactor = 1.4; // typical urban road factor
  const distanceKm = parseFloat((straightLine * roadFactor).toFixed(2));
  // Assume avg speed of 25 km/h in city traffic
  const durationMinutes = Math.round((distanceKm / 25) * 60);

  return {
    distanceKm,
    durationMinutes,
    origin: STORE_GEO,
    destination: customerGeo,
  };
}
