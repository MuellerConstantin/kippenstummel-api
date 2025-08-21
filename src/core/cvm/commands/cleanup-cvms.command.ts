import {
  CommandHandler,
  type ICommand,
  type ICommandHandler,
} from '@ocoda/event-sourcing';
import { CvmId } from '../models';
import { Cvm, CvmEventStoreRepository } from '../repositories';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

export class CleanupCvmsCommand implements ICommand {
  constructor(public readonly markedForDeletionSince: Date) {}
}

@CommandHandler(CleanupCvmsCommand)
export class CleanupCvmsCommandHandler implements ICommandHandler {
  constructor(
    @InjectModel(Cvm.name) private readonly cvmModel: Model<Cvm>,
    private readonly cvmEventStoreRepository: CvmEventStoreRepository,
    @InjectQueue('tile-computation') private tileComputationQueue: Queue,
  ) {}

  async execute(command: CleanupCvmsCommand): Promise<void> {
    const cvms = await this.cvmModel.find({
      markedForDeletionSince: {
        $lt: command.markedForDeletionSince,
      },
      markedForDeletion: true,
    });

    if (!cvms.length) {
      return;
    }

    const operations = cvms.map(async (cvm) => {
      const aggregate = await this.cvmEventStoreRepository.load(
        CvmId.from(cvm.aggregateId),
      );

      if (aggregate) {
        aggregate.remove();
        await this.cvmEventStoreRepository.save(aggregate);
      }

      return aggregate;
    });

    await Promise.allSettled(operations);

    // Recompute tiles outside of event lifecycle to allow batch processing
    await this.tileComputationQueue.add('rAll', {
      positions: [
        ...cvms.map((cvm) => ({
          longitude: cvm.position.coordinates[0],
          latitude: cvm.position.coordinates[1],
        })),
      ],
    });

    await this.tileComputationQueue.add('r5p', {
      positions: [
        ...cvms.map((cvm) => ({
          longitude: cvm.position.coordinates[0],
          latitude: cvm.position.coordinates[1],
        })),
      ],
    });

    await this.tileComputationQueue.add('rN5p', {
      positions: [
        ...cvms.map((cvm) => ({
          longitude: cvm.position.coordinates[0],
          latitude: cvm.position.coordinates[1],
        })),
      ],
    });

    await this.tileComputationQueue.add('rN8p', {
      positions: [
        ...cvms.map((cvm) => ({
          longitude: cvm.position.coordinates[0],
          latitude: cvm.position.coordinates[1],
        })),
      ],
    });
  }
}
