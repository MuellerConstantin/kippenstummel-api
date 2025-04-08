import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { EventSourcingModule } from '@ocoda/event-sourcing';
import {
  MongoDBSnapshotStore,
  type MongoDBSnapshotStoreConfig,
  MongoDBEventStore,
  type MongoDBEventStoreConfig,
} from '@ocoda/event-sourcing-mongodb';
import {
  DefaultExceptionFilter,
  HttpExceptionFilter,
  ApiExceptionFilter,
} from './controllers';
import * as CvmModuleEvents from '../cvm/events';
import { InvalidPayloadError } from './models/error';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),
      inject: [ConfigService],
    }),
    EventSourcingModule.forRootAsync<
      MongoDBEventStoreConfig,
      MongoDBSnapshotStoreConfig
    >({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
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
  ],
  controllers: [],
  providers: [
    DefaultExceptionFilter,
    HttpExceptionFilter,
    ApiExceptionFilter,
    {
      provide: ValidationPipe,
      useValue: new ValidationPipe({
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
  ],
  exports: [EventSourcingModule],
})
export class CommonModule {}
