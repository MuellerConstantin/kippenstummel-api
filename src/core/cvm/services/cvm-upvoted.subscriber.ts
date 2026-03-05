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
import { CvmUpvotedEvent } from '../events';
import { PiiService } from 'src/infrastructure/pii/services';
import { InconsistentReadModelError } from 'src/lib/models';

@EventSubscriber(CvmUpvotedEvent)
export class CvmUpvotedEventSubscriber implements IEventSubscriber {
  constructor(
    @InjectModel(Cvm.name) private readonly cvmModel: Model<Cvm>,
    @InjectModel(Vote.name) private readonly voteModel: Model<Vote>,
    @InjectQueue('credibility-computation')
    private credibilityComputationQueue: Queue,
    @InjectQueue('karma-computation')
    private karmaComputationQueue: Queue,
    private readonly piiService: PiiService,
  ) {}

  async handle(envelope: EventEnvelope<CvmUpvotedEvent>) {
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

    const result = await this.updateReadModel(
      cvmId,
      untokenizedIdentity,
      scoreChange,
    );

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
        action: 'upvote',
      });

      const isSelfInteraction = untokenizedIdentity === result.registeredBy;

      await this.karmaComputationQueue.add('recompute', {
        targetIdentity: untokenizedIdentity,
        cvmId,
        action: 'upvote_cast',
        isSelfInteraction,
      });

      if (result.registeredBy) {
        await this.karmaComputationQueue.add('recompute', {
          targetIdentity: result.registeredBy,
          cvmId,
          action: 'upvote_received',
          isSelfInteraction,
        });
      }
    }
  }

  async updateReadModel(
    cvmId: string,
    voterIdentity: string | null,
    scoreChange: number,
  ): Promise<Cvm> {
    const result = await this.cvmModel
      .findOneAndUpdate(
        { aggregateId: cvmId },
        {
          $inc: { score: scoreChange },
        },
        { new: true },
      )
      .exec();

    if (!result) {
      throw new InconsistentReadModelError();
    }

    await this.voteModel.create({
      identity: voterIdentity,
      cvm: result._id,
      impact: scoreChange,
      type: 'upvote',
    });

    return result;
  }
}
