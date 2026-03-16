// CleanFlow — Geo / Geocoding Service
//
// Placeholder for address → lat/lng resolution.
// Future: integrate Google Maps Geocoding API or OneMap (Singapore).
//
// This module is designed for the analytics teammate to build on.
// The Address model stores lat/lng — populate these by calling geocodeAddress().

export interface GeoPoint {
  lat: number;
  lng: number;
}

/**
 * Convert a Singapore postal code to lat/lng coordinates.
 * Currently returns a mock centroid near Singapore.
 *
 * Future integration:
 *   const res = await fetch(`https://developers.onemap.sg/commonapi/search?searchVal=${postalCode}&returnGeom=Y&getAddrDetails=Y`);
 *   const data = await res.json();
 *   return { lat: parseFloat(data.results[0].LATITUDE), lng: parseFloat(data.results[0].LONGITUDE) };
 */
export async function geocodePostalCode(
  postalCode: string
): Promise<GeoPoint | null> {
  // Mock: return a slightly varied point around central Singapore
  const baseLat = 1.3521;
  const baseLng = 103.8198;
  const jitter = () => (Math.random() - 0.5) * 0.05;

  // Suppress unused var warning — real impl would use postalCode
  void postalCode;

  return {
    lat: parseFloat((baseLat + jitter()).toFixed(6)),
    lng: parseFloat((baseLng + jitter()).toFixed(6)),
  };
}

/**
 * Estimate straight-line distance in km between two GeoPoints.
 * Uses the Haversine formula.
 */
export function haversineDistance(a: GeoPoint, b: GeoPoint): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Store coordinates: CleanFlow HQ (placeholder)
export const STORE_GEO: GeoPoint = { lat: 1.3048, lng: 103.8318 };
