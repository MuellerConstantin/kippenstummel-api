import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import {
  EventSubscriber,
  IEventSubscriber,
  EventEnvelope,
} from '@ocoda/event-sourcing';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cvm } from '../repositories/schemas';
import { CvmDownvotedEvent } from '../events';
import { PiiService } from 'src/infrastructure/pii/services';
import { CvmReadModelSynchronizer } from '../repositories';

@EventSubscriber(CvmDownvotedEvent)
export class CvmDownvotedEventSubscriber implements IEventSubscriber {
  constructor(
    private readonly cvmReadModelSynchronizer: CvmReadModelSynchronizer,
    @InjectModel(Cvm.name) private readonly cvmModel: Model<Cvm>,
    @InjectQueue('credibility-computation')
    private credibilityComputationQueue: Queue,
    @InjectQueue('karma-computation')
    private karmaComputationQueue: Queue,
    private readonly piiService: PiiService,
  ) {}

  async handle(envelope: EventEnvelope<CvmDownvotedEvent>) {
    const cvmId = envelope.payload.cvmId as string;
    const tokenizedIdentity = envelope.payload.voterIdentity as string;
    const scoreChange = envelope.payload.impact as number;

    /*
     * Due to GDPR, PII is tokenized. This step must be reversed when reading,
     * if still possible and the authority has not already been deleted.
     */

    const untokenizedIdentity = (await this.piiService.untokenizePii(
      tokenizedIdentity,
    )) as string | null;

    await this.cvmReadModelSynchronizer.applyDownvote(
      cvmId,
      untokenizedIdentity,
      scoreChange,
    );

    const result = await this.cvmModel.findOne({ aggregateId: cvmId }).exec();

    const position = {
      longitude: result!.position.coordinates[0],
      latitude: result!.position.coordinates[1],
    };

    if (untokenizedIdentity) {
      await this.credibilityComputationQueue.add('recompute', {
        identity: untokenizedIdentity,
        position: {
          longitude: position.longitude,
          latitude: position.latitude,
        },
        action: 'downvote',
      });

      const isSelfInteraction = untokenizedIdentity === result!.registeredBy;

      await this.karmaComputationQueue.add('recompute', {
        targetIdentity: untokenizedIdentity,
        cvmId,
        action: 'downvote_cast',
        isSelfInteraction,
      });

      if (result!.registeredBy) {
        await this.karmaComputationQueue.add('recompute', {
          targetIdentity: result!.registeredBy,
          cvmId,
          action: 'downvote_received',
          isSelfInteraction: false,
        });
      }
    }
  }
}
