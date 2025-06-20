import { Injectable } from '@nestjs/common';
import { EventStore, EventStream } from '@ocoda/event-sourcing';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CvmAggregate,
  CvmDownvotedEvent,
  CvmId,
  CvmRegisteredEvent,
  CvmUpvotedEvent,
} from '../models';
import { Cvm, Vote } from './schemas';
import { CvmSnapshotRepository } from './cvm.snapshot-repository';

@Injectable()
export class CvmEventStoreRepository {
  constructor(
    private readonly eventStore: EventStore,
    private readonly cvmSnapshotRepository: CvmSnapshotRepository,
    @InjectModel(Cvm.name) private readonly cvmModel: Model<Cvm>,
    @InjectModel(Vote.name) private readonly voteModel: Model<Vote>,
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

    if (events.length === 0) {
      return;
    }

    const stream = EventStream.for<CvmAggregate>(CvmAggregate, aggregate.id);

    await this.eventStore.appendEvents(stream, aggregate.version, events);
    await this.cvmSnapshotRepository.save(aggregate.id, aggregate);

    const registeredBy =
      events.find((event) => event instanceof CvmRegisteredEvent)
        ?.creatorIdentity || undefined;

    const result = await this.cvmModel.findOneAndUpdate(
      { aggregate_id: aggregate.id.value },
      {
        $set: {
          position: {
            type: 'Point',
            coordinates: [aggregate.longitude, aggregate.latitude],
          },
          score: aggregate.score,
          imported: aggregate.imported,
        },
        $setOnInsert: {
          aggregate_id: aggregate.id.value,
          registeredBy,
        },
      },
      {
        upsert: true,
        new: true,
      },
    );

    for (const event of events) {
      if (event instanceof CvmUpvotedEvent) {
        await this.voteModel.create({
          identity: event.voterIdentity,
          cvm: result._id,
          weight: event.credibility,
          type: 'upvote',
        });
      } else if (event instanceof CvmDownvotedEvent) {
        await this.voteModel.create({
          identity: event.voterIdentity,
          cvm: result._id,
          weight: event.credibility,
          type: 'downvote',
        });
      }
    }
  }
}
