import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { IdentToken, IdentInfo, IdentTotalStats, IdentSecret } from '../models';
import {
  InvalidIdentTokenError,
  Page,
  Pageable,
  UnknownIdentityError,
  UsernameAlreadyExistsError,
} from 'src/lib/models';
import { InjectModel } from '@nestjs/mongoose';
import { Credibility, Ident, Karma } from '../repositories';
import { Model, PipelineStage } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IdentCreatedEvent, IdentRemovedEvent } from '../events';
import { RsqlToMongoQueryResult } from 'src/presentation/common/controllers/filter';
import { IdentDocument } from '../repositories/schemas/ident.schema';

@Injectable()
export class IdentService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    @InjectModel(Ident.name) private readonly identModel: Model<Ident>,
    @InjectModel(Credibility.name)
    private readonly credibilityModel: Model<Credibility>,
    @InjectModel(Karma.name)
    private readonly karmaModel: Model<Karma>,
    private eventEmitter: EventEmitter2,
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

      const result = await this.identModel.exists({
        identity: payload.identity,
      });

      if (!result) {
        throw new UnknownIdentityError();
      }

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

    const credibility = await this.credibilityModel.create({
      identity,
      rating: 50,
    });

    const karma = await this.karmaModel.create({
      identity,
      amount: 100,
    });

    await this.identModel.create({
      identity,
      secret: hashedSecret,
      credibility: credibility._id,
      karma: karma._id,
    });

    this.eventEmitter.emit('ident-created', new IdentCreatedEvent(identity));

    return { identity, secret };
  }

  async unregisterIdentity(identity: string): Promise<void> {
    await this.identModel.deleteOne({ identity });
    await this.credibilityModel.deleteOne({ identity });
    await this.karmaModel.deleteOne({ identity });

    this.eventEmitter.emit('ident-removed', new IdentRemovedEvent(identity));
  }

  async updateIdentity(
    identity: string,
    updates: { username?: string | null },
  ): Promise<void> {
    if (Object.keys(updates).length === 0) {
      return;
    }

    const user = await this.identModel.findOne({ identity });

    if (!user) {
      throw new UnknownIdentityError();
    }

    const newUsername = updates.username;

    if (newUsername === null) {
      await this.identModel.updateOne(
        { identity },
        { $set: { username: null } },
      );
      return;
    }

    let suffix = user.suffix;

    // Suffix does not exist -> Username has never been set
    if (!suffix) {
      while (true) {
        suffix = this.generateSuffix();

        try {
          await this.identModel.updateOne(
            { identity },
            { $set: { username: newUsername, suffix } },
          );
          break;
        } catch (error) {
          if (error instanceof mongoose.mongo.MongoServerError) {
            if (error.code === 11000) {
              // Combination username+suffix exists already -> Try new suffix
              continue;
            }
          }

          throw error;
        }
      }

      return;
    }

    // Suffix exists -> Username was already set
    try {
      await this.identModel.updateOne(
        { identity },
        { $set: { username: newUsername } },
      );
    } catch (error) {
      if (error instanceof mongoose.mongo.MongoServerError) {
        if (error.code === 11000) {
          throw new UsernameAlreadyExistsError();
        }
      }
      throw error;
    }
  }

  private generateSuffix(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  async existsIdentity(identity: string): Promise<boolean> {
    return (await this.identModel.countDocuments({ identity })) > 0;
  }

  async getIdentity(identity: string): Promise<IdentInfo> {
    const result = await this.identModel
      .findOne({ identity })
      .populate('credibility')
      .populate('karma');

    if (!result) {
      throw new UnknownIdentityError();
    }

    return {
      identity: result.identity,
      credibility: result.credibility.rating,
      displayName:
        result.username && result.suffix
          ? `${result.username}#${result.suffix}`
          : undefined,
      karma: result.karma.amount,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  async getIdentities(
    pageable: Pageable,
    filter?: RsqlToMongoQueryResult,
  ): Promise<Page<IdentInfo>> {
    const { page, perPage } = pageable;
    const skip = page * perPage;

    /*
     * Depending on the complexity of the filter, aggregate() or find() can be used
     * here. More complex queries that require a reference lookup must be executed
     * as an aggregate pipeline.
     */

    if (filter?.useAggregate) {
      const basePipeline = filter.pipeline || [];

      const countPipeline = [...basePipeline, { $count: 'total' }];
      const countResult = await this.identModel.aggregate<{ total: number }>(
        countPipeline as PipelineStage[],
      );
      const totalElements = countResult[0]?.total ?? 0;

      const dataPipeline = [
        ...basePipeline,
        { $skip: skip },
        { $limit: perPage },
      ];
      const results = await this.identModel.aggregate<IdentDocument>([
        /*
         * In any case, we always need a credibility lookup to correctly set
         * the rating in the ident model. To avoid collisions between the lookups,
         * in case the dynamic RSQL filter should already initiate a lookup; the
         * lookup is intentionally renamed here.
         */
        {
          $lookup: {
            from: 'credibilities',
            localField: 'credibility',
            foreignField: '_id',
            as: 'credibility_fallback',
          },
        },
        /*
         * In any case, we always need a karma lookup to correctly set
         * the rating in the ident model. To avoid collisions between the lookups,
         * in case the dynamic RSQL filter should already initiate a lookup; the
         * lookup is intentionally renamed here.
         */
        {
          $lookup: {
            from: 'karmas',
            localField: 'karma',
            foreignField: '_id',
            as: 'karma_fallback',
          },
        },
        { $unwind: '$credibility_fallback' },
        { $unwind: '$karma_fallback' },
        ...(dataPipeline as PipelineStage[]),
      ]);

      return {
        content: results.map((ident) => ({
          identity: ident.identity,
          displayName:
            ident.username && ident.suffix
              ? `${ident.username}#${ident.suffix}`
              : '',
          createdAt: ident.createdAt,
          updatedAt: ident.updatedAt,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          credibility: (ident as any).credibility_fallback.rating,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          karma: (ident as any).karma_fallback.amount,
        })),
        info: {
          page,
          perPage,
          totalElements,
          totalPages: Math.ceil(totalElements / perPage),
        },
      };
    } else {
      const filterObj = filter?.filter || {};

      const totalElements = await this.identModel.countDocuments(filterObj);

      const content = await this.identModel
        .find(filterObj)
        .populate('credibility')
        .populate('karma')
        .skip(skip)
        .limit(pageable.perPage);

      const totalPages = Math.ceil(totalElements / pageable.perPage);

      return {
        content: content.map((ident) => ({
          identity: ident.identity,
          createdAt: ident.createdAt,
          updatedAt: ident.updatedAt,
          credibility: ident.credibility.rating,
          karma: ident.karma.amount,
        })),
        info: {
          page: pageable.page,
          perPage: pageable.perPage,
          totalElements,
          totalPages,
        },
      };
    }
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
