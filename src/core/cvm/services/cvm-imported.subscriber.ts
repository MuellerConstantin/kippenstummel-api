import {
  EventSubscriber,
  IEventSubscriber,
  EventEnvelope,
} from '@ocoda/event-sourcing';
import { CvmImportedEvent } from '../events';
import { InjectModel } from '@nestjs/mongoose';
import { Cvm } from '../repositories';
import { Model } from 'mongoose';

@EventSubscriber(CvmImportedEvent)
export class CvmImportedEventSubscriber implements IEventSubscriber {
  constructor(@InjectModel(Cvm.name) private readonly cvmModel: Model<Cvm>) {}

  async handle(envelope: EventEnvelope<CvmImportedEvent>) {
    const aggregateId = envelope.payload.cvmId as string;
    const initialScore = envelope.payload.initialScore as number;
    const position = envelope.payload.position as {
      longitude: number;
      latitude: number;
    };

    // Update read model
    await this.updateReadModel(
      aggregateId,
      position.longitude,
      position.latitude,
      initialScore,
    );

    /*
     * Cluster tiles are explicitly not recomputed here. This is because
     * the cluster tile computation is a time-consuming operation and should not
     * be run every time a CVM is imported. Instead the cluster tile computation
     * is scheduled batch-wise after the import finishes.
     */
  }

  async updateReadModel(
    cvmId: string,
    longitude: number,
    latitude: number,
    initialScore?: number,
  ): Promise<Cvm> {
    const result = await this.cvmModel.create({
      aggregateId: cvmId,
      position: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
      score: initialScore ?? 0,
      imported: true,
      markedForDeletion: false,
      markedForDeletionAt: null,
    });

    return result;
  }
}
