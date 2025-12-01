import { Logger } from '@nestjs/common';
import {
  CommandHandler,
  type ICommand,
  type ICommandHandler,
} from '@ocoda/event-sourcing';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as geohash from 'ngeohash';
import { CvmId } from '../models';
import { CvmEventStoreRepository, Repositioning } from '../repositories';
import {
  AlterationConflictError,
  NotFoundError,
  OutOfReachError,
  ThrottledError,
} from 'src/lib/models';
import { CredibilityService } from 'src/core/ident/services';
import { calculateDistanceInKm, constants } from 'src/lib';
import { LockService } from 'src/infrastructure/multithreading/services/lock.service';

export class RepositionCvmCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly repositionedLatitude: number,
    public readonly repositionedLongitude: number,
    public readonly editorLatitude: number,
    public readonly editorLongitude: number,
    public readonly editorIdentity: string,
  ) {}
}

@CommandHandler(RepositionCvmCommand)
export class RepositionCvmCommandHandler implements ICommandHandler {
  private readonly logger = new Logger(RepositionCvmCommandHandler.name);

  constructor(
    private readonly lockService: LockService,
    private readonly cvmEventStoreRepository: CvmEventStoreRepository,
    private readonly credibilityService: CredibilityService,
    @InjectModel(Repositioning.name)
    private readonly repositioningModel: Model<Repositioning>,
  ) {}

  async execute(command: RepositionCvmCommand): Promise<void> {
    const hash = geohash.encode(
      command.repositionedLatitude,
      command.repositionedLongitude,
      8,
    );
    const areaLockKey = `lock:cvm:${hash}`;
    const aggregateLockKey = `lock:cvm:${command.id}`;

    await this.lockService.withLocks(
      [areaLockKey, aggregateLockKey],
      3000,
      async () => {
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
            longitude: command.editorLongitude,
            latitude: command.editorLatitude,
          },
        );

        // Ensure editor is not too far away
        if (distanceInKm > constants.NEARBY_CVM_RADIUS) {
          throw new OutOfReachError();
        }

        const movedDistanceInKm = calculateDistanceInKm(
          {
            longitude: aggregate.longitude,
            latitude: aggregate.latitude,
          },
          {
            longitude: command.repositionedLongitude,
            latitude: command.repositionedLatitude,
          },
        );

        // Ensure CVM is not moved too far
        if (movedDistanceInKm > constants.NEARBY_REPOSITION_RADIUS) {
          throw new AlterationConflictError();
        }

        // Ensure editor has not already repositioned
        const hasRepositioned = await this.hasRepositionedRecently(
          command.editorIdentity,
          aggregate.id.value,
        );

        if (hasRepositioned) {
          this.logger.debug(
            `User '${command.editorIdentity}' has reached the reposition limit or is on cooldown`,
          );
          throw new ThrottledError();
        }

        aggregate.reposition(
          command.editorIdentity,
          command.repositionedLongitude,
          command.repositionedLatitude,
        );
        await this.cvmEventStoreRepository.save(aggregate);
      },
    );
  }

  async hasRepositionedRecently(
    identity: string,
    aggregateId: string,
  ): Promise<boolean> {
    const recentlyLimit = new Date();
    recentlyLimit.setDate(
      recentlyLimit.getDate() - constants.CVM_REPOSITION_DELAY,
    );

    const result = await this.repositioningModel.aggregate([
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
    const limit = constants.getRepositionLimitByCredibility(credibility);
    const cooldown = constants.getRepositionCooldownByCredibility(credibility);

    const count = await this.repositioningModel.countDocuments({
      identity,
      createdAt: { $gte: yesterday },
    });

    const lastReposition = await this.repositioningModel
      .findOne({
        identity,
      })
      .sort({ createdAt: -1 })
      .exec();

    if (!lastReposition) {
      return count > limit;
    }

    const timePassedSince =
      new Date().getTime() - lastReposition.createdAt!.getTime();

    return timePassedSince < cooldown * 60 * 1000 || count > limit;
  }
}
