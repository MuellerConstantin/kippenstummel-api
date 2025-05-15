import {
  type IQuery,
  type IQueryHandler,
  QueryHandler,
} from '@ocoda/event-sourcing';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CvmMetaProjection } from '../models';
import { Cvm } from '../repositories/schemas';

export class GetMetaQuery implements IQuery {
  constructor(public readonly lastNDays: number) {}
}

@QueryHandler(GetMetaQuery)
export class GetMetaQueryHandler
  implements IQueryHandler<GetMetaQuery, CvmMetaProjection>
{
  constructor(@InjectModel(Cvm.name) private readonly cvmModel: Model<Cvm>) {}

  public async execute(query: GetMetaQuery): Promise<CvmMetaProjection> {
    const totalElements = await this.cvmModel.countDocuments();
    const totalImported = await this.cvmModel.countDocuments({
      imported: true,
    });
    const totalRegistered = await this.cvmModel.countDocuments({
      imported: false,
    });
    const registrationHistory = await this.getRegistrationsPerDay(
      query.lastNDays,
    );
    const totalLast7Days = registrationHistory.reduce((acc, item) => {
      return acc + item.count;
    }, 0);

    return {
      count: totalElements,
      countImported: totalImported,
      countRegistered: totalRegistered,
      totalLast7Days,
      registrationHistory,
    };
  }

  async getRegistrationsPerDay(lastNDays: number) {
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - lastNDays + 1);

    const result = await this.cvmModel.aggregate<{
      _id: string;
      count: number;
    }>([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: now },
          imported: false,
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    return result.map((item) => ({
      date: item._id,
      count: item.count,
    }));
  }
}
