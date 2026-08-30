import { SERVICE_AREA, type ServiceAreaBounds } from './constants';

/**
 * Checks whether a coordinate lies within the area the service covers.
 *
 * The rectangle test is deliberate: this signature is the seam a polygon check
 * could sit behind instead, so no call site needs to know which of the two is
 * in use.
 *
 * @param longitude The longitude of the coordinate.
 * @param latitude The latitude of the coordinate.
 * @param area The regions to test against. Defaults to the covered service area.
 * @returns True if the coordinate falls inside one of the regions.
 */
export function isWithinServiceArea(
  longitude: number,
  latitude: number,
  area: ServiceAreaBounds[] = SERVICE_AREA,
): boolean {
  return area.some(
    (bounds) =>
      longitude >= bounds.minLongitude &&
      longitude <= bounds.maxLongitude &&
      latitude >= bounds.minLatitude &&
      latitude <= bounds.maxLatitude,
  );
}
