import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { IdentToken, IdentInfo, IdentTotalStats, IdentSecret } from '../models';
import {
  InvalidIdentTokenError,
  Page,
  Pageable,
  UnknownIdentityError,
} from 'src/common/models';
import { InjectModel } from '@nestjs/mongoose';
import { Ident } from '../repositories';
import { Model } from 'mongoose';

@Injectable()
export class IdentService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    @InjectModel(Ident.name) private readonly identModel: Model<Ident>,
  ) {}

  async generateIdentToken(
    identity: string,
    secret: string,
  ): Promise<IdentToken> {
    const result = await this.identModel.findOne({ identity });

    if (!result) {
      throw new UnknownIdentityError();
    }

    if (!bcrypt.compareSync(secret, result.secret)) {
      throw new UnknownIdentityError();
    }

    const token = await this.jwtService.signAsync({ identity });

    return { identity, token };
  }

  async verifyIdentToken(identToken: string): Promise<string> {
    try {
      const payload = await this.jwtService.verifyAsync<{
        identity: string;
      }>(identToken, {
        secret: this.configService.get<string>('IDENT_SECRET'),
      });

      return payload.identity;
    } catch {
      throw new InvalidIdentTokenError();
    }
  }

  async issueIdentity(): Promise<IdentSecret> {
    const identity = crypto.randomUUID();
    const secret = crypto.randomBytes(64).toString('hex');
    const salt = await bcrypt.genSalt(10);
    const hashedSecret = await bcrypt.hash(secret, salt);

    await this.identModel.create({
      identity,
      secret: hashedSecret,
      credibility: {
        rating: 50,
      },
    });

    return { identity, secret };
  }

  async unregisterIdentity(identity: string): Promise<void> {
    await this.identModel.deleteOne({ identity });
  }

  async existsIdentity(identity: string): Promise<boolean> {
    return (await this.identModel.countDocuments({ identity })) > 0;
  }

  async getIdentity(identity: string): Promise<IdentInfo> {
    const result = await this.identModel.findOne({ identity });

    if (!result) {
      throw new UnknownIdentityError();
    }

    return {
      identity: result.identity,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      credibility: {
        rating: result.credibility.rating,
        behaviour: result.credibility.behaviour && {
          lastInteractionAt: result.credibility.behaviour.lastInteractionAt,
          averageInteractionInterval:
            result.credibility.behaviour.averageInteractionInterval,
          unrealisticMovementCount:
            result.credibility.behaviour.unrealisticMovementCount,
          lastInteractionPosition: result.credibility.behaviour
            .lastInteractionPosition
            ? {
                longitude:
                  result.credibility.behaviour.lastInteractionPosition
                    .coordinates[0],
                latitude:
                  result.credibility.behaviour.lastInteractionPosition
                    .coordinates[1],
              }
            : undefined,
          voting: {
            totalCount: result.credibility.behaviour.voting.totalCount,
            upvoteCount: result.credibility.behaviour.voting.upvoteCount,
            downvoteCount: result.credibility.behaviour.voting.downvoteCount,
            lastVotedAt: result.credibility.behaviour.voting.lastVotedAt,
            averageVotingInterval:
              result.credibility.behaviour.voting.averageVotingInterval,
          },
          registration: {
            totalCount: result.credibility.behaviour.registration.totalCount,
            lastRegistrationAt:
              result.credibility.behaviour.registration.lastRegistrationAt,
            averageRegistrationInterval:
              result.credibility.behaviour.registration
                .averageRegistrationInterval,
          },
        },
      },
    };
  }

  async getIdentities(
    pageable: Pageable,
    filter?: object,
  ): Promise<Page<IdentInfo>> {
    const skip = pageable.page * pageable.perPage;

    const totalElements = await this.identModel.countDocuments(filter || {});

    const content = await this.identModel
      .find(filter || {})
      .skip(skip)
      .limit(pageable.perPage);

    const totalPages = Math.ceil(totalElements / pageable.perPage);

    return {
      content: content.map((ident) => ({
        identity: ident.identity,
        createdAt: ident.createdAt,
        updatedAt: ident.updatedAt,
        credibility: {
          rating: ident.credibility.rating,
          behaviour: ident.credibility.behaviour && {
            lastInteractionAt: ident.credibility.behaviour.lastInteractionAt,
            averageInteractionInterval:
              ident.credibility.behaviour.averageInteractionInterval,
            unrealisticMovementCount:
              ident.credibility.behaviour.unrealisticMovementCount,
            lastInteractionPosition: ident.credibility.behaviour
              .lastInteractionPosition
              ? {
                  longitude:
                    ident.credibility.behaviour.lastInteractionPosition
                      .coordinates[0],
                  latitude:
                    ident.credibility.behaviour.lastInteractionPosition
                      .coordinates[1],
                }
              : undefined,
            voting: {
              totalCount: ident.credibility.behaviour.voting.totalCount,
              upvoteCount: ident.credibility.behaviour.voting.upvoteCount,
              downvoteCount: ident.credibility.behaviour.voting.downvoteCount,
              lastVotedAt: ident.credibility.behaviour.voting.lastVotedAt,
              averageVotingInterval:
                ident.credibility.behaviour.voting.averageVotingInterval,
            },
            registration: {
              totalCount: ident.credibility.behaviour.registration.totalCount,
              lastRegistrationAt:
                ident.credibility.behaviour.registration.lastRegistrationAt,
              averageRegistrationInterval:
                ident.credibility.behaviour.registration
                  .averageRegistrationInterval,
            },
          },
        },
      })),
      info: {
        page: pageable.page,
        perPage: pageable.perPage,
        totalElements,
        totalPages,
      },
    };
  }

  async getTotalStats(lastNDays: number): Promise<IdentTotalStats> {
    const totalElements = await this.identModel.countDocuments();
    const averageCredibility = await this.getAverageCredibility();
    const newHistory = await this.getNewIdentsPerDay(lastNDays);

    const totalNewLast7Days =
      lastNDays >= 7
        ? newHistory.slice(-7).reduce((acc, item) => {
            return acc + item.count;
          }, 0)
        : (await this.getNewIdentsPerDay(7)).reduce((acc, item) => {
            return acc + item.count;
          }, 0);

    return {
      total: totalElements,
      averageCredibility,
      totalNewLast7Days,
      newHistory,
    };
  }

  async getAverageCredibility() {
    const result = await this.identModel.aggregate<{
      averageCredibility: number;
    }>([
      {
        $group: {
          _id: null,
          average: { $avg: '$credibility' },
        },
      },
      {
        $project: {
          _id: 0,
          averageCredibility: '$average',
        },
      },
    ]);

    return result[0] ? result[0].averageCredibility : 0;
  }

  private async getNewIdentsPerDay(lastNDays: number) {
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - lastNDays + 1);

    const queryResult = await this.identModel
      .aggregate<{
        _id: string;
        count: number;
      }>([
        {
          $match: {
            issuedAt: { $gte: startDate, $lte: now },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$issuedAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .exec();

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
