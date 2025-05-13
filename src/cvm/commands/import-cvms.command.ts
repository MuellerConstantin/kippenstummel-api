import {
  CommandHandler,
  type ICommand,
  type ICommandHandler,
} from '@ocoda/event-sourcing';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CvmAggregate, CvmId } from '../models';
import { CvmEventStoreRepository } from '../repositories';
import { Cvm } from '../repositories/schemas';
import { constants } from 'src/lib';

export class ImportCvmsCommand implements ICommand {
  constructor(
    public readonly cvms: {
      longitude: number;
      latitude: number;
      score?: number;
    }[],
  ) {}
}

@CommandHandler(ImportCvmsCommand)
export class ImportCvmsCommandHandler implements ICommandHandler {
  constructor(
    private readonly cvmEventStoreRepository: CvmEventStoreRepository,
    @InjectModel(Cvm.name) private readonly cvmModel: Model<Cvm>,
    @InjectQueue('tile-computation') private tileComputationQueue: Queue,
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
              $maxDistance: constants.SAME_CVM_RADIUS,
            },
          },
        })
        .exec();

      if (!result) {
        const aggregate = CvmAggregate.import(
          cvm.longitude,
          cvm.latitude,
          cvm.score,
        );
        await this.cvmEventStoreRepository.save(aggregate);
      } else {
        const aggregate = await this.cvmEventStoreRepository.load(
          CvmId.from(result.aggregate_id),
        );
        aggregate!.synchronize({
          longitude: cvm.longitude,
          latitude: cvm.latitude,
          score: cvm.score,
        });
        await this.cvmEventStoreRepository.save(aggregate!);
      }
    });

    await Promise.allSettled(operations);

    // Recompute tiles outside of event lifecycle to allow batch processing
    await this.tileComputationQueue.add('recompute', {
      positions: [
        ...command.cvms.map((cvm) => ({
          longitude: cvm.longitude,
          latitude: cvm.latitude,
        })),
      ],
    });
  }
}
