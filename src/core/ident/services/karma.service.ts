import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Karma as KarmaModel } from '../repositories';
import { Page, Pageable } from 'src/lib/models';
import { KarmaEvent } from '../models/karma.model';

@Injectable()
export class KarmaService {
  constructor(
    @InjectModel(KarmaModel.name)
    private readonly karmaModel: Model<KarmaModel>,
  ) {}

  async applyEvent(
    targetIdentity: string,
    cvmId: string,
    action:
      | 'registration'
      | 'upvote_received'
      | 'downvote_received'
      | 'upvote_cast'
      | 'downvote_cast'
      | 'report_cast'
      | 'report_received',
  ) {
    const delta = KarmaService.getDeltaForAction(action);

    await this.karmaModel.updateOne(
      { identity: targetIdentity },
      {
        $inc: { amount: delta },
        $push: {
          history: {
            type: action,
            delta,
            occurredAt: new Date(),
            cvmId,
          },
        },
      },
      { upsert: true },
    );
  }

  async getHistoryForIdentity(
    identity: string,
    pageable: Pageable,
  ): Promise<Page<KarmaEvent>> {
    const { page, perPage } = pageable;
    const skip = page * perPage;

    const [result] = await this.karmaModel.aggregate<{
      events: KarmaEvent[];
      total: number;
    }>([
      { $match: { identity } },
      { $project: { history: 1, _id: 0, total: { $size: '$history' } } },
      { $unwind: '$history' },
      { $sort: { 'history.occurredAt': -1 } },
      { $skip: skip },
      { $limit: perPage },
      {
        $group: {
          _id: null,
          events: { $push: '$history' },
          total: { $first: '$total' },
        },
      },
    ]);

    const totalElements = result?.total ?? 0;
    const totalPages = Math.ceil(totalElements / perPage);

    return {
      content: result?.events ?? [],
      info: {
        page,
        perPage,
        totalElements,
        totalPages,
      },
    };
  }

  private static getDeltaForAction(
    action:
      | 'registration'
      | 'upvote_received'
      | 'downvote_received'
      | 'upvote_cast'
      | 'downvote_cast'
      | 'report_cast'
      | 'report_received',
  ): number {
    switch (action) {
      case 'registration':
        return 1;
      case 'upvote_received':
        return 10;
      case 'downvote_received':
        return -10;
      case 'upvote_cast':
        return 1;
      case 'downvote_cast':
        return -1;
      case 'report_cast':
        return -1;
      case 'report_received':
        return -10;
      default:
        return 0;
    }
  }
}
