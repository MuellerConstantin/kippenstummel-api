import {
  CommandHandler,
  type ICommand,
  type ICommandHandler,
} from '@ocoda/event-sourcing';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CvmAggregate, CvmId } from '../models';
import { CvmEventStoreRepository, Cvm, Vote } from '../repositories';
import { constants } from 'src/lib';

export class RegisterCvmCommand implements ICommand {
  constructor(
    public readonly longitude: number,
    public readonly latitude: number,
    public readonly creatorIdentity: string,
  ) {}
}

@CommandHandler(RegisterCvmCommand)
export class RegisterCvmCommandHandler implements ICommandHandler {
  constructor(
    private readonly cvmEventStoreRepository: CvmEventStoreRepository,
    @InjectModel(Cvm.name) private readonly cvmModel: Model<Cvm>,
    @InjectModel(Vote.name) private readonly voteModel: Model<Vote>,
  ) {}

  async execute(command: RegisterCvmCommand): Promise<void> {
    const result = await this.cvmModel
      .findOne({
        position: {
          $nearSphere: {
            $geometry: {
              type: 'Point',
              coordinates: [command.longitude, command.latitude],
            },
            $maxDistance: constants.SAME_CVM_RADIUS,
          },
        },
      })
      .exec();

    if (!result) {
      // Limits the number of new messages per user to prevent spam
      const throttle = await this.shouldThrottle(command.creatorIdentity);

      if (throttle) {
        return;
      }

      const aggregate = CvmAggregate.register(
        command.longitude,
        command.latitude,
        command.creatorIdentity,
      );
      await this.cvmEventStoreRepository.save(aggregate);
    } else {
      const aggregate = (await this.cvmEventStoreRepository.load(
        CvmId.from(result.aggregateId),
      ))!;

      // Ensure voter has not already voted
      const hasVoted = await this.hasVotedRecently(
        command.creatorIdentity,
        aggregate.id.value,
      );

      if (hasVoted) {
        return;
      }

      aggregate.upvote(command.creatorIdentity);

      await this.cvmEventStoreRepository.save(aggregate);
    }
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

  async shouldThrottle(identity: string): Promise<boolean> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const count = await this.cvmModel.countDocuments({
      creatorIdentity: identity,
      createdAt: { $gte: yesterday },
    });

    return count >= constants.MAX_REGISTRATIONS_PER_DAY;
  }
}
