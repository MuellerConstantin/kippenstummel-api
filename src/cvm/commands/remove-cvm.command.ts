import {
  CommandHandler,
  type ICommand,
  type ICommandHandler,
} from '@ocoda/event-sourcing';
import { CvmId } from '../models';
import { CvmEventStoreRepository } from '../repositories';
import { NotFoundError } from 'src/common/models';

export class RemoveCvmCommand implements ICommand {
  constructor(public readonly id: string) {}
}

@CommandHandler(RemoveCvmCommand)
export class RemoveCvmCommandHandler implements ICommandHandler {
  constructor(
    private readonly cvmEventStoreRepository: CvmEventStoreRepository,
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
