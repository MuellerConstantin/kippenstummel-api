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
    const totalUpvotes = await this.voteModel.countDocuments({
      type: 'upvote',
    });
    const totalDownvotes = await this.voteModel.countDocuments({
      type: 'downvote',
    });

    const upvoteHistory = await this.getUpvotesPerDay(query.lastNDays);
    const downvoteHistory = await this.getDownvotesPerDay(query.lastNDays);

    const totalUpvotesLast7Days =
      query.lastNDays >= 7
        ? upvoteHistory.slice(-7).reduce((acc, item) => {
            return acc + item.count;
          }, 0)
        : (await this.getUpvotesPerDay(7)).reduce((acc, item) => {
            return acc + item.count;
          }, 0);
    const totalDownvotesLast7Days =
      query.lastNDays >= 7
        ? downvoteHistory.slice(-7).reduce((acc, item) => {
            return acc + item.count;
          }, 0)
        : (await this.getDownvotesPerDay(7)).reduce((acc, item) => {
            return acc + item.count;
          }, 0);

    return {
      total: totalElements,
      upvotes: {
        total: totalUpvotes,
        totalLast7Days: totalUpvotesLast7Days,
        history: upvoteHistory,
      },
      downvotes: {
        total: totalDownvotes,
        totalLast7Days: totalDownvotesLast7Days,
        history: downvoteHistory,
      },
    };
  }

  async getUpvotesPerDay(lastNDays: number) {
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - lastNDays + 1);

    const result = await this.voteModel
      .aggregate<{
        _id: string;
        count: number;
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
            count: {
              $sum: {
                $cond: [{ $eq: ['$type', 'upvote'] }, 1, 0],
              },
            },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .exec();

    return result.map((item) => ({
      date: item._id,
      count: item.count,
    }));
  }

  async getDownvotesPerDay(lastNDays: number) {
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - lastNDays + 1);

    const result = await this.voteModel
      .aggregate<{
        _id: string;
        count: number;
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
            count: {
              $sum: {
                $cond: [{ $eq: ['$type', 'downvote'] }, 1, 0],
              },
            },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .exec();

    return result.map((item) => ({
      date: item._id,
      count: item.count,
    }));
  }
}
