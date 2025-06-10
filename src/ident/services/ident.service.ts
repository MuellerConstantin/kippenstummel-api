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
import { calculateEwma, calculateDistanceInKm, calculateSpeed } from 'src/lib';
import { InjectModel } from '@nestjs/mongoose';
import { Ident } from '../repositories';
import { Model } from 'mongoose';

export class CredibilityHeuristic {
  public static computeCredibility(
    info: IdentInfo,
    trace?: Map<string, number>,
  ): number {
    const rules = new Map<string, (info: IdentInfo) => number>();
    let score: number = 100;

    rules.set('unrealisticMovementCountPenalty', (info) =>
      CredibilityHeuristic.evalUnrealisticMovementCountPenalty(info),
    );
    rules.set('interactionFrequencyPenalty', (info) =>
      CredibilityHeuristic.evalInteractionFrequencyPenalty(info),
    );
    rules.set('votingBiasPenalty', (info) =>
      CredibilityHeuristic.evalVotingBiasPenalty(info),
    );
    rules.set('noVotePenalty', (info) =>
      CredibilityHeuristic.evalNoVotePenalty(info),
    );
    rules.set('registrationAbusePenalty', (info) =>
      CredibilityHeuristic.evalRegistrationAbusePenalty(info),
    );
    rules.set('votingAbusePenalty', (info) =>
      CredibilityHeuristic.evalVotingAbusePenalty(info),
    );
    rules.set('inactivePenalty', (info) =>
      CredibilityHeuristic.evalInactivePenalty(info),
    );
    rules.set('identityAgePenalty', (info) =>
      CredibilityHeuristic.evalIdentityAgePenalty(info),
    );
    rules.set('unrealisticVotingBehaviourPenalty', (info) =>
      CredibilityHeuristic.evalUnrealisticVotingBehaviourPenalty(info),
    );
    rules.set('unrealisticRegistrationBehaviourPenalty', (info) =>
      CredibilityHeuristic.evalUnrealisticRegistrationBehaviourPenalty(info),
    );

    for (const [ruleName, rule] of rules) {
      const change = rule(info);
      score += change;

      if (trace) {
        trace.set(ruleName, change);
      }
    }

    // Final score
    score = Math.max(0, Math.min(100, Math.round(score)));

    return score;
  }

  public static evalUnrealisticMovementCountPenalty(info: IdentInfo) {
    const MAX_PENALTY = 40;
    const count = info.behaviour.unrealisticMovementCount;
    return -Math.min(Math.round(Math.pow(count, 2)), MAX_PENALTY);
  }

  public static evalInteractionFrequencyPenalty(info: IdentInfo) {
    const interval = info.behaviour.averageInteractionInterval;
    const MAX_PENALTY = 25;
    const MIN_INTERVAL = 5 * 1000; // 5 seconds
    const MAX_INTERVAL = 3 * 60 * 1000; // 3 minutes

    if (interval < MIN_INTERVAL) return -MAX_PENALTY;

    if (interval >= MAX_INTERVAL) return 0;

    const ratio = (MAX_INTERVAL - interval) / (MAX_INTERVAL - MIN_INTERVAL);
    return -Math.round(ratio * MAX_PENALTY);
  }

  public static evalVotingBiasPenalty(info: IdentInfo) {
    const MAX_PENALTY = 20;

    if (info.behaviour.voting.totalCount < 10) return 0;

    const ratio =
      info.behaviour.voting.upvoteCount / info.behaviour.voting.totalCount;
    const bias = Math.abs(0.5 - ratio);

    return -Math.round(Math.pow(bias * 2, 2) * MAX_PENALTY);
  }

  public static evalNoVotePenalty(info: IdentInfo) {
    if (
      info.behaviour.registrations.totalCount >= 5 &&
      info.behaviour.voting.totalCount === 0
    ) {
      const excess = info.behaviour.registrations.totalCount - 5;
      return -15 - Math.min(excess * 2, 10);
    }

    return 0;
  }

  public static evalRegistrationAbusePenalty(info: IdentInfo) {
    return -CredibilityHeuristic.penaltyForAverageInterval(
      info.behaviour.registrations.averageRegistrationInterval,
      info.behaviour.registrations.totalCount,
      5 * 60 * 1000,
      20,
    );
  }

  public static evalVotingAbusePenalty(info: IdentInfo) {
    return -CredibilityHeuristic.penaltyForAverageInterval(
      info.behaviour.voting.averageVotingInterval,
      info.behaviour.voting.totalCount,
      5 * 60 * 1000,
      20,
    );
  }

  public static evalInactivePenalty(info: IdentInfo) {
    const total =
      info.behaviour.voting.totalCount +
      info.behaviour.registrations.totalCount;

    if (total >= 5) return 0;
    return -Math.round((5 - total) * 2);
  }

  public static evalIdentityAgePenalty(info: IdentInfo) {
    const ageMs = Date.now() - info.issuedAt.getTime();
    const DAY = 24 * 60 * 60 * 1000;

    if (ageMs >= 28 * DAY) {
      // Since the 28th day, no penalty
      return 0;
    } else if (ageMs <= 2 * DAY) {
      // Linear penalty between 30 and 40 for the first 2 days
      const ratio = ageMs / (2 * DAY);
      return -Math.round((1 - ratio) * 30 + 10);
    } else {
      // Up to the 28th day linearly decreasing from -10 to 0
      const ratio = (ageMs - 2 * DAY) / (26 * DAY);
      return -Math.round((1 - ratio) * 10);
    }
  }

  public static penaltyForAverageInterval(
    interval: number,
    count: number,
    minInterval: number,
    penaltyCap: number,
  ): number {
    if (count < 5) return 0;
    const severity = Math.max(0, 1 - interval / minInterval);
    const scaling = Math.min(1, Math.log(count + 1) / Math.log(50));
    return Math.round(penaltyCap * severity * scaling);
  }

  public static evalUnrealisticVotingBehaviourPenalty(info: IdentInfo) {
    const issuedNDaysAgo =
      (Date.now() - info.issuedAt.getTime()) / 1000 / 60 / 60 / 24;
    const averageVotesPerDay =
      info.behaviour.voting.totalCount / issuedNDaysAgo;

    if (averageVotesPerDay < 0.5) return 0;

    return -Math.round(Math.pow(averageVotesPerDay, 2) * 10);
  }

  public static evalUnrealisticRegistrationBehaviourPenalty(info: IdentInfo) {
    const issuedNDaysAgo =
      (Date.now() - info.issuedAt.getTime()) / 1000 / 60 / 60 / 24;
    const averageRegistrationsPerDay =
      info.behaviour.registrations.totalCount / issuedNDaysAgo;

    if (averageRegistrationsPerDay < 0.25) return 0;

    return -Math.round(Math.pow(averageRegistrationsPerDay, 2) * 10);
  }
}

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
      behaviour: {
        lastInteractionAt: undefined,
        averageInteractionInterval: 0,
        lastInteractionPosition: undefined,
        unrealisticMovementCount: 0,
        voting: {
          totalCount: 0,
          upvoteCount: 0,
          downvoteCount: 0,
          lastVotedAt: undefined,
          averageVotingInterval: 0,
        },
        registrations: {
          totalCount: 0,
          lastRegistrationAt: undefined,
          averageRegistrationInterval: 0,
        },
      },
    };

    info.credibility = CredibilityHeuristic.computeCredibility(info);

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
      behaviour: {
        lastInteractionAt: result.behaviour.lastInteractionAt,
        averageInteractionInterval: result.behaviour.averageInteractionInterval,
        unrealisticMovementCount: result.behaviour.unrealisticMovementCount,
        lastInteractionPosition: result.behaviour.lastInteractionPosition
          ? {
              longitude:
                result.behaviour.lastInteractionPosition.coordinates[0],
              latitude: result.behaviour.lastInteractionPosition.coordinates[1],
            }
          : undefined,
        voting: {
          totalCount: result.behaviour.voting.totalCount,
          upvoteCount: result.behaviour.voting.upvoteCount,
          downvoteCount: result.behaviour.voting.downvoteCount,
          lastVotedAt: result.behaviour.voting.lastVotedAt,
          averageVotingInterval: result.behaviour.voting.averageVotingInterval,
        },
        registrations: {
          totalCount: result.behaviour.registrations.totalCount,
          lastRegistrationAt: result.behaviour.registrations.lastRegistrationAt,
          averageRegistrationInterval:
            result.behaviour.registrations.averageRegistrationInterval,
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
        credibility: ident.credibility,
        issuedAt: ident.issuedAt,
        behaviour: {
          lastInteractionAt: ident.behaviour.lastInteractionAt,
          averageInteractionInterval:
            ident.behaviour.averageInteractionInterval,
          unrealisticMovementCount: ident.behaviour.unrealisticMovementCount,
          lastInteractionPosition: ident.behaviour.lastInteractionPosition
            ? {
                longitude:
                  ident.behaviour.lastInteractionPosition.coordinates[0],
                latitude:
                  ident.behaviour.lastInteractionPosition.coordinates[1],
              }
            : undefined,
          voting: {
            totalCount: ident.behaviour.voting.totalCount,
            upvoteCount: ident.behaviour.voting.upvoteCount,
            downvoteCount: ident.behaviour.voting.downvoteCount,
            lastVotedAt: ident.behaviour.voting.lastVotedAt,
            averageVotingInterval: ident.behaviour.voting.averageVotingInterval,
          },
          registrations: {
            totalCount: ident.behaviour.registrations.totalCount,
            lastRegistrationAt:
              ident.behaviour.registrations.lastRegistrationAt,
            averageRegistrationInterval:
              ident.behaviour.registrations.averageRegistrationInterval,
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
    if (
      info.behaviour.lastInteractionPosition &&
      info.behaviour.lastInteractionAt
    ) {
      const hasUnrealisticallyMoved: boolean =
        IdentService.isUnrealisticallyMovement(
          info.behaviour.lastInteractionPosition,
          location,
          info.behaviour.lastInteractionAt,
        );

      if (hasUnrealisticallyMoved) {
        info.behaviour.unrealisticMovementCount++;
      }
    }

    // Calculate average interaction interval
    if (info.behaviour.lastInteractionAt) {
      const duration =
        new Date().getTime() - info.behaviour.lastInteractionAt.getTime();
      const previousEwma =
        info.behaviour.averageInteractionInterval > 0
          ? info.behaviour.averageInteractionInterval
          : duration;

      info.behaviour.averageInteractionInterval = calculateEwma(
        previousEwma,
        duration,
        0.1,
      );
    }

    info.behaviour.lastInteractionAt = new Date();
    info.behaviour.lastInteractionPosition = location;

    if (interaction === 'upvote') {
      info.behaviour.voting.totalCount++;
      info.behaviour.voting.upvoteCount++;
    } else if (interaction === 'downvote') {
      info.behaviour.voting.totalCount++;
      info.behaviour.voting.downvoteCount++;
    } else if (interaction === 'registration') {
      info.behaviour.registrations.totalCount++;
    }

    info.credibility = CredibilityHeuristic.computeCredibility(info);

    // Update specific action behaviour
    if (interaction === 'upvote' || interaction === 'downvote') {
      // Calculate average voting interval
      if (info.behaviour.voting.lastVotedAt) {
        const duration =
          new Date().getTime() - info.behaviour.voting.lastVotedAt.getTime();
        const previousEwma =
          info.behaviour.voting.averageVotingInterval > 0
            ? info.behaviour.voting.averageVotingInterval
            : duration;

        info.behaviour.voting.averageVotingInterval = calculateEwma(
          previousEwma,
          duration,
          0.1,
        );
      }

      info.behaviour.voting.lastVotedAt = new Date();
    } else if (interaction === 'registration') {
      // Calculate average registration interval
      if (info.behaviour.registrations.lastRegistrationAt) {
        const duration =
          new Date().getTime() -
          info.behaviour.registrations.lastRegistrationAt.getTime();
        const previousEwma =
          info.behaviour.registrations.averageRegistrationInterval > 0
            ? info.behaviour.registrations.averageRegistrationInterval
            : duration;

        info.behaviour.registrations.averageRegistrationInterval =
          calculateEwma(previousEwma, duration, 0.1);
      }

      info.behaviour.registrations.lastRegistrationAt = new Date();
    }

    await this.identModel.updateOne(
      { identity },
      {
        ...info,
        behaviour: {
          ...info.behaviour,
          lastInteractionPosition: {
            type: 'Point',
            coordinates: [location.longitude, location.latitude],
          },
        },
      },
    );
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
