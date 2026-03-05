import {
  EventSubscriber,
  IEventSubscriber,
  EventEnvelope,
} from '@ocoda/event-sourcing';
import { CvmRemovedEvent } from '../events';
import { CvmReadModelSynchronizer } from '../repositories';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@EventSubscriber(CvmRemovedEvent)
export class CvmRemovedEventSubscriber implements IEventSubscriber {
  constructor(
    private readonly cvmReadModelSynchronizer: CvmReadModelSynchronizer,
    @InjectQueue('tile-computation') private tileComputationQueue: Queue,
  ) {}

  async handle(envelope: EventEnvelope<CvmRemovedEvent>) {
    const aggregateId = envelope.payload.cvmId as string;
    const position = envelope.payload.position as {
      longitude: number;
      latitude: number;
    };

    await this.cvmReadModelSynchronizer.applyRemove(aggregateId);

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
