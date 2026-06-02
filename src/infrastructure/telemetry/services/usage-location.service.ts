import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import {
  TELEMETRY_DEDUP_KEY_PREFIX,
  TELEMETRY_DEDUP_TTL_SECONDS,
  TELEMETRY_GEOHASH_PRECISION,
} from 'src/lib/constants';
import { TelemetryFingerprintService } from './telemetry-fingerprint.service';
import { TelemetrySaltService } from './telemetry-salt.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage } from 'mongoose';
import { UsageLocation } from '../repositories';
import {
  TrackLocation,
  TrackRequestContext,
  UsageDensityStatsPointProjection,
} from '../models';

export interface GetUsageDensityParams {
  bottomLeft: { lng: number; lat: number };
  topRight: { lng: number; lat: number };
  zoom: number;
  lastNDays: number;
}

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

  async getDensity(
    params: GetUsageDensityParams,
  ): Promise<UsageDensityStatsPointProjection[]> {
    const precision = this.zoomToReadPrecision(params.zoom);

    const now = new Date();
    const dateTo = now.toISOString().slice(0, 10);
    const startDate = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - params.lastNDays + 1,
      ),
    );
    const dateFrom = startDate.toISOString().slice(0, 10);

    const match: PipelineStage = {
      $match: {
        center: {
          $geoWithin: {
            $box: [
              [params.bottomLeft.lng, params.bottomLeft.lat],
              [params.topRight.lng, params.topRight.lat],
            ],
          },
        },
        date: { $gte: dateFrom, $lte: dateTo },
      },
    };

    const pipeline: PipelineStage[] = [
      match,
      {
        $group: {
          _id: { $substr: ['$bucket', 0, precision] },
          count: { $sum: '$count' },
          weightedLng: {
            $sum: {
              $multiply: [
                { $arrayElemAt: ['$center.coordinates', 0] },
                '$count',
              ],
            },
          },
          weightedLat: {
            $sum: {
              $multiply: [
                { $arrayElemAt: ['$center.coordinates', 1] },
                '$count',
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          longitude: { $divide: ['$weightedLng', '$count'] },
          latitude: { $divide: ['$weightedLat', '$count'] },
          count: 1,
        },
      },
    ];

    const result: UsageDensityStatsPointProjection[] =
      await this.usageLocationModel.aggregate<UsageDensityStatsPointProjection>(
        pipeline,
      );
    return result;
  }

  /**
   * Maps a map zoom level to the geohash precision used for read-side
   * rollup. We can never go finer than the precision we wrote at; below
   * that, coarser prefixes group multiple stored buckets together.
   */
  private zoomToReadPrecision(zoom: number): number {
    if (zoom < 4) return 2; // ~1250 km cells — world view
    if (zoom < 7) return 3; // ~156 km cells — country view
    if (zoom < 10) return 4; // ~39 km cells — region view
    return TELEMETRY_GEOHASH_PRECISION; // 5 — native, city view and finer
  }
}
