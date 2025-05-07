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
import { CacheModule } from '@nestjs/cache-manager';
import { createKeyv } from '@keyv/redis';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import {
  DefaultExceptionFilter,
  HttpExceptionFilter,
  ApiExceptionFilter,
  PoWGuard,
  IdentGuard,
  CaptchaGuard,
  OAuth2Strategy,
  OAuth2Guard,
} from './controllers';
import { CaptchaService, IdentService, PoWService } from './services';
import { InvalidPayloadError } from './models/error';
import * as CvmModuleEvents from '../cvm/events';

@Module({
  imports: [
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
    PassportModule,
  ],
  controllers: [],
  providers: [
    Logger,
    DefaultExceptionFilter,
    HttpExceptionFilter,
    ApiExceptionFilter,
    PoWGuard,
    IdentGuard,
    CaptchaGuard,
    OAuth2Strategy,
    OAuth2Guard,
    {
      provide: ValidationPipe,
      useValue: new ValidationPipe({
        transform: true,
        stopAtFirstError: true,
        exceptionFactory: (errors) => {
          return new InvalidPayloadError(
            errors.map((error) => ({
              property: error.property,
              message: error.constraints![Object.keys(error.constraints!)[0]],
            })),
          );
        },
      }),
    },
    PoWService,
    IdentService,
    CaptchaService,
  ],
  exports: [
    Logger,
    EventSourcingModule,
    CacheModule,
    PoWService,
    PoWGuard,
    IdentService,
    IdentGuard,
    CaptchaService,
    CaptchaGuard,
  ],
})
export class CommonModule {}
