import {
  type IQuery,
  type IQueryHandler,
  QueryHandler,
} from '@ocoda/event-sourcing';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VotesMetaProjection } from '../models';
import { Vote } from '../repositories';

export class GetVotesMetaQuery implements IQuery {
  constructor(public readonly lastNDays: number) {}
}

@QueryHandler(GetVotesMetaQuery)
export class GetVotesMetaQueryHandler
  implements IQueryHandler<GetVotesMetaQuery, VotesMetaProjection>
{
  constructor(
    @InjectModel(Vote.name) private readonly voteModel: Model<Vote>,
  ) {}

  public async execute(query: GetVotesMetaQuery): Promise<VotesMetaProjection> {
    const totalElements = await this.voteModel.countDocuments();
    const voteHistory = await this.getVotesPerDay(query.lastNDays);
    const totalLast7Days = voteHistory.reduce((acc, item) => {
      return acc + item.count;
    }, 0);

    return {
      count: totalElements,
      totalLast7Days,
      voteHistory,
    };
  }

  async getVotesPerDay(lastNDays: number) {
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - lastNDays + 1);

    const result = await this.voteModel
      .aggregate<{
        _id: string;
        count: number;
        upvotes: number;
        downvotes: number;
      }>([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: now },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            upvotes: {
              $sum: {
                $cond: [{ $eq: ['$type', 'upvote'] }, 1, 0],
              },
            },
            downvotes: {
              $sum: {
                $cond: [{ $eq: ['$type', 'downvote'] }, 1, 0],
              },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .exec();

    return result.map((item) => ({
      date: item._id,
      count: item.count,
      upvotes: item.upvotes,
      downvotes: item.downvotes,
    }));
  }
}
