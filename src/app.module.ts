import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { EventSourcingModule } from '@ocoda/event-sourcing';
import {
  MongoDBSnapshotStore,
  type MongoDBSnapshotStoreConfig,
  MongoDBEventStore,
  type MongoDBEventStoreConfig,
} from '@ocoda/event-sourcing-mongodb';
import * as Joi from 'joi';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [
        `.env.${process.env.NODE_ENV}.local`,
        `.env.${process.env.NODE_ENV}`,
        '.env.local',
        '.env',
      ],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .required(),
        PORT: Joi.number().default(8080),
        MONGO_URI: Joi.string().uri().required(),
      }),
      validationOptions: {
        allowUnknown: true,
        abortEarly: true,
      },
    }),
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
        events: [],
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
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
