import {
  CommandHandler,
  type ICommand,
  type ICommandHandler,
} from '@ocoda/event-sourcing';
import { CvmAggregate } from '../models';
import { CvmEventStoreRepository } from '../repositories';

export class RegisterCvmCommand implements ICommand {
  constructor(
    public readonly longitude: number,
    public readonly latitude: number,
  ) {}
}

@CommandHandler(RegisterCvmCommand)
export class RegisterCvmCommandHandler implements ICommandHandler {
  constructor(
    private readonly cvmEventStoreRepository: CvmEventStoreRepository,
  ) {}

  async execute(command: RegisterCvmCommand): Promise<void> {
    const aggregate = CvmAggregate.register(
      command.longitude,
      command.latitude,
    );

    await this.cvmEventStoreRepository.save(aggregate);
  }
}
