export interface BoundingBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export function isValidLongitude(value: number): boolean {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

export function isValidLatitude(value: number): boolean {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

/**
 * Parses a bounding box given as `minLng,minLat,maxLng,maxLat`.
 *
 * Returns `null` for anything that is not a usable box, so callers can raise
 * whichever error suits their layer. A box is usable when it carries exactly
 * four finite coordinates that are within range and ordered south-west to
 * north-east — MongoDB's `$box` takes the bottom left corner first and does
 * not wrap across the antimeridian, so a reversed or degenerate pair silently
 * matches nothing instead of failing.
 *
 * @param value The raw bounding box string.
 * @returns The parsed bounding box, or null if it is not usable.
 */
export function parseBoundingBox(value: string): BoundingBox | null {
  const coordinates = value.split(',').map(Number);

  if (coordinates.length !== 4) {
    return null;
  }

  const [minLng, minLat, maxLng, maxLat] = coordinates;

  if (!isValidLongitude(minLng) || !isValidLongitude(maxLng)) {
    return null;
  }

  if (!isValidLatitude(minLat) || !isValidLatitude(maxLat)) {
    return null;
  }

  if (minLng >= maxLng || minLat >= maxLat) {
    return null;
  }

  return { minLng, minLat, maxLng, maxLat };
}
