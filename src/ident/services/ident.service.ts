import * as crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { IdentToken, IdentInfo, IdentMetadata, IdentSecret } from '../models';
import {
  InvalidIdentTokenError,
  Page,
  Pageable,
  UnknownIdentityError,
} from 'src/common/models';
import { calculateEwma, calculateDistanceInKm, calculateSpeed } from 'src/lib';
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

    const info: IdentInfo = {
      identity,
      credibility: 0,
      issuedAt: new Date(),
      lastInteractionAt: undefined,
      averageInteractionInterval: 0,
      lastInteractionPosition: undefined,
      unrealisticMovementCount: 0,
      voting: { totalCount: 0, upvoteCount: 0, downvoteCount: 0 },
      registrations: { totalCount: 0 },
    };

    info.credibility = IdentService.computeCredibility(info);

    await this.identModel.create({
      ...info,
      secret: hashedSecret,
    });

    return { identity, secret };
  }

  async unregisterIdentity(identity: string): Promise<void> {
    await this.identModel.deleteOne({ identity });
  }

  async existsIdentity(identity: string): Promise<boolean> {
    return (await this.identModel.countDocuments({ identity })) > 0;
  }

  async getCredibility(identity: string): Promise<number> {
    const info = await this.getIdentity(identity);
    return info.credibility;
  }

  async getIdentity(identity: string): Promise<IdentInfo> {
    const result = await this.identModel.findOne({ identity });

    if (!result) {
      throw new UnknownIdentityError();
    }

    return {
      identity: result.identity,
      credibility: result.credibility,
      issuedAt: result.issuedAt,
      lastInteractionAt: result.lastInteractionAt,
      averageInteractionInterval: result.averageInteractionInterval,
      unrealisticMovementCount: result.unrealisticMovementCount,
      lastInteractionPosition: result.lastInteractionPosition
        ? {
            longitude: result.lastInteractionPosition.coordinates[0],
            latitude: result.lastInteractionPosition.coordinates[1],
          }
        : undefined,
      voting: {
        totalCount: result.voting.totalCount,
        upvoteCount: result.voting.upvoteCount,
        downvoteCount: result.voting.downvoteCount,
      },
      registrations: {
        totalCount: result.registrations.totalCount,
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
        credibility: ident.credibility,
        issuedAt: ident.issuedAt,
        lastInteractionAt: ident.lastInteractionAt,
        averageInteractionInterval: ident.averageInteractionInterval,
        unrealisticMovementCount: ident.unrealisticMovementCount,
        lastInteractionPosition: ident.lastInteractionPosition
          ? {
              longitude: ident.lastInteractionPosition.coordinates[0],
              latitude: ident.lastInteractionPosition.coordinates[1],
            }
          : undefined,
        voting: {
          totalCount: ident.voting.totalCount,
          upvoteCount: ident.voting.upvoteCount,
          downvoteCount: ident.voting.downvoteCount,
        },
        registrations: {
          totalCount: ident.registrations.totalCount,
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

  async updateIdentity(
    identity: string,
    location: {
      longitude: number;
      latitude: number;
    },
    interaction: 'upvote' | 'downvote' | 'registration',
  ): Promise<void> {
    const info = await this.getIdentity(identity);

    // Check for unrealistic movement
    if (info.lastInteractionPosition && info.lastInteractionAt) {
      const hasUnrealisticallyMoved: boolean =
        IdentService.isUnrealisticallyMovement(
          info.lastInteractionPosition,
          location,
          info.lastInteractionAt,
        );

      if (hasUnrealisticallyMoved) {
        info.unrealisticMovementCount++;
      }
    }

    // Calculate average interaction interval
    if (info.lastInteractionAt) {
      const duration = new Date().getTime() - info.lastInteractionAt.getTime();
      const previousEwma =
        info.averageInteractionInterval > 0
          ? info.averageInteractionInterval
          : duration;

      info.averageInteractionInterval = calculateEwma(
        previousEwma,
        duration,
        0.1,
      );
    }

    info.lastInteractionAt = new Date();
    info.lastInteractionPosition = location;

    if (interaction === 'upvote') {
      info.voting.totalCount++;
      info.voting.upvoteCount++;
    } else if (interaction === 'downvote') {
      info.voting.totalCount++;
      info.voting.downvoteCount++;
    } else if (interaction === 'registration') {
      info.registrations.totalCount++;
    }

    info.credibility = IdentService.computeCredibility(info);

    await this.identModel.updateOne(
      { identity },
      {
        ...info,
        lastInteractionPosition: {
          type: 'Point',
          coordinates: [location.longitude, location.latitude],
        },
      },
    );
  }

  private static computeCredibility(info: IdentInfo): number {
    let score: number = 100;

    // Unrealistic movement
    const MAX_UNREALISTIC_PENALTY = 25;

    const movementPenalty = Math.min(
      info.unrealisticMovementCount * 5,
      MAX_UNREALISTIC_PENALTY,
    );

    score -= movementPenalty;

    // Interaction interval
    const SUSPICIOUS_INTERVAL = 10 * 1000; // 10 seconds
    const NORMAL_INTERVAL = 120 * 1000; // 2 minutes

    if (info.averageInteractionInterval < SUSPICIOUS_INTERVAL) {
      score -= 25;
    } else if (info.averageInteractionInterval < NORMAL_INTERVAL) {
      const ratio =
        (NORMAL_INTERVAL - info.averageInteractionInterval) /
        (NORMAL_INTERVAL - SUSPICIOUS_INTERVAL);
      score -= ratio * 25;
    }

    // Voting bias
    if (info.voting.totalCount >= 10) {
      const upvoteRatio = info.voting.upvoteCount / info.voting.totalCount;
      if (upvoteRatio < 0.1 || upvoteRatio > 0.9) {
        score -= 20;
      }
    }

    // Registration behaviour
    if (info.registrations.totalCount >= 5 && info.voting.totalCount === 0) {
      score -= 15; // Only registering without voting is suspicious
    }

    // Low activtity
    const totalActions = info.voting.totalCount + info.registrations.totalCount;

    if (totalActions < 3) {
      score -= 10;
    }

    // New identity penalty
    const FULL_TRUST_AGE = 2 * 24 * 60 * 60 * 1000; // 2 days
    const ageMs = Date.now() - info.issuedAt.getTime();

    if (ageMs < FULL_TRUST_AGE) {
      const ageRatio = ageMs / FULL_TRUST_AGE;
      const agePenalty = (1 - ageRatio) * 40;
      score -= agePenalty;
    }

    // Final score
    score = Math.max(0, Math.min(100, Math.round(score)));

    return score;
  }

  async getMetadata(lastNDays: number): Promise<IdentMetadata> {
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

    return result[0].averageCredibility;
  }

  private static isUnrealisticallyMovement(
    lastInteractionPosition: { latitude: number; longitude: number },
    currentPosition: { latitude: number; longitude: number },
    lastInteractionAt: Date,
  ): boolean {
    const distance = calculateDistanceInKm(
      lastInteractionPosition,
      currentPosition,
    );
    const speed = calculateSpeed(
      lastInteractionPosition,
      currentPosition,
      lastInteractionAt.getTime(),
    );

    let maxAllowedSpeed: number;

    if (distance < 1) {
      // Max 10 km/h for very short distances
      maxAllowedSpeed = 10;
    } else if (distance < 10) {
      // Max 50 km/h for short distances within cities
      maxAllowedSpeed = 50;
    } else if (distance < 100) {
      // Max 120 km/h for medium distances between cities
      maxAllowedSpeed = 120;
    } else if (distance < 500) {
      // Max 200 km/h for long distances between counties or big cities
      maxAllowedSpeed = 200;
    } else if (distance < 1000) {
      // Max 700 km/h for very long distances via aircraft
      maxAllowedSpeed = 700;
    } else {
      // Max 900 km/h for very long distances across continents or oceans
      maxAllowedSpeed = 900;
    }

    return speed > maxAllowedSpeed;
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
