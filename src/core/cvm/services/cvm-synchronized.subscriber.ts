import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import {
  EventSubscriber,
  IEventSubscriber,
  EventEnvelope,
} from '@ocoda/event-sourcing';
import { CvmSynchronizedEvent } from '../events';
import { Cvm, Repositioning } from '../repositories';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PiiService } from 'src/infrastructure/pii/services';
import { InconsistentReadModelError } from 'src/lib/models';

@EventSubscriber(CvmSynchronizedEvent)
export class CvmSynchronizedEventSubscriber implements IEventSubscriber {
  constructor(
    @InjectModel(Cvm.name) private readonly cvmModel: Model<Cvm>,
    @InjectModel(Repositioning.name)
    private readonly repositioningModel: Model<Repositioning>,
    @InjectQueue('tile-computation') private tileComputationQueue: Queue,
    private readonly piiService: PiiService,
  ) {}

  async handle(envelope: EventEnvelope<CvmSynchronizedEvent>) {
    const aggregateId = envelope.payload.cvmId as string;
    const forcedScore = envelope.payload.forcedScore as number;
    const forcedPosition = envelope.payload.position as {
      longitude: number;
      latitude: number;
    };

    await this.updateReadModel(
      aggregateId,
      forcedPosition.longitude,
      forcedPosition.latitude,
      forcedScore,
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
    forcedScore?: number,
  ): Promise<Cvm> {
    const result = await this.cvmModel.findOneAndUpdate(
      { aggregateId: cvmId },
      {
        $set: {
          score: forcedScore,
          position: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
        },
      },
      { new: true },
    );

    if (!result) {
      throw new InconsistentReadModelError();
    }

    return result;
  }
}
