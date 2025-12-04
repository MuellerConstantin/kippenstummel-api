import { Injectable } from '@nestjs/common';
import {
  computeCredibility,
  isUnrealisticallyMovement,
} from '@kippenstummel/credlib';
import { UnknownIdentityError } from 'src/lib/models';
import { calculateEwma } from 'src/lib';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Credibility } from '../models';
import { Credibility as CredibilityModel } from '../repositories';

@Injectable()
export class CredibilityService {
  constructor(
    @InjectModel(CredibilityModel.name)
    private readonly credibilityModel: Model<CredibilityModel>,
  ) {}

  async getCredibility(identity: string): Promise<number> {
    const result = await this.credibilityModel.findOne({ identity });

    if (!result) {
      throw new UnknownIdentityError();
    }

    return result.rating;
  }

  async updateBehaviour(
    identity: string,
    location: {
      longitude: number;
      latitude: number;
    },
    interaction: 'upvote' | 'downvote' | 'registration',
  ): Promise<void> {
    const result = await this.credibilityModel.findOne({ identity });

    if (!result) {
      throw new UnknownIdentityError();
    }

    const info: Credibility = {
      identity: result.identity,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      rating: result.rating,
      behaviour: result.behaviour
        ? {
            lastInteractionAt: result.behaviour.lastInteractionAt,
            averageInteractionInterval:
              result.behaviour.averageInteractionInterval,
            unrealisticMovementScore: result.behaviour.unrealisticMovementScore,
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
            unrealisticMovementScore: 0,
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
      const hasUnrealisticallyMoved: boolean = isUnrealisticallyMovement(
        info.behaviour!.lastInteractionPosition,
        location,
        info.behaviour!.lastInteractionAt,
      );

      if (hasUnrealisticallyMoved) {
        info.behaviour!.unrealisticMovementScore = calculateEwma(
          info.behaviour!.unrealisticMovementScore,
          1,
          0.2,
        );
      } else {
        info.behaviour!.unrealisticMovementScore = calculateEwma(
          info.behaviour!.unrealisticMovementScore,
          0,
          0.2,
        );
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

    // Recompute credibility
    const updatedRating = computeCredibility({
      ...info.behaviour!,
      credibility: info.rating,
      issuedAt: info.createdAt!,
    });

    await this.credibilityModel.updateOne(
      { identity },
      {
        rating: updatedRating,
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
}
