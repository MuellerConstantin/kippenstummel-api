import {
  CommandHandler,
  type ICommand,
  type ICommandHandler,
} from '@ocoda/event-sourcing';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CvmId } from '../models';
import { CvmEventStoreRepository } from '../repositories';
import { Cvm } from '../repositories/schemas';
import { NotFoundError } from 'src/common/models';

export class RemoveCvmCommand implements ICommand {
  constructor(public readonly id: string) {}
}

@CommandHandler(RemoveCvmCommand)
export class RemoveCvmCommandHandler implements ICommandHandler {
  constructor(
    private readonly cvmEventStoreRepository: CvmEventStoreRepository,
    @InjectModel(Cvm.name) private readonly cvmModel: Model<Cvm>,
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
  }
}
