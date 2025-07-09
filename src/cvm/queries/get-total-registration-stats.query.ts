import {
  type IQuery,
  type IQueryHandler,
  QueryHandler,
} from '@ocoda/event-sourcing';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CvmTotalRegistrationStatsProjection } from '../models';
import { Cvm } from '../repositories/schemas';

export class GetTotalRegistrationStatsQuery implements IQuery {
  constructor(public readonly lastNDays: number) {}
}

@QueryHandler(GetTotalRegistrationStatsQuery)
export class GetTotalRegistrationStatsQueryHandler
  implements
    IQueryHandler<
      GetTotalRegistrationStatsQuery,
      CvmTotalRegistrationStatsProjection
    >
{
  constructor(@InjectModel(Cvm.name) private readonly cvmModel: Model<Cvm>) {}

  public async execute(
    query: GetTotalRegistrationStatsQuery,
  ): Promise<CvmTotalRegistrationStatsProjection> {
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
    const importHistory = await this.getImportsPerDay(query.lastNDays);

    const totalRegistrationsLast7Days =
      query.lastNDays >= 7
        ? registrationHistory.slice(-7).reduce((acc, item) => {
            return acc + item.count;
          }, 0)
        : (await this.getRegistrationsPerDay(7)).reduce((acc, item) => {
            return acc + item.count;
          }, 0);
    const totalImportsLast7Days =
      query.lastNDays >= 7
        ? importHistory.slice(-7).reduce((acc, item) => {
            return acc + item.count;
          }, 0)
        : (await this.getImportsPerDay(7)).reduce((acc, item) => {
            return acc + item.count;
          }, 0);

    const averageScore = await this.getAverageScore();

    return {
      total: totalElements,
      averageScore,
      imports: {
        total: totalImported,
        totalLast7Days: totalImportsLast7Days,
        history: importHistory,
      },
      registrations: {
        total: totalRegistered,
        totalLast7Days: totalRegistrationsLast7Days,
        history: registrationHistory,
      },
    };
  }

  async getRegistrationsPerDay(lastNDays: number) {
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - lastNDays + 1);

    const queryResult = await this.cvmModel.aggregate<{
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

    const result = new Map(queryResult.map(({ _id, count }) => [_id, count]));

    const history = Array.from({ length: lastNDays }, (_, index) => {
      const date = new Date();
      date.setDate(now.getDate() - lastNDays + 1 + index);
      const key = date.toISOString().split('T')[0];

      return {
        date: key,
        count: result.get(key) ?? 0,
      };
    });

    return history;
  }

  async getImportsPerDay(lastNDays: number) {
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - lastNDays + 1);

    const queryResult = await this.cvmModel.aggregate<{
      _id: string;
      count: number;
    }>([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: now },
          imported: true,
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

    const result = new Map(queryResult.map(({ _id, count }) => [_id, count]));

    const history = Array.from({ length: lastNDays }, (_, index) => {
      const date = new Date();
      date.setDate(now.getDate() - lastNDays + 1 + index);
      const key = date.toISOString().split('T')[0];

      return {
        date: key,
        count: result.get(key) ?? 0,
      };
    });

    return history;
  }

  async getAverageScore() {
    const result = await this.cvmModel.aggregate<{ averageScore: number }>([
      {
        $group: {
          _id: null,
          average: { $avg: '$score' },
        },
      },
      {
        $project: {
          _id: 0,
          averageScore: '$average',
        },
      },
    ]);

    return result?.[0]?.averageScore || 0;
  }
}
