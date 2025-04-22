import {
  CommandHandler,
  type ICommand,
  type ICommandHandler,
} from '@ocoda/event-sourcing';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CvmId } from '../models';
import { CvmEventStoreRepository } from '../repositories';
import { Cvm } from '../repositories/schemas';
import { NotFoundError } from 'src/common/models';

export class UpvoteCvmCommand implements ICommand {
  constructor(public readonly id: string) {}
}

@CommandHandler(UpvoteCvmCommand)
export class UpvoteCvmCommandHandler implements ICommandHandler {
  constructor(
    private readonly cvmEventStoreRepository: CvmEventStoreRepository,
    @InjectModel(Cvm.name) private readonly cvmModel: Model<Cvm>,
  ) {}

  async execute(command: UpvoteCvmCommand): Promise<void> {
    const aggregate = await this.cvmEventStoreRepository.load(
      CvmId.from(command.id),
    );

    if (!aggregate) {
      throw new NotFoundError();
    }

    aggregate.upvote();

    await this.cvmEventStoreRepository.save(aggregate);
  }
}
