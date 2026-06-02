import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import * as ngeohash from 'ngeohash';
import { TELEMETRY_GEOHASH_PRECISION } from 'src/lib/constants';

@Injectable()
export class TelemetryFingerprintService {
  computeBucket(lng: number, lat: number): string {
    return ngeohash.encode(lat, lng, TELEMETRY_GEOHASH_PRECISION);
  }

  decodeBucketCenter(bucket: string): { lng: number; lat: number } {
    const { latitude, longitude } = ngeohash.decode(bucket);
    return { lng: longitude, lat: latitude };
  }

  computeFingerprintHash(salt: Buffer, parts: ReadonlyArray<string>): string {
    const hash = createHash('sha256');
    hash.update(salt);
    hash.update(parts.join('\0'));
    return hash.digest('hex');
  }
}
