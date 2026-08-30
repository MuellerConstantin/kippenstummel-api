import { isWithinServiceArea } from 'src/lib';
import { constants } from 'src/lib';

describe('isWithinServiceArea', () => {
  describe('the covered area', () => {
    it.each([
      ['Berlin', 13.405, 52.52],
      ['Vienna', 16.3725, 48.2082],
      ['Zurich', 8.5417, 47.3769],
      ['Flensburg, close to the northern edge', 9.4469, 54.7833],
    ])('accepts %s', (_name, longitude, latitude) => {
      expect(isWithinServiceArea(longitude, latitude)).toBe(true);
    });

    it.each([
      ['Paris, west of the area', 2.3522, 48.8566],
      ['Rome, south of the area', 12.4964, 41.9028],
      ['Warsaw, east of the area', 21.0122, 52.2297],
      ['a point in the Pacific', -140.0, 10.0],
    ])('rejects %s', (_name, longitude, latitude) => {
      expect(isWithinServiceArea(longitude, latitude)).toBe(false);
    });

    /*
     * Swapped axes produce a well-formed pair that the individual latitude and
     * longitude checks accept, so the area test is the only one that catches it.
     */
    it('rejects a coordinate whose latitude and longitude are swapped', () => {
      expect(isWithinServiceArea(8.404, 49.0092)).toBe(true);
      expect(isWithinServiceArea(49.0092, 8.404)).toBe(false);
    });

    it('treats the bounds themselves as covered', () => {
      const [dach] = constants.SERVICE_AREA;

      expect(isWithinServiceArea(dach.minLongitude, dach.minLatitude)).toBe(
        true,
      );
      expect(isWithinServiceArea(dach.maxLongitude, dach.maxLatitude)).toBe(
        true,
      );
    });
  });

  describe('an area passed in', () => {
    const area = [
      {
        name: 'test',
        minLongitude: 0,
        maxLongitude: 10,
        minLatitude: 0,
        maxLatitude: 10,
      },
      {
        name: 'detached',
        minLongitude: 100,
        maxLongitude: 110,
        minLatitude: 0,
        maxLatitude: 10,
      },
    ];

    it('accepts a coordinate in any one of several regions', () => {
      expect(isWithinServiceArea(5, 5, area)).toBe(true);
      expect(isWithinServiceArea(105, 5, area)).toBe(true);
    });

    it('rejects a coordinate that falls between the regions', () => {
      expect(isWithinServiceArea(50, 5, area)).toBe(false);
    });

    it('covers nothing when no region is given', () => {
      expect(isWithinServiceArea(13.405, 52.52, [])).toBe(false);
    });
  });
});
