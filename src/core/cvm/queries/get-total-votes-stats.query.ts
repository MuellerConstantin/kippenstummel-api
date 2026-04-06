import {
  type IQuery,
  type IQueryHandler,
  QueryHandler,
} from '@ocoda/event-sourcing';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CvmTotalVotesStatsProjection } from '../models';
import { Vote } from '../repositories';

export class GetTotalVotesStatsQuery implements IQuery {
  constructor(public readonly lastNDays: number) {}
}

@QueryHandler(GetTotalVotesStatsQuery)
export class GetTotalVotesStatsQueryHandler
  implements
    IQueryHandler<GetTotalVotesStatsQuery, CvmTotalVotesStatsProjection>
{
  constructor(
    @InjectModel(Vote.name) private readonly voteModel: Model<Vote>,
  ) {}

  public async execute(
    query: GetTotalVotesStatsQuery,
  ): Promise<CvmTotalVotesStatsProjection> {
    const totalElements = await this.voteModel.countDocuments();

    const totalUpvotes = await this.voteModel.countDocuments({
      type: 'upvote',
    });

    const totalDownvotes = await this.voteModel.countDocuments({
      type: 'downvote',
    });

    const upvoteHistory = await this.getVotesPerDay(query.lastNDays, 'upvote');

    const downvoteHistory = await this.getVotesPerDay(
      query.lastNDays,
      'downvote',
    );

    const totalUpvotesLastNDays = this.sumLast(upvoteHistory, query.lastNDays);

    const totalDownvotesLastNDays = this.sumLast(
      downvoteHistory,
      query.lastNDays,
    );

    return {
      total: totalElements,
      upvotes: {
        total: totalUpvotes,
        totalLastNDays: totalUpvotesLastNDays,
        history: upvoteHistory,
      },
      downvotes: {
        total: totalDownvotes,
        totalLastNDays: totalDownvotesLastNDays,
        history: downvoteHistory,
      },
    };
  }

  private sumLast(
    history: { date: string; count: number }[],
    days: number,
  ): number {
    return history.slice(-days).reduce((acc, item) => acc + item.count, 0);
  }

  private async getVotesPerDay(lastNDays: number, type: 'upvote' | 'downvote') {
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - lastNDays + 1);

    const queryResult = await this.voteModel.aggregate<{
      _id: string;
      count: number;
    }>([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: now },
          type,
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
}
