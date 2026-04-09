import * as path from 'path';
import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import * as Joi from 'joi';
import { CommonPresentationModule } from './presentation/common/common.presentation.module';
import { CvmPresentationModule } from './presentation/cvm/cvm.presentation.module';
import { KmcPresentationModule } from './presentation/kmc/kmc.presentation.module';
import { IdentPresentationModule } from './presentation/ident/ident.presentation.module';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `.env.${process.env.NODE_ENV}.local`,
        `.env.${process.env.NODE_ENV}`,
        '.env.local',
        '.env',
        `${process.env.CONFIG_DIR || './config'}/.env.${process.env.NODE_ENV}.local`,
        `${process.env.CONFIG_DIR || './config'}/.env.${process.env.NODE_ENV}`,
        `${process.env.CONFIG_DIR || './config'}/.env.local`,
        `${process.env.CONFIG_DIR || './config'}/.env`,
      ],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test', 'staging')
          .required(),
        PORT: Joi.number().default(8080),
        MONGO_URI: Joi.string().uri().required(),
        REDIS_URI: Joi.string().uri().required(),
        JWT_SECRET: Joi.string().required(),
        IDENT_SECRET: Joi.string().required(),
        IDENT_EXPIRES_IN: Joi.number().default(60 * 60 * 24 * 7),
        CAPTCHA_EXPIRES_IN: Joi.number().default(60 * 5),
        TRANSFER_EXPIRES_IN: Joi.number().default(60 * 5),
        TMP_DIR: Joi.string().required(),
      }),
      validationOptions: {
        allowUnknown: true,
        abortEarly: true,
      },
    }),
    ServeStaticModule.forRoot({
      serveRoot: '/static',
      rootPath: path.join(__dirname, '..', 'public'),
      serveStaticOptions: {
        index: false,
      },
    }),
    CommonPresentationModule,
    CvmPresentationModule,
    KmcPresentationModule,
    IdentPresentationModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements OnModuleInit {
  constructor(
    @InjectQueue('job-management')
    private jobManagementQueue: Queue,
    @InjectQueue('cvm-management')
    private cvmManagementQueue: Queue,
  ) {}

  async onModuleInit() {
    /*
     * This scheduled jobs initialization on startup is not multiple-instance safe, but for simplicity we will keep it like this
     * for now. In the future, we can consider using a distributed lock or a leader election mechanism to ensure that only one
     * instance initializes the scheduled jobs.
     */

    await this.jobManagementQueue.removeJobScheduler('cleanup');
    await this.jobManagementQueue.upsertJobScheduler(
      'cleanup',
      {
        pattern: '0 0 1,15 * *', // At 12:00 AM, on day 1 and 15 of the month
        immediately: true,
      },
      {
        opts: {
          removeOnComplete: {
            age: 24 * 3600,
            count: 200,
          },
          removeOnFail: {
            age: 24 * 3600,
            count: 1000,
          },
        },
      },
    );

    await this.jobManagementQueue.removeJobScheduler('check-orphaned');
    await this.jobManagementQueue.upsertJobScheduler(
      'check-orphaned',
      {
        pattern: '*/30 * * * *', // Every 30 minute
        immediately: true,
      },
      {
        opts: {
          removeOnComplete: {
            age: 24 * 3600,
            count: 200,
          },
          removeOnFail: {
            age: 24 * 3600,
            count: 1000,
          },
        },
      },
    );

    await this.cvmManagementQueue.removeJobScheduler('cleanup');
    await this.cvmManagementQueue.upsertJobScheduler(
      'cleanup',
      {
        pattern: '0 0 * * 1', // Every Monday at 00:00 AM
        immediately: true,
      },
      {
        opts: {
          removeOnComplete: {
            age: 24 * 3600,
            count: 200,
          },
          removeOnFail: {
            age: 24 * 3600,
            count: 1000,
          },
        },
      },
    );
  }
}
