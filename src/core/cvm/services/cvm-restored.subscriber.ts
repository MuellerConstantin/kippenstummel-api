import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import {
  EventSubscriber,
  IEventSubscriber,
  EventEnvelope,
} from '@ocoda/event-sourcing';
import { CvmRestoredEvent } from '../events';

@EventSubscriber(CvmRestoredEvent)
export class CvmRestoredEventSubscriber implements IEventSubscriber {
  constructor(
    @InjectQueue('tile-computation') private tileComputationQueue: Queue,
  ) {}

  async handle(envelope: EventEnvelope<CvmRestoredEvent>) {
    const position = envelope.payload.position as {
      longitude: number;
      latitude: number;
    };

    await this.tileComputationQueue.add('rAll', {
      positions: [
        {
          longitude: position.longitude,
          latitude: position.latitude,
        },
      ],
    });

    await this.tileComputationQueue.add('r5p', {
      positions: [
        {
          longitude: position.longitude,
          latitude: position.latitude,
        },
      ],
    });

    await this.tileComputationQueue.add('rN5p', {
      positions: [
        {
          longitude: position.longitude,
          latitude: position.latitude,
        },
      ],
    });

    await this.tileComputationQueue.add('rN8p', {
      positions: [
        {
          longitude: position.longitude,
          latitude: position.latitude,
        },
      ],
    });
  }
}
