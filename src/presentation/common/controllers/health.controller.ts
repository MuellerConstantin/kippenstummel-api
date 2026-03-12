import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthCheck,
  HealthCheckService,
  MongooseHealthIndicator,
} from '@nestjs/terminus';
import Redis from 'ioredis';

@Controller({ version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private config: ConfigService,
    private health: HealthCheckService,
    private mongo: MongooseHealthIndicator,
  ) {}

  @Get('live')
  live() {
    return 'OK';
  }

  @Get('ready')
  @HealthCheck()
  async ready() {
    return this.health.check([
      async () => this.mongo.pingCheck('mongo'),
      async () => {
        const redis = new Redis(this.config.get<string>('REDIS_URI')!);

        try {
          const pong = await redis.ping();

          if (pong !== 'PONG') {
            throw new Error('Redis ping failed');
          }

          return { redis: { status: 'up' } };
        } finally {
          redis.disconnect();
        }
      },
    ]);
  }
}
