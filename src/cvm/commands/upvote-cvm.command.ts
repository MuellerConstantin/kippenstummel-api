import {
  CommandHandler,
  type ICommand,
  type ICommandHandler,
} from '@ocoda/event-sourcing';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CvmId } from '../models';
import { CvmEventStoreRepository, Vote } from '../repositories';
import { NotFoundError, OutOfReachError } from 'src/common/models';
import { CredibilityService } from 'src/ident/services';
import { calculateDistanceInKm, constants } from 'src/lib';

export class UpvoteCvmCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly voterLongitude: number,
    public readonly voterLatitude: number,
    public readonly voterIdentity: string,
  ) {}
}

@CommandHandler(UpvoteCvmCommand)
export class UpvoteCvmCommandHandler implements ICommandHandler {
  constructor(
    private readonly cvmEventStoreRepository: CvmEventStoreRepository,
    private readonly credibilityService: CredibilityService,
    @InjectModel(Vote.name) private readonly voteModel: Model<Vote>,
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

    // Ensure voter has not already voted
    const hasVoted = await this.hasVotedRecently(
      command.voterIdentity,
      aggregate.id.value,
    );

    if (hasVoted) {
      return;
    }

    const credibility = await this.credibilityService.getCredibility(
      command.voterIdentity,
    );

    aggregate.upvote(command.voterIdentity, credibility);
    await this.cvmEventStoreRepository.save(aggregate);
  }

  async hasVotedRecently(
    identity: string,
    aggregateId: string,
  ): Promise<boolean> {
    const recentlyLimit = new Date();
    recentlyLimit.setDate(recentlyLimit.getDate() - constants.CVM_VOTE_DELAY);

    const result = await this.voteModel.aggregate([
      {
        $match: {
          identity,
          createdAt: { $gte: recentlyLimit },
        },
      },
      {
        $lookup: {
          from: 'cvms',
          localField: 'cvm',
          foreignField: '_id',
          as: 'cvmDoc',
        },
      },
      {
        $unwind: '$cvmDoc',
      },
      {
        $match: {
          'cvmDoc.aggregate_id': aggregateId,
        },
      },
      {
        $limit: 1,
      },
      {
        $project: { _id: 1 },
      },
    ]);

    return result.length > 0;
  }
}
