import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import {
  EventSubscriber,
  IEventSubscriber,
  EventEnvelope,
} from '@ocoda/event-sourcing';
import { CvmRepositionedEvent } from '../events';

@EventSubscriber(CvmRepositionedEvent)
export class CvmRepositionedEventSubscriber implements IEventSubscriber {
  constructor(
    @InjectQueue('tile-computation') private tileComputationQueue: Queue,
  ) {}

  async handle(envelope: EventEnvelope<CvmRepositionedEvent>) {
    const oldPosition = envelope.payload.formerPosition as {
      longitude: number;
      latitude: number;
    };
    const newPosition = envelope.payload.repositionedPosition as {
      longitude: number;
      latitude: number;
    };

    /*
     * All affected tiles need to be re-computed. The tiles affected
     * by the new position as well as the tiles of the old position. In
     * theory, the location could be moved to a new tile.
     */

    await this.tileComputationQueue.add('all', {
      positions: [
        {
          longitude: oldPosition.longitude,
          latitude: oldPosition.latitude,
        },
        {
          longitude: newPosition.longitude,
          latitude: newPosition.latitude,
        },
      ],
    });

    await this.tileComputationQueue.add('trusted', {
      positions: [
        {
          longitude: oldPosition.longitude,
          latitude: oldPosition.latitude,
        },
        {
          longitude: newPosition.longitude,
          latitude: newPosition.latitude,
        },
      ],
    });

    await this.tileComputationQueue.add('approved', {
      positions: [
        {
          longitude: oldPosition.longitude,
          latitude: oldPosition.latitude,
        },
        {
          longitude: newPosition.longitude,
          latitude: newPosition.latitude,
        },
      ],
    });
  }
}
