import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import {
  EventSubscriber,
  IEventSubscriber,
  EventEnvelope,
} from '@ocoda/event-sourcing';
import { CvmRestoredEvent } from '../events';
import { CvmReadModelReplayer } from '../repositories';
import { CvmId } from '../models';

@EventSubscriber(CvmRestoredEvent)
export class CvmRestoredEventSubscriber implements IEventSubscriber {
  constructor(
    private readonly cvmReadModelReplayer: CvmReadModelReplayer,
    @InjectQueue('tile-computation') private tileComputationQueue: Queue,
  ) {}

  async handle(envelope: EventEnvelope<CvmRestoredEvent>) {
    const aggregateId = envelope.payload.cvmId as string;
    const position = envelope.payload.position as {
      longitude: number;
      latitude: number;
    };

    /*
     * The removal deleted the read model entry, so a restore has to build it
     * again. The entry holds fields no single event carries — `registeredBy`
     * and `lastVotedAt` — which is why it is folded from the event stream
     * rather than read off this event's payload.
     */
    await this.cvmReadModelReplayer.replay(CvmId.from(aggregateId));

    await this.tileComputationQueue.add('precompute', {
      positions: [
        {
          longitude: position.longitude,
          latitude: position.latitude,
        },
      ],
    });
  }
}
