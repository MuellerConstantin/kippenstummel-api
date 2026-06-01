import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import Redis from 'ioredis';
import {
  TELEMETRY_SALT_KEY_PREFIX,
  TELEMETRY_SALT_TTL_SECONDS,
} from 'src/lib/constants';

@Injectable()
export class TelemetrySaltService {
  private readonly logger = new Logger(TelemetrySaltService.name);
  private cached: { date: string; salt: Buffer } | null = null;

  constructor(
    @Inject('TELEMETRY_REDIS_CLIENT')
    private readonly redis: Redis,
  ) {}

  async getDailySalt(now: Date = new Date()): Promise<Buffer> {
    const date = now.toISOString().slice(0, 10);
    if (this.cached?.date === date) return this.cached.salt;

    const key = TELEMETRY_SALT_KEY_PREFIX + date;

    const existing = await this.redis.getBuffer(key);
    if (existing) {
      this.cached = { date, salt: existing };
      return existing;
    }

    const candidate = randomBytes(32);
    const setResult = await this.redis.set(
      key,
      candidate,
      'EX',
      TELEMETRY_SALT_TTL_SECONDS,
      'NX',
    );
    if (setResult === 'OK') {
      this.cached = { date, salt: candidate };
      return candidate;
    }

    const winner = await this.redis.getBuffer(key);
    if (!winner) {
      this.logger.warn(
        `Salt race resolution failed for ${date}; falling back to local candidate`,
      );
      return candidate;
    }
    this.cached = { date, salt: winner };
    return winner;
  }
}
