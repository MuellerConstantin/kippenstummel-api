import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import {
  EventSubscriber,
  IEventSubscriber,
  EventEnvelope,
} from '@ocoda/event-sourcing';
import { CvmRegisteredEvent } from '../events';
import { PiiService } from 'src/infrastructure/pii/services';
import { InjectModel } from '@nestjs/mongoose';
import { Cvm } from '../repositories';
import { Model } from 'mongoose';

@EventSubscriber(CvmRegisteredEvent)
export class CvmRegisteredEventSubscriber implements IEventSubscriber {
  constructor(
    @InjectModel(Cvm.name) private readonly cvmModel: Model<Cvm>,
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

    // Update read model
    await this.cvmModel.create({
      aggregateId: envelope.payload.cvmId as string,
      position: {
        type: 'Point',
        coordinates: [position.longitude, position.latitude],
      },
      score: 0,
      imported: false,
      markedForDeletion: false,
      markedForDeletionAt: null,
      registeredBy: tokenizedIdentity,
    });

    await this.tileComputationQueue.add('rAll+r5p+rN5p+rN8p', {
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
