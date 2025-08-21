import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import {
  EventSubscriber,
  IEventSubscriber,
  EventEnvelope,
} from '@ocoda/event-sourcing';
import { CvmRegisteredEvent } from '../events';
import { PiiService } from 'src/infrastructure/pii/services';

@EventSubscriber(CvmRegisteredEvent)
export class CvmRegisteredEventSubscriber implements IEventSubscriber {
  constructor(
    @InjectQueue('tile-computation') private tileComputationQueue: Queue,
    @InjectQueue('credibility-computation')
    private credibilityComputationQueue: Queue,
    private readonly piiService: PiiService,
  ) {}

  async handle(envelope: EventEnvelope<CvmRegisteredEvent>) {
    const tokenizedIdentity = envelope.payload.creatorIdentity as string;
    const position = envelope.payload.position as {
      longitude: number;
      latitude: number;
    };

    /*
     * Due to GDPR, PII is tokenized. This step must be reversed when reading,
     * if still possible and the authority has not already been deleted.
     */

    const untokenizedIdentity = (await this.piiService.untokenizePii(
      tokenizedIdentity,
    )) as string | null;

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

    if (untokenizedIdentity) {
      await this.credibilityComputationQueue.add('recompute', {
        identity: untokenizedIdentity,
        position: {
          longitude: position.longitude,
          latitude: position.latitude,
        },
        action: 'registration',
      });
    }
  }
}
