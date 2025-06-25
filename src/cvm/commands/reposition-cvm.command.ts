import {
  CommandHandler,
  type ICommand,
  type ICommandHandler,
} from '@ocoda/event-sourcing';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CvmId } from '../models';
import { CvmEventStoreRepository, Repositioning } from '../repositories';
import {
  AlterationConflictError,
  NotFoundError,
  OutOfReachError,
} from 'src/common/models';
import { CredibilityService } from 'src/ident/services';
import { calculateDistanceInKm, constants } from 'src/lib';

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
  constructor(
    private readonly cvmEventStoreRepository: CvmEventStoreRepository,
    private readonly credibilityService: CredibilityService,
    @InjectModel(Repositioning.name)
    private readonly repositioningModel: Model<Repositioning>,
  ) {}

  async execute(command: RepositionCvmCommand): Promise<void> {
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
      return;
    }

    const credibility = await this.credibilityService.getCredibility(
      command.editorIdentity,
    );

    aggregate.reposition(
      command.editorIdentity,
      credibility,
      command.repositionedLongitude,
      command.repositionedLatitude,
    );
    await this.cvmEventStoreRepository.save(aggregate);
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
