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
import { PiiService } from 'src/common/services';

@EventSubscriber(CvmDownvotedEvent)
export class CvmDownvotedEventSubscriber implements IEventSubscriber {
  constructor(
    @InjectModel(Cvm.name) private readonly cvmModel: Model<Cvm>,
    @InjectQueue('credibility-computation')
    private credibilityComputationQueue: Queue,
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

    const result = await this.cvmModel.findOne({ aggregateId: cvmId }).exec();

    if (!result) {
      return;
    }

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
    }
  }
}
