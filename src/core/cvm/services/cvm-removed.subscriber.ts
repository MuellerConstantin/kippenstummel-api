import {
  EventSubscriber,
  IEventSubscriber,
  EventEnvelope,
} from '@ocoda/event-sourcing';
import { CvmRemovedEvent } from '../events';
import { Cvm, Report, Repositioning, Vote } from '../repositories';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@EventSubscriber(CvmRemovedEvent)
export class CvmRemovedEventSubscriber implements IEventSubscriber {
  constructor(
    @InjectModel(Cvm.name) private readonly cvmModel: Model<Cvm>,
    @InjectModel(Vote.name) private readonly voteModel: Model<Vote>,
    @InjectModel(Repositioning.name)
    private readonly repositioningModel: Model<Repositioning>,
    @InjectModel(Report.name) private readonly reportModel: Model<Report>,
    @InjectQueue('tile-computation') private tileComputationQueue: Queue,
  ) {}

  async handle(envelope: EventEnvelope<CvmRemovedEvent>) {
    const position = envelope.payload.position as {
      longitude: number;
      latitude: number;
    };

    const documentId = (
      await this.cvmModel.findOne({
        aggregateId: envelope.payload.cvmId as string,
      })
    )?._id;

    await this.voteModel.deleteMany({ cvm: documentId });

    await this.reportModel.deleteMany({ cvm: documentId });

    await this.repositioningModel.deleteMany({ cvm: documentId });

    await this.cvmModel.deleteOne({
      aggregateId: envelope.payload.cvmId as string,
    });

    await this.tileComputationQueue.add('rAll+r5p+rN5p+rN8p', {
      positions: [
        {
          longitude: position.longitude,
          latitude: position.latitude,
        },
      ],
    });
  }
}
