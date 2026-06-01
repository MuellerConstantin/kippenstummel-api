import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { UsageLocation, UsageLocationSchema } from './repositories';
import {
  TelemetryFingerprintService,
  TelemetrySaltService,
  UsageLocationService,
} from './services';
import Redis from 'ioredis';

@Global()
@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: UsageLocation.name, schema: UsageLocationSchema },
    ]),
  ],
  providers: [
    {
      provide: 'TELEMETRY_REDIS_CLIENT',
      useFactory: (config: ConfigService) => {
        return new Redis(config.get<string>('REDIS_URI')!);
      },
      inject: [ConfigService],
    },
    TelemetryFingerprintService,
    TelemetrySaltService,
    UsageLocationService,
  ],
  exports: [UsageLocationService],
})
export class TelemetryInfrastructureModule {}
