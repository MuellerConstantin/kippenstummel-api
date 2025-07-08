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

    await this.tileComputationQueue.add('all', {
      positions: [
        {
          longitude: position.longitude,
          latitude: position.latitude,
        },
      ],
    });

    await this.tileComputationQueue.add('trusted', {
      positions: [
        {
          longitude: position.longitude,
          latitude: position.latitude,
        },
      ],
    });

    await this.tileComputationQueue.add('approved', {
      positions: [
        {
          longitude: position.longitude,
          latitude: position.latitude,
        },
      ],
    });
  }
}
