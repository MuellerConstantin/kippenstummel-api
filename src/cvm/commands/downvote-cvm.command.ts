import { Logger } from '@nestjs/common';
import {
  CommandHandler,
  type ICommand,
  type ICommandHandler,
} from '@ocoda/event-sourcing';
import { CvmId } from '../models';
import { CvmEventStoreRepository } from '../repositories';
import { NotFoundError, OutOfReachError } from '../../common/models';
import { IdentService } from '../../common/services';
import { calculateDistanceInKm } from '../../lib';

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
    private readonly identService: IdentService,
    private readonly logger: Logger,
  ) {}

  async execute(command: DownvoteCvmCommand): Promise<void> {
    const aggregate = await this.cvmEventStoreRepository.load(
      CvmId.from(command.id),
    );

    if (!aggregate) {
      throw new NotFoundError();
    }

    const distanceInKm = calculateDistanceInKm(
      {
        longitude: aggregate.longitude,
        latitude: aggregate.latitude,
      },
      {
        longitude: command.voterLongitude,
        latitude: command.voterLatitude,
      },
    );

    // Ensure voter is not too far away
    if (distanceInKm > 0.5) {
      throw new OutOfReachError();
    }

    const downvoted = aggregate.downvote(command.identity);

    await this.cvmEventStoreRepository.save(aggregate);

    if (downvoted) {
      this.identService
        .updateIdentityInfo(
          command.identity,
          {
            longitude: command.voterLongitude,
            latitude: command.voterLatitude,
          },
          'downvote',
        )
        .catch((err: Error) =>
          this.logger.error('Failed to update identity info', err.stack),
        );
    }
  }
}
