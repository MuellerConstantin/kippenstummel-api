import * as crypto from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { IdentToken, IdentInfo } from '../models';
import {
  InvalidIdentTokenError,
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

  async generateIdentToken(existingIdentity?: string): Promise<IdentToken> {
    let identity: string;

    if (existingIdentity) {
      identity = existingIdentity;

      if (!(await this.existsIdentity(identity))) {
        await this.registerIdentity(identity);
      }
    } else {
      identity = crypto.randomUUID();

      await this.registerIdentity(identity);
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

  async registerIdentity(identity: string): Promise<IdentInfo> {
    const info: IdentInfo = {
      identity,
      issuedAt: new Date(),
      lastInteractionAt: undefined,
      averageInteractionInterval: 0,
      lastInteractionPosition: undefined,
      unrealisticMovementCount: 0,
      voting: { totalCount: 0, upvoteCount: 0, downvoteCount: 0 },
      registrations: { totalCount: 0 },
    };

    await this.identModel.create(info);

    return info;
  }

  async unregisterIdentity(identity: string): Promise<void> {
    await this.identModel.deleteOne({ identity });
  }

  async existsIdentity(identity: string): Promise<boolean> {
    return (await this.identModel.countDocuments({ identity })) > 0;
  }

  async getIdentityInfo(identity: string): Promise<IdentInfo | null> {
    const result = await this.identModel.findOne({ identity }).exec();

    if (!result) {
      return null;
    }

    return {
      identity: result.identity,
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

  async updateIdentityInfo(
    identity: string,
    location: {
      longitude: number;
      latitude: number;
    },
    interaction: 'upvote' | 'downvote' | 'registration',
  ): Promise<void> {
    let info = await this.getIdentityInfo(identity);

    if (!info) {
      info = await this.registerIdentity(identity);
    }

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

  async getIdentityCredibility(identity: string): Promise<number> {
    const info = await this.getIdentityInfo(identity);

    if (!info) {
      throw new UnknownIdentityError();
    }

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
}
