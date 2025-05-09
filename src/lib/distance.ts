export function calculateSpeed(
  position1: { latitude: number; longitude: number },
  position2: { latitude: number; longitude: number },
  duration: number,
): number {
  const distance = calculateDistanceInKm(position1, position2);
  const durationMs = new Date().getTime() - duration;
  const durationHours = durationMs / (1000 * 60 * 60);
  const speed = distance / durationHours;

  return speed;
}

export function calculateDistanceInKm(
  position1: { latitude: number; longitude: number },
  position2: { latitude: number; longitude: number },
) {
  const deg2rad = (deg: number) => {
    return deg * (Math.PI / 180);
  };

  const { latitude: lat1, longitude: lon1 } = position1;
  const { latitude: lat2, longitude: lon2 } = position2;

  const EARTH_RADIUS = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS * c;

  return distance;
}
