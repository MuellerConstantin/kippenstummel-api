import { SERVICE_AREA, type ServiceAreaBounds } from './constants';

/**
 * Checks whether a coordinate lies within the area the service covers.
 *
 * The test is a rectangle on purpose. Country polygons would trim the ground
 * the boxes let through — the DACH box is about 1.7 times the area it stands
 * for — at the cost of a boundary asset, its simplification and its licence.
 * Nothing about this signature changes if that trade ever becomes worth
 * making, so the call sites do not need to know which of the two is behind it.
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
