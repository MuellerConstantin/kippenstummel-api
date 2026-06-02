import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import {
  TELEMETRY_DEDUP_KEY_PREFIX,
  TELEMETRY_DEDUP_TTL_SECONDS,
} from 'src/lib/constants';
import { TelemetryFingerprintService } from './telemetry-fingerprint.service';
import { TelemetrySaltService } from './telemetry-salt.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UsageLocation } from '../repositories';
import { TrackLocation, TrackRequestContext } from '../models';

@Injectable()
export class UsageLocationService {
  private readonly logger = new Logger(UsageLocationService.name);

  constructor(
    @Inject('TELEMETRY_REDIS_CLIENT')
    private readonly redis: Redis,
    @InjectModel(UsageLocation.name)
    private readonly usageLocationModel: Model<UsageLocation>,
    private readonly saltService: TelemetrySaltService,
    private readonly fingerprintService: TelemetryFingerprintService,
  ) {}

  async track(
    location: TrackLocation,
    request: TrackRequestContext,
  ): Promise<void> {
    try {
      const bucket = this.fingerprintService.computeBucket(
        location.lng,
        location.lat,
      );

      const salt = await this.saltService.getDailySalt();

      const fpHash = this.fingerprintService.computeFingerprintHash(salt, [
        request.identity ?? '',
        request.ip ?? '',
        request.userAgent ?? '',
      ]);

      const dedupKey = `${TELEMETRY_DEDUP_KEY_PREFIX}${bucket}:${fpHash}`;

      const setResult = await this.redis.set(
        dedupKey,
        '1',
        'EX',
        TELEMETRY_DEDUP_TTL_SECONDS,
        'NX',
      );

      if (setResult !== 'OK') {
        return;
      }

      const date = new Date().toISOString().slice(0, 10);
      const center = this.fingerprintService.decodeBucketCenter(bucket);
      await this.usageLocationModel.updateOne(
        { bucket, date },
        {
          $inc: { count: 1 },
          $setOnInsert: {
            center: { type: 'Point', coordinates: [center.lng, center.lat] },
          },
        },
        { upsert: true },
      );
    } catch (err) {
      this.logger.warn(
        `Failed to track usage location for bucket-area: ${err}`,
      );
    }
  }
}
