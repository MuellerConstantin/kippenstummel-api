import { calculateDistanceInKm, calculateSpeed } from 'src/lib';

// One degree of latitude on a sphere of radius 6371 km:
// 6371 * PI / 180 = 111.1949... km. Every expectation below is derived from
// that constant rather than copied from a map, so the numbers stay checkable.
const ONE_DEGREE_KM = (6371 * Math.PI) / 180;

describe('calculateDistanceInKm', () => {
  it('Should return zero for identical positions', () => {
    const position = { latitude: 49.0069, longitude: 8.4037 };

    expect(calculateDistanceInKm(position, position)).toBeCloseTo(0, 10);
  });

  it('Should measure one degree of latitude', () => {
    const distance = calculateDistanceInKm(
      { latitude: 0, longitude: 0 },
      { latitude: 1, longitude: 0 },
    );

    expect(distance).toBeCloseTo(ONE_DEGREE_KM, 6);
  });

  it('Should measure one degree of longitude at the equator', () => {
    const distance = calculateDistanceInKm(
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 1 },
    );

    expect(distance).toBeCloseTo(ONE_DEGREE_KM, 6);
  });

  it('Should shrink a degree of longitude towards the poles', () => {
    // At 60 degrees latitude a degree of longitude covers roughly cos(60) =
    // half of what it does at the equator. The great-circle path is a shade
    // shorter than that flat approximation, so this asserts on a relative
    // tolerance rather than pretending the two are equal.
    const distance = calculateDistanceInKm(
      { latitude: 60, longitude: 0 },
      { latitude: 60, longitude: 1 },
    );
    const approximation = ONE_DEGREE_KM * Math.cos(Math.PI / 3);

    expect(distance).toBeLessThan(approximation);
    expect(distance / approximation).toBeGreaterThan(0.999);
  });

  it('Should be symmetric', () => {
    const karlsruhe = { latitude: 49.0069, longitude: 8.4037 };
    const munich = { latitude: 48.1351, longitude: 11.582 };

    expect(calculateDistanceInKm(karlsruhe, munich)).toBeCloseTo(
      calculateDistanceInKm(munich, karlsruhe),
      10,
    );
  });

  it('Should handle the antimeridian as a distance, not a wrap-around', () => {
    // Two points either side of the 180th meridian are 2 degrees apart, and
    // the haversine formula resolves that as the short way round.
    const distance = calculateDistanceInKm(
      { latitude: 0, longitude: 179 },
      { latitude: 0, longitude: -179 },
    );

    expect(distance).toBeCloseTo(ONE_DEGREE_KM * 2, 3);
  });
});

describe('calculateSpeed', () => {
  // NOTE: the third parameter is named `duration` but is used as an epoch
  // timestamp (`Date.now() - duration`). These tests pin the actual behaviour.
  it('Should derive km/h from a start timestamp one hour ago', () => {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    const speed = calculateSpeed(
      { latitude: 0, longitude: 0 },
      { latitude: 1, longitude: 0 },
      oneHourAgo,
    );

    expect(speed).toBeCloseTo(ONE_DEGREE_KM, 1);
  });

  it('Should double when the same distance is covered in half the time', () => {
    const halfHourAgo = Date.now() - 30 * 60 * 1000;

    const speed = calculateSpeed(
      { latitude: 0, longitude: 0 },
      { latitude: 1, longitude: 0 },
      halfHourAgo,
    );

    expect(speed).toBeCloseTo(ONE_DEGREE_KM * 2, 1);
  });

  it('Should report zero speed when the position did not change', () => {
    const position = { latitude: 49.0069, longitude: 8.4037 };

    expect(
      calculateSpeed(position, position, Date.now() - 60 * 60 * 1000),
    ).toBeCloseTo(0, 10);
  });
});
