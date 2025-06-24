import { Module, ValidationPipe, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { EventSourcingModule } from '@ocoda/event-sourcing';
import {
  MongoDBSnapshotStore,
  type MongoDBSnapshotStoreConfig,
  MongoDBEventStore,
  type MongoDBEventStoreConfig,
} from '@ocoda/event-sourcing-mongodb';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CacheModule } from '@nestjs/cache-manager';
import { createKeyv } from '@keyv/redis';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { BullModule } from '@nestjs/bullmq';
import {
  DefaultExceptionFilter,
  HttpExceptionFilter,
  ApiExceptionFilter,
  OAuth2Strategy,
  OAuth2Guard,
} from './controllers';
import { InvalidPayloadError } from './models/error';
import * as CvmModuleEvents from '../cvm/events';
import { ValidationError } from 'class-validator';
import { Job, JobSchema, PiiToken, PiiTokenSchema } from './repositories';
import {
  JobService,
  PiiService,
  JobManagementConsumer,
  IdentRemovedEventSubscriber,
} from './services';
import { MulterModule } from '@nestjs/platform-express';
import multer from 'multer';
import { Domain2ApplicationEventPublisher } from './events';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),
      inject: [ConfigService],
    }),
    EventSourcingModule.forRootAsync<
      MongoDBEventStoreConfig,
      MongoDBSnapshotStoreConfig
    >({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        events: [...Object.values(CvmModuleEvents)],
        eventStore: {
          driver: MongoDBEventStore,
          url: configService.get<string>('MONGO_URI')!,
        },
        snapshotStore: {
          driver: MongoDBSnapshotStore,
          url: configService.get<string>('MONGO_URI')!,
        },
      }),
      inject: [ConfigService],
    }),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        return {
          stores: [createKeyv({ url: configService.get<string>('REDIS_URI') })],
        };
      },
      inject: [ConfigService],
    }),
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
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('IDENT_SECRET'),
        signOptions: {
          expiresIn: configService.get<number>('IDENT_EXPIRES_IN'),
        },
      }),
      inject: [ConfigService],
    }),
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        storage: multer.diskStorage({
          destination: (req, file, cb) => {
            cb(null, configService.get<string>('TMP_DIR')!);
          },
          filename: function (req, file, cb) {
            const uniqueSuffix =
              Date.now() + '-' + Math.round(Math.random() * 1e9);
            const extension = file.originalname.split('.').pop();
            cb(null, file.fieldname + '-' + uniqueSuffix + '.' + extension);
          },
        }),
      }),
      inject: [ConfigService],
    }),
    PassportModule,
    MongooseModule.forFeature([{ name: Job.name, schema: JobSchema }]),
    MongooseModule.forFeature([
      { name: PiiToken.name, schema: PiiTokenSchema },
    ]),
  ],
  controllers: [],
  providers: [
    Logger,
    DefaultExceptionFilter,
    HttpExceptionFilter,
    ApiExceptionFilter,
    OAuth2Strategy,
    OAuth2Guard,
    {
      provide: ValidationPipe,
      useValue: new ValidationPipe({
        transform: true,
        stopAtFirstError: true,
        exceptionFactory: (errors) => {
          const flattenValidationErrors = (
            errors: ValidationError[],
            parentPath = '',
          ): Array<{
            property: string;
            constraint: string;
            message: string;
          }> => {
            const result: Array<{
              property: string;
              constraint: string;
              message: string;
            }> = [];

            for (const error of errors) {
              const propertyPath = parentPath
                ? `${parentPath}.${error.property}`
                : error.property;

              if (error.constraints) {
                const constraints = Object.entries(error.constraints);

                for (const constraint of constraints) {
                  const name = constraint[0];
                  const message = constraint[1];

                  result.push({
                    property: propertyPath,
                    constraint: name,
                    message,
                  });
                }
              }

              if (error.children?.length) {
                result.push(
                  ...flattenValidationErrors(error.children, propertyPath),
                );
              }
            }

            return result;
          };

          const flatErrors = flattenValidationErrors(errors);
          return new InvalidPayloadError(flatErrors);
        },
      }),
    },
    JobService,
    PiiService,
    JobManagementConsumer,
    Domain2ApplicationEventPublisher,
    IdentRemovedEventSubscriber,
  ],
  exports: [
    BullModule,
    MulterModule,
    Logger,
    EventSourcingModule,
    CacheModule,
    JobService,
    PiiService,
  ],
})
export class CommonModule {}
