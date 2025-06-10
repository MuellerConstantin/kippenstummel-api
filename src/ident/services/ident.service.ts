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
import {
  calculateEwma,
  calculateDistanceInKm,
  calculateSpeed,
  computeCredibility,
} from 'src/lib';
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

    info.credibility = computeCredibility({
      ...info.behaviour,
      issuedAt: info.issuedAt,
    });

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

    info.credibility = computeCredibility({
      ...info.behaviour,
      issuedAt: info.issuedAt,
    });

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
