import {
  CommandHandler,
  type ICommand,
  type ICommandHandler,
} from '@ocoda/event-sourcing';
import { CvmId } from '../models';
import { CvmEventStoreRepository } from '../repositories';
import { NotFoundError } from 'src/common/models';

export class UpvoteCvmCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly voterLongitude: number,
    public readonly voterLatitude: number,
    public readonly identity: string,
  ) {}
}

@CommandHandler(UpvoteCvmCommand)
export class UpvoteCvmCommandHandler implements ICommandHandler {
  constructor(
    private readonly cvmEventStoreRepository: CvmEventStoreRepository,
  ) {}

  async execute(command: UpvoteCvmCommand): Promise<void> {
    const aggregate = await this.cvmEventStoreRepository.load(
      CvmId.from(command.id),
    );

    if (!aggregate) {
      throw new NotFoundError();
    }

    aggregate.upvote(command.identity);

    await this.cvmEventStoreRepository.save(aggregate);
  }
}
