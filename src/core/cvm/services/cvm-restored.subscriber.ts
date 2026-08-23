import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import {
  EventSubscriber,
  IEventSubscriber,
  EventEnvelope,
} from '@ocoda/event-sourcing';
import { CvmRestoredEvent } from '../events';
import { CvmReadModelSynchronizer } from '../repositories';
import type { CvmSource } from '../models';

@EventSubscriber(CvmRestoredEvent)
export class CvmRestoredEventSubscriber implements IEventSubscriber {
  constructor(
    private readonly cvmReadModelSynchronizer: CvmReadModelSynchronizer,
    @InjectQueue('tile-computation') private tileComputationQueue: Queue,
  ) {}

  async handle(envelope: EventEnvelope<CvmRestoredEvent>) {
    const aggregateId = envelope.payload.cvmId as string;
    const source = envelope.payload.source as CvmSource;
    const position = envelope.payload.position as {
      longitude: number;
      latitude: number;
    };

    // Update read model
    await this.cvmReadModelSynchronizer.applyRestore(
      aggregateId,
      position.longitude,
      position.latitude,
      source,
    );

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
