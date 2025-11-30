import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MurLockModule } from 'murlock';

@Global()
@Module({
  imports: [
    MurLockModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redisOptions: {
          url: configService.get<string>('REDIS_URI'),
        },
        wait: 1000,
        maxAttempts: 3,
        logLevel: 'log',
      }),
      inject: [ConfigService],
    }),
  ],
})
export class MultithreadingInfrastructureModule {}
