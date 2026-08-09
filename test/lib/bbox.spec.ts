import { isValidLatitude, isValidLongitude, parseBoundingBox } from 'src/lib';

describe('isValidLongitude', () => {
  it.each([[0], [180], [-180], [8.4037]])('Should accept %p', (value) => {
    expect(isValidLongitude(value)).toBe(true);
  });

  it.each([[180.1], [-180.1], [999], [NaN], [Infinity], [-Infinity]])(
    'Should reject %p',
    (value) => {
      expect(isValidLongitude(value)).toBe(false);
    },
  );
});

describe('isValidLatitude', () => {
  it.each([[0], [90], [-90], [49.0069]])('Should accept %p', (value) => {
    expect(isValidLatitude(value)).toBe(true);
  });

  it.each([[90.1], [-90.1], [999], [NaN], [Infinity], [-Infinity]])(
    'Should reject %p',
    (value) => {
      expect(isValidLatitude(value)).toBe(false);
    },
  );
});

describe('parseBoundingBox', () => {
  it('Should parse a well formed box', () => {
    expect(parseBoundingBox('8.0,48.0,9.0,49.0')).toEqual({
      minLng: 8.0,
      minLat: 48.0,
      maxLng: 9.0,
      maxLat: 49.0,
    });
  });

  it('Should accept the whole world', () => {
    expect(parseBoundingBox('-180,-90,180,90')).toEqual({
      minLng: -180,
      minLat: -90,
      maxLng: 180,
      maxLat: 90,
    });
  });

  it('Should tolerate surrounding whitespace, since Number does', () => {
    expect(parseBoundingBox(' 8.0 , 48.0 , 9.0 , 49.0 ')).toEqual({
      minLng: 8.0,
      minLat: 48.0,
      maxLng: 9.0,
      maxLat: 49.0,
    });
  });

  describe('shape', () => {
    it.each([
      ['', 'an empty string'],
      ['8.0', 'a single coordinate'],
      ['8.0,48.0', 'a coordinate pair'],
      ['8.0,48.0,9.0', 'three coordinates'],
      ['8.0,48.0,9.0,49.0,50.0', 'five coordinates'],
    ])('Should reject %p (%s)', (value) => {
      expect(parseBoundingBox(value)).toBeNull();
    });
  });

  describe('numeric validity', () => {
    it.each([
      ['a,b,c,d', 'non-numeric coordinates'],
      ['8.0,48.0,9.0,north', 'a single non-numeric coordinate'],
      ['8.0,48.0,9.0,', 'a missing trailing coordinate'],
      ['Infinity,48.0,9.0,49.0', 'a non-finite coordinate'],
    ])('Should reject %p (%s)', (value) => {
      expect(parseBoundingBox(value)).toBeNull();
    });
  });

  describe('coordinate ranges', () => {
    it.each([
      ['-181,48.0,9.0,49.0', 'longitude below -180'],
      ['8.0,48.0,181,49.0', 'longitude above 180'],
      ['8.0,-91,9.0,49.0', 'latitude below -90'],
      ['8.0,48.0,9.0,91', 'latitude above 90'],
    ])('Should reject %p (%s)', (value) => {
      expect(parseBoundingBox(value)).toBeNull();
    });
  });

  describe('ordering', () => {
    // $box expects bottom left before top right and cannot wrap the
    // antimeridian, so anything else would silently match nothing.
    it.each([
      ['9.0,48.0,8.0,49.0', 'reversed longitudes'],
      ['8.0,49.0,9.0,48.0', 'reversed latitudes'],
      ['9.0,49.0,8.0,48.0', 'both pairs reversed'],
      ['8.0,48.0,8.0,49.0', 'zero width'],
      ['8.0,48.0,9.0,48.0', 'zero height'],
      ['8.0,48.0,8.0,48.0', 'a degenerate point'],
      ['170,48.0,-170,49.0', 'a box crossing the antimeridian'],
    ])('Should reject %p (%s)', (value) => {
      expect(parseBoundingBox(value)).toBeNull();
    });
  });
});
