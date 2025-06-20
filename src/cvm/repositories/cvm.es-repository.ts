import { Injectable } from '@nestjs/common';
import { EventStore, EventStream, IEvent } from '@ocoda/event-sourcing';
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
import { PiiService } from 'src/common/services';
import { deepCopy } from 'src/lib';

@Injectable()
export class CvmEventStoreRepository {
  constructor(
    private readonly eventStore: EventStore,
    private readonly cvmSnapshotRepository: CvmSnapshotRepository,
    @InjectModel(Cvm.name) private readonly cvmModel: Model<Cvm>,
    @InjectModel(Vote.name) private readonly voteModel: Model<Vote>,
    private readonly piiService: PiiService,
  ) {}

  async load(cvmId: CvmId): Promise<CvmAggregate | undefined> {
    const eventStream = EventStream.for<CvmAggregate>(CvmAggregate, cvmId);

    const aggregate = await this.cvmSnapshotRepository.load(cvmId);

    const eventCursor = this.eventStore.getEvents(eventStream, {
      fromVersion: aggregate.version + 1,
    });

    /*
     * Due to GDPR, PII is tokenized. This step must be reversed when reading,
     * if still possible and the authority has not already been deleted.
     */

    const untokenizeEvent = async (event: IEvent) => {
      if (event instanceof CvmRegisteredEvent) {
        const untokenizedIdentity = (await this.piiService.untokenizePii(
          event.creatorIdentity,
        )) as string | null;

        return new CvmRegisteredEvent(
          event.cvmId,
          event.position,
          untokenizedIdentity || event.creatorIdentity,
        );
      } else if (event instanceof CvmUpvotedEvent) {
        const untokenizedIdentity = (await this.piiService.untokenizePii(
          event.voterIdentity,
        )) as string | null;

        return new CvmUpvotedEvent(
          event.cvmId,
          untokenizedIdentity || event.voterIdentity,
          event.credibility,
        );
      } else if (event instanceof CvmDownvotedEvent) {
        const untokenizedIdentity = (await this.piiService.untokenizePii(
          event.voterIdentity,
        )) as string | null;

        return new CvmDownvotedEvent(
          event.cvmId,
          untokenizedIdentity || event.voterIdentity,
          event.credibility,
        );
      }

      return event;
    };

    const untokenizedEvents = (async function* () {
      for await (const eventBatch of eventCursor) {
        const untokenizedEventBatch = await Promise.all(
          eventBatch.map(untokenizeEvent),
        );

        yield untokenizedEventBatch;
      }
    })();

    await aggregate.loadFromHistory(untokenizedEvents);

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

    /*
     * If Art. 17 of the GDPR applies, a user can insist on the deletion of their data.
     * To meet the legal requirements and still not violate the immutability of the event
     * store, no PII (Personally Identifiable Information) may be stored in the events themselves.
     * Instead, these are replaced by tokens. The tokens can be translated back into PII
     * using a mapping. In the case of Art. 17, the corresponding token mapping is deleted,
     * and the PII in the event history is lost without changing the event store.
     */

    const tokenizedEvents = await Promise.all(
      deepCopy(events).map(async (event) => {
        if (event instanceof CvmRegisteredEvent) {
          const token = await this.piiService.tokenizePii(
            event.creatorIdentity,
            event.creatorIdentity,
          );

          return new CvmRegisteredEvent(event.cvmId, event.position, token);
        } else if (event instanceof CvmUpvotedEvent) {
          const token = await this.piiService.tokenizePii(
            event.voterIdentity,
            event.voterIdentity,
          );

          return new CvmUpvotedEvent(event.cvmId, token, event.credibility);
        } else if (event instanceof CvmDownvotedEvent) {
          const token = await this.piiService.tokenizePii(
            event.voterIdentity,
            event.voterIdentity,
          );

          return new CvmDownvotedEvent(event.cvmId, token, event.credibility);
        }

        return event;
      }),
    );

    await this.eventStore.appendEvents(
      stream,
      aggregate.version,
      tokenizedEvents,
    );
    await this.cvmSnapshotRepository.save(aggregate.id, aggregate);

    const registeredBy =
      events.find((event) => event instanceof CvmRegisteredEvent)
        ?.creatorIdentity || undefined;

    const result = await this.cvmModel.findOneAndUpdate(
      { aggregateId: aggregate.id.value },
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
          aggregateId: aggregate.id.value,
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
