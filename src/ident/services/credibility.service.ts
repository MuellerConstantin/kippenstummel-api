import { Injectable } from '@nestjs/common';
import { UnknownIdentityError } from 'src/common/models';
import {
  calculateEwma,
  calculateDistanceInKm,
  calculateSpeed,
  computeCredibility,
} from 'src/lib';
import { InjectModel } from '@nestjs/mongoose';
import { Ident } from '../repositories';
import { Model } from 'mongoose';
import { IdentInfo } from '../models';

@Injectable()
export class CredibilityService {
  constructor(
    @InjectModel(Ident.name) private readonly identModel: Model<Ident>,
  ) {}

  async getCredibility(identity: string): Promise<number> {
    const result = await this.identModel.findOne({ identity });

    if (!result) {
      throw new UnknownIdentityError();
    }

    return result.credibility;
  }

  async updateBehaviour(
    identity: string,
    location: {
      longitude: number;
      latitude: number;
    },
    interaction: 'upvote' | 'downvote' | 'registration',
  ): Promise<void> {
    const result = await this.identModel.findOne({ identity });

    if (!result) {
      throw new UnknownIdentityError();
    }

    const info: IdentInfo = {
      identity: result.identity,
      credibility: result.credibility,
      issuedAt: result.issuedAt,
      behaviour: result.behaviour
        ? {
            lastInteractionAt: result.behaviour.lastInteractionAt,
            averageInteractionInterval:
              result.behaviour.averageInteractionInterval,
            unrealisticMovementCount: result.behaviour.unrealisticMovementCount,
            lastInteractionPosition: result.behaviour.lastInteractionPosition
              ? {
                  longitude:
                    result.behaviour.lastInteractionPosition.coordinates[0],
                  latitude:
                    result.behaviour.lastInteractionPosition.coordinates[1],
                }
              : undefined,
            voting: {
              totalCount: result.behaviour.voting.totalCount,
              upvoteCount: result.behaviour.voting.upvoteCount,
              downvoteCount: result.behaviour.voting.downvoteCount,
              lastVotedAt: result.behaviour.voting.lastVotedAt,
              averageVotingInterval:
                result.behaviour.voting.averageVotingInterval,
            },
            registration: {
              totalCount: result.behaviour.registration.totalCount,
              lastRegistrationAt:
                result.behaviour.registration.lastRegistrationAt,
              averageRegistrationInterval:
                result.behaviour.registration.averageRegistrationInterval,
            },
          }
        : {
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
            registration: {
              totalCount: 0,
              lastRegistrationAt: undefined,
              averageRegistrationInterval: 0,
            },
          },
    };

    // Check for unrealistic movement
    if (
      info.behaviour!.lastInteractionPosition &&
      info.behaviour!.lastInteractionAt
    ) {
      const hasUnrealisticallyMoved: boolean =
        CredibilityService.isUnrealisticallyMovement(
          info.behaviour!.lastInteractionPosition,
          location,
          info.behaviour!.lastInteractionAt,
        );

      if (hasUnrealisticallyMoved) {
        info.behaviour!.unrealisticMovementCount++;
      }
    }

    // Calculate average interaction interval
    if (info.behaviour!.lastInteractionAt) {
      const duration =
        new Date().getTime() - info.behaviour!.lastInteractionAt.getTime();
      const previousEwma =
        info.behaviour!.averageInteractionInterval > 0
          ? info.behaviour!.averageInteractionInterval
          : duration;

      info.behaviour!.averageInteractionInterval = calculateEwma(
        previousEwma,
        duration,
        0.1,
      );
    }

    info.behaviour!.lastInteractionAt = new Date();
    info.behaviour!.lastInteractionPosition = location;

    if (interaction === 'upvote') {
      info.behaviour!.voting.totalCount++;
      info.behaviour!.voting.upvoteCount++;
    } else if (interaction === 'downvote') {
      info.behaviour!.voting.totalCount++;
      info.behaviour!.voting.downvoteCount++;
    } else if (interaction === 'registration') {
      info.behaviour!.registration.totalCount++;
    }

    info.credibility = computeCredibility({
      ...info.behaviour!,
      issuedAt: info.issuedAt,
    });

    // Update specific action behaviour
    if (interaction === 'upvote' || interaction === 'downvote') {
      // Calculate average voting interval
      if (info.behaviour!.voting.lastVotedAt) {
        const duration =
          new Date().getTime() - info.behaviour!.voting.lastVotedAt.getTime();
        const previousEwma =
          info.behaviour!.voting.averageVotingInterval > 0
            ? info.behaviour!.voting.averageVotingInterval
            : duration;

        info.behaviour!.voting.averageVotingInterval = calculateEwma(
          previousEwma,
          duration,
          0.1,
        );
      }

      info.behaviour!.voting.lastVotedAt = new Date();
    } else if (interaction === 'registration') {
      // Calculate average registration interval
      if (info.behaviour!.registration.lastRegistrationAt) {
        const duration =
          new Date().getTime() -
          info.behaviour!.registration.lastRegistrationAt.getTime();
        const previousEwma =
          info.behaviour!.registration.averageRegistrationInterval > 0
            ? info.behaviour!.registration.averageRegistrationInterval
            : duration;

        info.behaviour!.registration.averageRegistrationInterval =
          calculateEwma(previousEwma, duration, 0.1);
      }

      info.behaviour!.registration.lastRegistrationAt = new Date();
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
