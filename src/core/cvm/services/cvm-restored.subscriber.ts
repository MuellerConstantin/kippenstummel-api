import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  EventSubscriber,
  IEventSubscriber,
  EventEnvelope,
} from '@ocoda/event-sourcing';
import { CvmRestoredEvent } from '../events';
import { CvmReadModelReplayer } from '../repositories';
import { Cvm } from '../repositories/schemas';
import { CvmId } from '../models';

@EventSubscriber(CvmRestoredEvent)
export class CvmRestoredEventSubscriber implements IEventSubscriber {
  constructor(
    private readonly cvmReadModelReplayer: CvmReadModelReplayer,
    @InjectModel(Cvm.name) private readonly cvmModel: Model<Cvm>,
    @InjectQueue('tile-computation') private tileComputationQueue: Queue,
  ) {}

  async handle(envelope: EventEnvelope<CvmRestoredEvent>) {
    const aggregateId = envelope.payload.cvmId as string;

    /*
     * The removal deleted the read model entry, so a restore has to build it
     * again. The entry holds fields no single event carries.
     */
    await this.cvmReadModelReplayer.replay(CvmId.from(aggregateId));

    // The position is read back off the entry the replay has just written
    const result = await this.cvmModel.findOne({ aggregateId }).exec();

    await this.tileComputationQueue.add('precompute', {
      positions: [
        {
          longitude: result!.position.coordinates[0],
          latitude: result!.position.coordinates[1],
        },
      ],
    });
  }
}
