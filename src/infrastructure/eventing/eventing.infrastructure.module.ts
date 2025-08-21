import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventSourcingModule } from '@ocoda/event-sourcing';
import {
  MongoDBSnapshotStore,
  type MongoDBSnapshotStoreConfig,
  MongoDBEventStore,
  type MongoDBEventStoreConfig,
} from '@ocoda/event-sourcing-mongodb';
import * as CvmModuleEvents from 'src/core/cvm/events';
import { Domain2ApplicationEventPublisher } from '../eventing/events';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
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
  ],
  controllers: [],
  providers: [Domain2ApplicationEventPublisher],
  exports: [EventSourcingModule],
})
export class EventingInfrastructureModule {}
