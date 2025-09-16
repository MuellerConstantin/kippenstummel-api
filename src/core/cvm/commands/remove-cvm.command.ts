import {
  CommandHandler,
  type ICommand,
  type ICommandHandler,
} from '@ocoda/event-sourcing';
import { CvmId } from '../models';
import { CvmEventStoreRepository } from '../repositories';
import { NotFoundError } from 'src/lib/models';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export class RemoveCvmCommand implements ICommand {
  constructor(public readonly id: string) {}
}

@CommandHandler(RemoveCvmCommand)
export class RemoveCvmCommandHandler implements ICommandHandler {
  constructor(
    private readonly cvmEventStoreRepository: CvmEventStoreRepository,
    @InjectQueue('tile-computation') private tileComputationQueue: Queue,
  ) {}

  async execute(command: RemoveCvmCommand): Promise<void> {
    const aggregate = await this.cvmEventStoreRepository.load(
      CvmId.from(command.id),
    );

    if (!aggregate) {
      throw new NotFoundError();
    }

    aggregate.remove();
    await this.cvmEventStoreRepository.save(aggregate);

    // Recompute tiles outside of event lifecycle to allow batch processing
    await this.tileComputationQueue.add('precompute', {
      positions: [
        {
          longitude: aggregate.longitude,
          latitude: aggregate.latitude,
        },
      ],
    });
  }
}
