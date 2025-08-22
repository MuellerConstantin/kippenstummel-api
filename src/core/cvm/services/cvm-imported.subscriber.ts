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
      imported: true,
      markedForDeletion: false,
      markedForDeletionAt: null,
    });

    /*
     * Cluster tiles are explicitly not recomputed here. This is because
     * the cluster tile computation is a time-consuming operation and should not
     * be run every time a CVM is imported. Instead the cluster tile computation
     * is scheduled batch-wise after the import finishes.
     */
  }
}
