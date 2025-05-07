import {
  CommandHandler,
  type ICommand,
  type ICommandHandler,
} from '@ocoda/event-sourcing';
import { CvmId } from '../models';
import { CvmEventStoreRepository } from '../repositories';
import { NotFoundError } from 'src/common/models';

export class DownvoteCvmCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly voterLongitude: number,
    public readonly voterLatitude: number,
    public readonly identity: string,
  ) {}
}

@CommandHandler(DownvoteCvmCommand)
export class DownvoteCvmCommandHandler implements ICommandHandler {
  constructor(
    private readonly cvmEventStoreRepository: CvmEventStoreRepository,
  ) {}

  async execute(command: DownvoteCvmCommand): Promise<void> {
    const aggregate = await this.cvmEventStoreRepository.load(
      CvmId.from(command.id),
    );

    if (!aggregate) {
      throw new NotFoundError();
    }

    aggregate.downvote(command.identity);

    await this.cvmEventStoreRepository.save(aggregate);
  }
}
