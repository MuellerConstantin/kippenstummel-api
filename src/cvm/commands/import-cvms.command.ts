import {
  CommandHandler,
  type ICommand,
  type ICommandHandler,
} from '@ocoda/event-sourcing';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { CvmAggregate, CvmId } from '../models';
import { CvmEventStoreRepository } from '../repositories';
import { Cvm } from '../repositories/schemas';

const NEARBY_RADIUS_IN_METERS = 10;

export class ImportCvmsCommand implements ICommand {
  constructor(
    public readonly cvms: {
      longitude: number;
      latitude: number;
      score: number;
    }[],
  ) {}
}

@CommandHandler(ImportCvmsCommand)
export class ImportCvmsCommandHandler implements ICommandHandler {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly cvmEventStoreRepository: CvmEventStoreRepository,
    @InjectModel(Cvm.name) private readonly cvmModel: Model<Cvm>,
  ) {}

  async execute(command: ImportCvmsCommand): Promise<void> {
    const operations = command.cvms.map(async (cvm) => {
      const result = await this.cvmModel
        .findOne({
          position: {
            $nearSphere: {
              $geometry: {
                type: 'Point',
                coordinates: [cvm.longitude, cvm.latitude],
              },
              $maxDistance: NEARBY_RADIUS_IN_METERS,
            },
          },
        })
        .exec();

      if (!result) {
        const aggregate = CvmAggregate.register(
          cvm.longitude,
          cvm.latitude,
          null,
        );
        await this.cvmEventStoreRepository.save(aggregate);
      } else {
        const aggregate = await this.cvmEventStoreRepository.load(
          CvmId.from(result.id),
        );
        aggregate!.synchronize(cvm.longitude, cvm.latitude, cvm.score);
        await this.cvmEventStoreRepository.save(aggregate!);
      }
    });

    await Promise.allSettled(operations);
  }
}
