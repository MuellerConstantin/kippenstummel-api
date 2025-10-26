import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import {
  EventSubscriber,
  IEventSubscriber,
  EventEnvelope,
} from '@ocoda/event-sourcing';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cvm, Vote } from '../repositories/schemas';
import { CvmDownvotedEvent } from '../events';
import { PiiService } from 'src/infrastructure/pii/services';
import { InconsistentReadModelError } from 'src/lib/models';

@EventSubscriber(CvmDownvotedEvent)
export class CvmDownvotedEventSubscriber implements IEventSubscriber {
  constructor(
    @InjectModel(Cvm.name) private readonly cvmModel: Model<Cvm>,
    @InjectModel(Vote.name) private readonly voteModel: Model<Vote>,
    @InjectQueue('credibility-computation')
    private credibilityComputationQueue: Queue,
    @InjectQueue('karma-computation')
    private karmaComputationQueue: Queue,
    private readonly piiService: PiiService,
  ) {}

  async handle(envelope: EventEnvelope<CvmDownvotedEvent>) {
    const cvmId = envelope.payload.cvmId as string;
    const tokenizedIdentity = envelope.payload.voterIdentity as string;

    /*
     * Due to GDPR, PII is tokenized. This step must be reversed when reading,
     * if still possible and the authority has not already been deleted.
     */

    const untokenizedIdentity = (await this.piiService.untokenizePii(
      tokenizedIdentity,
    )) as string | null;

    // Update read model
    const result = await this.cvmModel
      .findOneAndUpdate(
        { aggregateId: cvmId },
        {
          $inc: { score: -envelope.payload.impact },
        },
        { new: true },
      )
      .exec();

    if (!result) {
      throw new InconsistentReadModelError();
    }

    await this.voteModel.create({
      identity: untokenizedIdentity,
      cvm: result._id,
      impact: envelope.payload.impact as number,
      type: 'downvote',
    });

    const position = {
      longitude: result.position.coordinates[0],
      latitude: result.position.coordinates[1],
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

      await this.karmaComputationQueue.add('recompute', {
        targetIdentity: untokenizedIdentity,
        cvmId,
        action: 'downvote_cast',
      });

      if (result.registeredBy) {
        const untokenizedRegisteredBy = (await this.piiService.untokenizePii(
          result.registeredBy,
        )) as string | null;

        if (untokenizedRegisteredBy) {
          await this.karmaComputationQueue.add('recompute', {
            targetIdentity: untokenizedRegisteredBy,
            cvmId,
            action: 'downvote_received',
          });
        }
      }
    }
  }
}
