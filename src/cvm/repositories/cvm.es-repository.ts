import { Injectable } from '@nestjs/common';
import { EventStore, EventStream } from '@ocoda/event-sourcing';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CvmAggregate, CvmId } from '../models';
import { Cvm } from './schemas';
import { CvmSnapshotRepository } from './cvm.snapshot-repository';

@Injectable()
export class CvmEventStoreRepository {
  constructor(
    private readonly eventStore: EventStore,
    private readonly cvmSnapshotRepository: CvmSnapshotRepository,
    @InjectModel(Cvm.name) private readonly cvmModel: Model<Cvm>,
  ) {}

  async load(cvmId: CvmId): Promise<CvmAggregate | undefined> {
    const eventStream = EventStream.for<CvmAggregate>(CvmAggregate, cvmId);

    const aggregate = await this.cvmSnapshotRepository.load(cvmId);

    const eventCursor = this.eventStore.getEvents(eventStream, {
      fromVersion: aggregate.version + 1,
    });

    await aggregate.loadFromHistory(eventCursor);

    if (aggregate.version < 1) {
      return;
    }

    return aggregate;
  }

  async save(aggregate: CvmAggregate): Promise<void> {
    const events = aggregate.commit();
    const stream = EventStream.for<CvmAggregate>(CvmAggregate, aggregate.id);

    await this.eventStore.appendEvents(stream, aggregate.version, events);
    await this.cvmSnapshotRepository.save(aggregate.id, aggregate);

    await this.cvmModel.updateOne(
      { id: aggregate.id.value },
      {
        id: aggregate.id.value,
        position: {
          type: 'Point',
          coordinates: [aggregate.longitude, aggregate.latitude],
        },
        score: aggregate.score,
      },
      {
        upsert: true,
      },
    );
  }
}
