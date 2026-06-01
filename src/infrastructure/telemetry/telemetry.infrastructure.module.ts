import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsageLocation, UsageLocationSchema } from './repositories';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UsageLocation.name, schema: UsageLocationSchema },
    ]),
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class TelemetryInfrastructureModule {}
