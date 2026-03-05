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
    const aggregateId = envelope.payload.cvmId as string;
    const position = envelope.payload.position as {
      longitude: number;
      latitude: number;
    };

    // Update read model
    await this.updateReadModel(
      aggregateId,
      position.longitude,
      position.latitude,
    );

    await this.tileComputationQueue.add('precompute', {
      positions: [
        {
          longitude: position.longitude,
          latitude: position.latitude,
        },
      ],
    });
  }

  async updateReadModel(
    cvmId: string,
    longitude: number,
    latitude: number,
  ): Promise<Cvm> {
    const result = await this.cvmModel.create({
      aggregateId: cvmId,
      position: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
      score: 0,
      imported: false,
      markedForDeletion: false,
      markedForDeletionAt: null,
      registeredBy: null,
    });

    return result;
  }
}
