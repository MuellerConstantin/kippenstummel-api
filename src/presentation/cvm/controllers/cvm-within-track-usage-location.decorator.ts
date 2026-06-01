import { constants } from 'src/lib';
import {
  LocationExtractor,
  TrackUsageLocation,
} from 'src/presentation/common/controllers';

const cvmWithinExtractor: LocationExtractor = (req) => {
  const { bottomLeft, topRight, zoom } = req.query as {
    bottomLeft?: string;
    topRight?: string;
    zoom?: string;
  };
  if (!bottomLeft || !topRight || !zoom) return null;
  if (Number(zoom) < constants.TELEMETRY_TRACKING_MIN_ZOOM) return null;

  const [bLat, bLng] = bottomLeft.split(',').map(Number);
  const [tLat, tLng] = topRight.split(',').map(Number);
  if (
    !Number.isFinite(bLat) ||
    !Number.isFinite(bLng) ||
    !Number.isFinite(tLat) ||
    !Number.isFinite(tLng)
  ) {
    return null;
  }

  return { lng: (bLng + tLng) / 2, lat: (bLat + tLat) / 2 };
};

export const CvmWithinTrackUsageLocation =
  TrackUsageLocation(cvmWithinExtractor);
