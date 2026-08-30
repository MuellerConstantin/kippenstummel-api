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
import type { CvmImportSource } from '../models';
import { CvmEventStoreRepository } from '../repositories';
import { Cvm } from '../repositories/schemas';
import { constants, isWithinServiceArea } from 'src/lib';
import { Logger } from '@nestjs/common';

export class ImportCvmsCommand implements ICommand {
  constructor(
    public readonly cvms: {
      longitude: number;
      latitude: number;
      score?: number;
    }[],
    /**
     * The declared origin of the imported data, recorded on both newly imported and
     * synchronized CVMs.
     */
    public readonly source: CvmImportSource,
  ) {}
}

@CommandHandler(ImportCvmsCommand)
export class ImportCvmsCommandHandler implements ICommandHandler {
  private readonly logger = new Logger(ImportCvmsCommandHandler.name);

  constructor(
    private readonly cvmEventStoreRepository: CvmEventStoreRepository,
    @InjectModel(Cvm.name) private readonly cvmModel: Model<Cvm>,
    @InjectQueue('tile-computation') private tileComputationQueue: Queue,
  ) {}

  async execute(command: ImportCvmsCommand): Promise<void> {
    /*
     * An import is a bulk operation, so entries outside the covered area are
     * dropped rather than failing the whole job — one stray record should not
     * cost the other thousands. They are counted out loud, because a region
     * that yields nothing but skipped entries is a mistake worth noticing.
     */
    const cvms = command.cvms.filter((cvm) =>
      isWithinServiceArea(cvm.longitude, cvm.latitude),
    );

    const skipped = command.cvms.length - cvms.length;

    if (skipped > 0) {
      this.logger.warn(
        `Skipped ${skipped} of ${command.cvms.length} imported CVMs outside the covered service area`,
      );
    }

    if (cvms.length === 0) {
      return;
    }

    const operations = cvms.map(async (cvm) => {
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
          command.source,
          cvm.score,
        );
        await this.cvmEventStoreRepository.save(aggregate);
      } else {
        const aggregate = await this.cvmEventStoreRepository.load(
          CvmId.from(result.aggregateId),
        );
        aggregate!.synchronize({
          longitude: cvm.longitude,
          latitude: cvm.latitude,
          score: cvm.score,
          source: command.source,
        });
        await this.cvmEventStoreRepository.save(aggregate!);
      }
    });

    await Promise.allSettled(operations);

    /*
     * Recompute tiles outside of event lifecycle to allow batch processing. Batch processing is
     * needed to avoid both too many individual jobs and one job that's too large. A job that's
     * too large will cause the NodeJS event queue to crash.
     */

    const chunkArray = <T>(arr: T[], size: number): T[][] =>
      arr.reduce<T[][]>((acc, _, i) => {
        if (i % size === 0) acc.push(arr.slice(i, i + size));
        return acc;
      }, []);

    const batches = chunkArray(cvms, 1000);

    for (const batch of batches) {
      await this.tileComputationQueue.add('precompute', {
        positions: batch.map((cvm) => ({
          longitude: cvm.longitude,
          latitude: cvm.latitude,
        })),
      });
    }
  }
}
