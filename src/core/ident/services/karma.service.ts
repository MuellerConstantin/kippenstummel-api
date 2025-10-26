import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Karma as KarmaModel } from '../repositories';

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
