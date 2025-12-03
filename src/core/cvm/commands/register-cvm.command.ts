import { Logger } from '@nestjs/common';
import {
  CommandHandler,
  type ICommand,
  type ICommandHandler,
} from '@ocoda/event-sourcing';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as geohash from 'ngeohash';
import { CvmAggregate, CvmId } from '../models';
import { CvmEventStoreRepository, Cvm, Vote } from '../repositories';
import { CredibilityService } from 'src/core/ident/services';
import { constants } from 'src/lib';
import { ThrottledError } from 'src/lib/models';
import { LockService } from 'src/infrastructure/multithreading/services/lock.service';

export class RegisterCvmCommand implements ICommand {
  constructor(
    public readonly longitude: number,
    public readonly latitude: number,
    public readonly creatorIdentity: string,
  ) {}
}

@CommandHandler(RegisterCvmCommand)
export class RegisterCvmCommandHandler implements ICommandHandler {
  private readonly logger = new Logger(RegisterCvmCommandHandler.name);

  constructor(
    private readonly lockService: LockService,
    private readonly cvmEventStoreRepository: CvmEventStoreRepository,
    @InjectModel(Cvm.name) private readonly cvmModel: Model<Cvm>,
    @InjectModel(Vote.name) private readonly voteModel: Model<Vote>,
    private readonly credibilityService: CredibilityService,
  ) {}

  async execute(command: RegisterCvmCommand): Promise<void> {
    const hash = geohash.encode(command.latitude, command.longitude, 8);
    const lockKey = `lock:cvm:${hash}`;

    await this.lockService.withLock(lockKey, 3000, async () => {
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
          this.logger.debug(
            `User '${command.creatorIdentity}' has reached the registration limit or is on cooldown`,
          );
          throw new ThrottledError();
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
    });
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
          'cvmDoc.aggregateId': aggregateId,
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

    const credibility = await this.credibilityService.getCredibility(identity);
    const limit = constants.getRegistrationLimitByCredibility(credibility);
    const cooldown =
      constants.getRegistrationCooldownByCredibility(credibility);

    const count = await this.cvmModel.countDocuments({
      registeredBy: identity,
      createdAt: { $gte: yesterday },
    });

    const lastRegistration = await this.cvmModel
      .findOne({
        registeredBy: identity,
      })
      .sort({ createdAt: -1 })
      .exec();

    if (!lastRegistration) {
      return count > limit;
    }

    const timePassedSince =
      new Date().getTime() - lastRegistration.createdAt!.getTime();

    return timePassedSince < cooldown * 60 * 1000 || count > limit;
  }
}
