import { Module, Global, OnApplicationShutdown, Inject } from '@nestjs/common';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { LockService } from './services/lock.service';
import Redis from 'ioredis';
import Redlock, { CompatibleRedisClient } from 'redlock';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'MULTITHREADING_REDIS_CLIENT',
      useFactory: (config: ConfigService) => {
        return new Redis(config.get<string>('REDIS_URI')!);
      },
      inject: [ConfigService],
    },
    {
      provide: 'MULTITHREADING_REDLOCK',
      useFactory: (redis: Redis) => {
        // ioredis flattens array-style command arguments at runtime, so it is
        // compatible with redlock. Its `eval` overloads just don't match the
        // node-redis shaped signature `CompatibleRedisClient` declares.
        return new Redlock([redis as unknown as CompatibleRedisClient], {
          retryCount: 10,
          retryDelay: 100,
          retryJitter: 50,
        });
      },
      inject: ['MULTITHREADING_REDIS_CLIENT'],
    },
    LockService,
  ],
  exports: [LockService],
})
export class MultithreadingInfrastructureModule
  implements OnApplicationShutdown
{
  constructor(
    @Inject('MULTITHREADING_REDIS_CLIENT')
    private readonly redisClient: Redis,
  ) {}

  async onApplicationShutdown() {
    try {
      await this.redisClient.quit();
    } catch {
      this.redisClient.disconnect();
    }
  }
}
