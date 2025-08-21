import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { JobRun, JobRunSchema } from './repositories';
import { JobHistoryService, JobManagementConsumer } from './services';
import { LoggingInfrastructureModule } from '../logging/logging.infrastructure.module';

@Module({
  imports: [
    LoggingInfrastructureModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          url: configService.get<string>('REDIS_URI'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'tile-computation',
    }),
    BullModule.registerQueue({
      name: 'credibility-computation',
    }),
    BullModule.registerQueue({
      name: 'cvm-import',
    }),
    BullModule.registerQueue({
      name: 'job-management',
    }),
    BullModule.registerQueue({
      name: 'cvm-management',
    }),
    MongooseModule.forFeature([{ name: JobRun.name, schema: JobRunSchema }]),
  ],
  controllers: [],
  providers: [JobHistoryService, JobManagementConsumer],
  exports: [BullModule, JobHistoryService],
})
export class SchedulingInfrastructureModule {}
