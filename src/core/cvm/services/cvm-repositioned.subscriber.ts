import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import {
  EventSubscriber,
  IEventSubscriber,
  EventEnvelope,
} from '@ocoda/event-sourcing';
import { CvmRepositionedEvent } from '../events';
import { Cvm, Repositioning } from '../repositories';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PiiService } from 'src/infrastructure/pii/services';
import { InconsistentReadModelError } from 'src/lib/models';

@EventSubscriber(CvmRepositionedEvent)
export class CvmRepositionedEventSubscriber implements IEventSubscriber {
  constructor(
    @InjectModel(Cvm.name) private readonly cvmModel: Model<Cvm>,
    @InjectModel(Repositioning.name)
    private readonly repositioningModel: Model<Repositioning>,
    @InjectQueue('tile-computation') private tileComputationQueue: Queue,
    private readonly piiService: PiiService,
  ) {}

  async handle(envelope: EventEnvelope<CvmRepositionedEvent>) {
    const tokenizedIdentity = envelope.payload.editorIdentity as string;
    const oldPosition = envelope.payload.formerPosition as {
      longitude: number;
      latitude: number;
    };
    const newPosition = envelope.payload.repositionedPosition as {
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
    const result = await this.cvmModel
      .findOneAndUpdate(
        {
          aggregateId: envelope.payload.cvmId as string,
        },
        {
          $set: {
            position: {
              type: 'Point',
              coordinates: [newPosition.longitude, newPosition.latitude],
            },
          },
        },
        { new: true },
      )
      .exec();

    if (!result) {
      throw new InconsistentReadModelError();
    }

    await this.repositioningModel.create({
      identity: untokenizedIdentity,
      cvm: result._id,
      position: {
        type: 'Point',
        coordinates: [newPosition.longitude, newPosition.latitude],
      },
    });

    /*
     * All affected tiles need to be re-computed. The tiles affected
     * by the new position as well as the tiles of the old position. In
     * theory, the location could be moved to a new tile.
     */

    await this.tileComputationQueue.add('rAll+r5p+rN5p+rN8p', {
      positions: [
        {
          longitude: oldPosition.longitude,
          latitude: oldPosition.latitude,
        },
        {
          longitude: newPosition.longitude,
          latitude: newPosition.latitude,
        },
      ],
    });
  }
}
