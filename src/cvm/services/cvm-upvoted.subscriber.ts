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
import { CvmUpvotedEvent } from '../events';

@EventSubscriber(CvmUpvotedEvent)
export class CvmUpvotedEventSubscriber implements IEventSubscriber {
  constructor(
    @InjectModel(Cvm.name) private readonly cvmModel: Model<Cvm>,
    @InjectQueue('credibility-computation')
    private credibilityComputationQueue: Queue,
  ) {}

  async handle(envelope: EventEnvelope<CvmUpvotedEvent>) {
    const cvmId = envelope.payload.cvmId as string;
    const identity = envelope.payload.voterIdentity as string;

    const result = await this.cvmModel.findOne({ aggregate_id: cvmId }).exec();

    if (!result) {
      return;
    }

    const position = {
      longitude: result.position.coordinates[0],
      latitude: result.position.coordinates[1],
    };

    await this.credibilityComputationQueue.add('recompute', {
      identity,
      position: {
        longitude: position.longitude,
        latitude: position.latitude,
      },
      action: 'upvote',
    });
  }
}
