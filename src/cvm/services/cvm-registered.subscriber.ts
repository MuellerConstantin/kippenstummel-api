import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import {
  EventSubscriber,
  IEventSubscriber,
  EventEnvelope,
} from '@ocoda/event-sourcing';
import { CvmRegisteredEvent } from '../events';

@EventSubscriber(CvmRegisteredEvent)
export class CvmRegisteredEventSubscriber implements IEventSubscriber {
  constructor(
    @InjectQueue('tile-computation') private tileComputationQueue: Queue,
    @InjectQueue('credibility-computation')
    private credibilityComputationQueue: Queue,
  ) {}

  async handle(envelope: EventEnvelope<CvmRegisteredEvent>) {
    const identity = envelope.payload.identity as string;
    const position = envelope.payload.position as {
      longitude: number;
      latitude: number;
    };

    await this.tileComputationQueue.add('recompute', {
      positions: [
        {
          longitude: position.longitude,
          latitude: position.latitude,
        },
      ],
    });

    await this.credibilityComputationQueue.add('recompute', {
      identity,
      position: {
        longitude: position.longitude,
        latitude: position.latitude,
      },
      action: 'registration',
    });
  }
}
