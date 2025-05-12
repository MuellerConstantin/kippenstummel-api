import { Logger } from '@nestjs/common';
import {
  CommandHandler,
  type ICommand,
  type ICommandHandler,
} from '@ocoda/event-sourcing';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CvmAggregate, CvmId } from '../models';
import { CvmEventStoreRepository } from '../repositories';
import { Cvm } from '../repositories/schemas';
import { CvmTileService } from '../services';
import { constants } from '../../lib';

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
    private readonly cvmTileService: CvmTileService,
    private readonly logger: Logger,
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
        const aggregate = CvmAggregate.register(
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

    this.cvmTileService
      .updateTilesByPositions(command.cvms)
      .catch((err: Error) =>
        this.logger.error('Failed to update tiles', err.stack),
      );
  }
}
