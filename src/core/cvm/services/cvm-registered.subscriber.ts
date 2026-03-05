import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import {
  EventSubscriber,
  IEventSubscriber,
  EventEnvelope,
} from '@ocoda/event-sourcing';
import { CvmRegisteredEvent } from '../events';
import { PiiService } from 'src/infrastructure/pii/services';
import { CvmReadModelSynchronizer } from '../repositories';

@EventSubscriber(CvmRegisteredEvent)
export class CvmRegisteredEventSubscriber implements IEventSubscriber {
  constructor(
    private readonly cvmReadModelSynchronizer: CvmReadModelSynchronizer,
    @InjectQueue('tile-computation') private tileComputationQueue: Queue,
    @InjectQueue('credibility-computation')
    private credibilityComputationQueue: Queue,
    @InjectQueue('karma-computation')
    private karmaComputationQueue: Queue,
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

    // Update read model
    await this.cvmReadModelSynchronizer.applyRegister(
      envelope.payload.cvmId as string,
      position.longitude,
      position.latitude,
      untokenizedIdentity,
    );

    await this.tileComputationQueue.add('precompute', {
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

      await this.karmaComputationQueue.add('recompute', {
        targetIdentity: untokenizedIdentity,
        cvmId: envelope.payload.cvmId as string,
        action: 'registration',
      });
    }
  }
}
