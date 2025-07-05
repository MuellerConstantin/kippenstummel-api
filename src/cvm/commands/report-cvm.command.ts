import {
  CommandHandler,
  type ICommand,
  type ICommandHandler,
} from '@ocoda/event-sourcing';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CvmId } from '../models';
import { CvmEventStoreRepository, Report } from '../repositories';
import { NotFoundError, OutOfReachError } from 'src/common/models';
import { calculateDistanceInKm, constants } from 'src/lib';

export class ReportCvmCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly reporterLongitude: number,
    public readonly reporterLatitude: number,
    public readonly reporterIdentity: string,
    public readonly type: 'missing' | 'spam' | 'inactive' | 'inaccessible',
  ) {}
}

@CommandHandler(ReportCvmCommand)
export class ReportCvmCommandHandler implements ICommandHandler {
  constructor(
    private readonly cvmEventStoreRepository: CvmEventStoreRepository,
    @InjectModel(Report.name) private readonly reportModel: Model<Report>,
  ) {}

  async execute(command: ReportCvmCommand): Promise<void> {
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
        longitude: command.reporterLongitude,
        latitude: command.reporterLatitude,
      },
    );

    // Ensure voter is not too far away
    if (distanceInKm > constants.NEARBY_CVM_RADIUS) {
      throw new OutOfReachError();
    }

    // Ensure reporter has not already reported
    const hasReported = await this.hasReportedRecently(
      command.reporterIdentity,
      aggregate.id.value,
    );

    if (hasReported) {
      return;
    }

    aggregate.report(command.reporterIdentity, command.type);
    await this.cvmEventStoreRepository.save(aggregate);
  }

  async hasReportedRecently(
    identity: string,
    aggregateId: string,
  ): Promise<boolean> {
    const recentlyLimit = new Date();
    recentlyLimit.setDate(recentlyLimit.getDate() - constants.CVM_REPORT_DELAY);

    const result = await this.reportModel.aggregate([
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
}
