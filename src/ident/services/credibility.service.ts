import { Injectable } from '@nestjs/common';
import { computeCredibility } from '@kippenstummel/credlib';
import { UnknownIdentityError } from 'src/common/models';
import { calculateEwma, calculateDistanceInKm, calculateSpeed } from 'src/lib';
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

    return result.credibility.rating;
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
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      credibility: {
        rating: result.credibility.rating,
        behaviour: result.credibility.behaviour
          ? {
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
                downvoteCount:
                  result.credibility.behaviour.voting.downvoteCount,
                lastVotedAt: result.credibility.behaviour.voting.lastVotedAt,
                averageVotingInterval:
                  result.credibility.behaviour.voting.averageVotingInterval,
              },
              registration: {
                totalCount:
                  result.credibility.behaviour.registration.totalCount,
                lastRegistrationAt:
                  result.credibility.behaviour.registration.lastRegistrationAt,
                averageRegistrationInterval:
                  result.credibility.behaviour.registration
                    .averageRegistrationInterval,
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
      },
    };

    // Check for unrealistic movement
    if (
      info.credibility.behaviour!.lastInteractionPosition &&
      info.credibility.behaviour!.lastInteractionAt
    ) {
      const hasUnrealisticallyMoved: boolean =
        CredibilityService.isUnrealisticallyMovement(
          info.credibility.behaviour!.lastInteractionPosition,
          location,
          info.credibility.behaviour!.lastInteractionAt,
        );

      if (hasUnrealisticallyMoved) {
        info.credibility.behaviour!.unrealisticMovementCount++;
      }
    }

    // Calculate average interaction interval
    if (info.credibility.behaviour!.lastInteractionAt) {
      const duration =
        new Date().getTime() -
        info.credibility.behaviour!.lastInteractionAt.getTime();
      const previousEwma =
        info.credibility.behaviour!.averageInteractionInterval > 0
          ? info.credibility.behaviour!.averageInteractionInterval
          : duration;

      info.credibility.behaviour!.averageInteractionInterval = calculateEwma(
        previousEwma,
        duration,
        0.1,
      );
    }

    info.credibility.behaviour!.lastInteractionAt = new Date();
    info.credibility.behaviour!.lastInteractionPosition = location;

    if (interaction === 'upvote') {
      info.credibility.behaviour!.voting.totalCount++;
      info.credibility.behaviour!.voting.upvoteCount++;
    } else if (interaction === 'downvote') {
      info.credibility.behaviour!.voting.totalCount++;
      info.credibility.behaviour!.voting.downvoteCount++;
    } else if (interaction === 'registration') {
      info.credibility.behaviour!.registration.totalCount++;
    }

    // Update specific action behaviour
    if (interaction === 'upvote' || interaction === 'downvote') {
      // Calculate average voting interval
      if (info.credibility.behaviour!.voting.lastVotedAt) {
        const duration =
          new Date().getTime() -
          info.credibility.behaviour!.voting.lastVotedAt.getTime();
        const previousEwma =
          info.credibility.behaviour!.voting.averageVotingInterval > 0
            ? info.credibility.behaviour!.voting.averageVotingInterval
            : duration;

        info.credibility.behaviour!.voting.averageVotingInterval =
          calculateEwma(previousEwma, duration, 0.1);
      }

      info.credibility.behaviour!.voting.lastVotedAt = new Date();
    } else if (interaction === 'registration') {
      // Calculate average registration interval
      if (info.credibility.behaviour!.registration.lastRegistrationAt) {
        const duration =
          new Date().getTime() -
          info.credibility.behaviour!.registration.lastRegistrationAt.getTime();
        const previousEwma =
          info.credibility.behaviour!.registration.averageRegistrationInterval >
          0
            ? info.credibility.behaviour!.registration
                .averageRegistrationInterval
            : duration;

        info.credibility.behaviour!.registration.averageRegistrationInterval =
          calculateEwma(previousEwma, duration, 0.1);
      }

      info.credibility.behaviour!.registration.lastRegistrationAt = new Date();
    }

    // Recompute credibility
    const updatedRating = computeCredibility({
      ...info.credibility.behaviour!,
      credibility: info.credibility.rating,
      issuedAt: info.createdAt!,
    });

    await this.identModel.updateOne(
      { identity },
      {
        credibility: {
          rating: updatedRating,
          behaviour: {
            ...info.credibility.behaviour,
            lastInteractionPosition: {
              type: 'Point',
              coordinates: [location.longitude, location.latitude],
            },
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
