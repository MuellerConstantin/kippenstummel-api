import {
  CommandHandler,
  type ICommand,
  type ICommandHandler,
} from '@ocoda/event-sourcing';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { CvmId } from '../models';
import { CvmEventStoreRepository } from '../repositories';
import { NotFoundError, OutOfReachError } from 'src/common/models';
import { IdentService } from 'src/common/services';
import { calculateDistanceInKm, constants } from 'src/lib';

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
    private readonly identService: IdentService,
    @InjectQueue('credibility-computation')
    private credibilityComputationQueue: Queue,
  ) {}

  async execute(command: UpvoteCvmCommand): Promise<void> {
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
    if (distanceInKm > constants.NEARBY_CVM_RADIUS) {
      throw new OutOfReachError();
    }

    const credibility = await this.identService.getIdentityCredibility(
      command.identity,
    );

    aggregate.upvote(command.identity, credibility);
    await this.cvmEventStoreRepository.save(aggregate);

    await this.credibilityComputationQueue.add('recompute', {
      identity: command.identity,
      position: {
        longitude: command.voterLongitude,
        latitude: command.voterLatitude,
      },
      action: 'upvote',
    });
  }
}
