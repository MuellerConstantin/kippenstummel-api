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

    const totalRegistrationsLastNDays = this.sumLast(
      registrationHistory,
      query.lastNDays,
    );

    const totalImportsLastNDays = this.sumLast(importHistory, query.lastNDays);

    const averageScore = await this.getAverageScore();

    return {
      total: totalElements,
      averageScore,
      imports: {
        total: totalImported,
        totalLastNDays: totalImportsLastNDays,
        history: importHistory,
      },
      registrations: {
        total: totalRegistered,
        totalLastNDays: totalRegistrationsLastNDays,
        history: registrationHistory,
      },
    };
  }

  private sumLast(
    history: { date: string; count: number }[],
    days: number,
  ): number {
    return history.slice(-days).reduce((acc, item) => acc + item.count, 0);
  }

  async getRegistrationsPerDay(lastNDays: number) {
    return this.getPerDay(lastNDays, { imported: false });
  }

  async getImportsPerDay(lastNDays: number) {
    return this.getPerDay(lastNDays, { imported: true });
  }

  private async getPerDay(lastNDays: number, filter: Partial<Cvm>) {
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
          ...filter,
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
              timezone: 'Europe/Berlin',
            },
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
