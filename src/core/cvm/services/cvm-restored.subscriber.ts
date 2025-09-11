import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import {
  EventSubscriber,
  IEventSubscriber,
  EventEnvelope,
} from '@ocoda/event-sourcing';
import { CvmRestoredEvent } from '../events';
import { InjectModel } from '@nestjs/mongoose';
import { Cvm } from '../repositories';
import { Model } from 'mongoose';

@EventSubscriber(CvmRestoredEvent)
export class CvmRestoredEventSubscriber implements IEventSubscriber {
  constructor(
    @InjectModel(Cvm.name) private readonly cvmModel: Model<Cvm>,
    @InjectQueue('tile-computation') private tileComputationQueue: Queue,
  ) {}

  async handle(envelope: EventEnvelope<CvmRestoredEvent>) {
    const position = envelope.payload.position as {
      longitude: number;
      latitude: number;
    };

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
      registeredBy: null,
    });

    await this.tileComputationQueue.add('rAll+r5p+r0P+rN8p', {
      positions: [
        {
          longitude: position.longitude,
          latitude: position.latitude,
        },
      ],
    });
  }
}
