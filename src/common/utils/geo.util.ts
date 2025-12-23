/**
 * Haversine distance (meters) between two lat/lng points.
 * Works well for small geofence radii (100m–300m) too.
 */

export type LatLng = { lat: number; lng: number };

const EARTH_RADIUS_M = 6371000;

export function isValidLatLng(p: LatLng): boolean {
  return (
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng) &&
    p.lat >= -90 &&
    p.lat <= 90 &&
    p.lng >= -180 &&
    p.lng <= 180
  );
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function distanceMeters(a: LatLng, b: LatLng): number {
  if (!isValidLatLng(a) || !isValidLatLng(b)) {
    throw new Error('Invalid lat/lng values');
  }

  const dLat = degToRad(b.lat - a.lat);
  const dLng = degToRad(b.lng - a.lng);

  const lat1 = degToRad(a.lat);
  const lat2 = degToRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;

  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_M * c;
}

export function isWithinRadius(center: LatLng, point: LatLng, radiusMeters: number): boolean {
  if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) {
    throw new Error('Invalid radiusMeters');
  }
  return distanceMeters(center, point) <= radiusMeters;
}

/**
 * Useful for alerts: "3.2 km away"
 */
export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return '0 m';
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}
