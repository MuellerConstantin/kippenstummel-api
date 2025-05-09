import * as crypto from 'crypto';
import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { JwtService } from '@nestjs/jwt';
import { IdentToken, IdentInfo, InvalidIdentTokenError } from '../models';
import {
  calculateEwma,
  calculateDistanceInKm,
  calculateSpeed,
} from '../../lib';

@Injectable()
export class IdentService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
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
      issuedAt: new Date().getTime(),
      lastInteractionAt: null,
      averageInteractionInterval: 0,
      lastInteractionPosition: null,
      unrealisticMovementCount: 0,
      voting: { totalCount: 0, upvoteCount: 0, downvoteCount: 0 },
      registrations: { totalCount: 0 },
    };

    await this.cacheManager.set(`ident:${identity}`, JSON.stringify(info));

    return info;
  }

  async unregisterIdentity(identity: string): Promise<void> {
    await this.cacheManager.del(`ident:${identity}`);
  }

  async existsIdentity(identity: string): Promise<boolean> {
    const value = await this.cacheManager.get<string>(`ident:${identity}`);

    return !!value;
  }

  async getIdentityInfo(identity: string): Promise<IdentInfo | null> {
    const value = await this.cacheManager.get<string>(`ident:${identity}`);

    if (!value) {
      return null;
    }

    return JSON.parse(value) as IdentInfo;
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
      const duration = new Date().getTime() - info.lastInteractionAt;
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

    info.lastInteractionAt = new Date().getTime();
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

    await this.cacheManager.set(`ident:${identity}`, JSON.stringify(info));
  }

  private static isUnrealisticallyMovement(
    lastInteractionPosition: { latitude: number; longitude: number },
    currentPosition: { latitude: number; longitude: number },
    lastInteractionAt: number,
  ): boolean {
    const distance = calculateDistanceInKm(
      lastInteractionPosition,
      currentPosition,
    );
    const speed = calculateSpeed(
      lastInteractionPosition,
      currentPosition,
      lastInteractionAt,
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
