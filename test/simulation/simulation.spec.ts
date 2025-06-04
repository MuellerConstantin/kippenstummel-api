import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { IdentService } from 'src/ident/services';
import { IdentInfo } from 'src/ident/models';
import { JwtService } from '@nestjs/jwt';
import {
  generateNormalIdent,
  generateMaliciousRegistrationIdent,
  generateMaliciousVotingIdent,
  generateNewbieIdent,
  generatePowerIdent,
} from './profiles';
import { Ident } from 'src/ident/repositories';

const identities = new Map<string, Ident>();

describe('CredibilitySimulation', () => {
  let app: TestingModule;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      controllers: [],
      providers: [
        IdentService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              switch (key) {
                case 'IDENT_SECRET':
                  return '0xCAFEBABE';
              }
            },
          },
        },
        {
          provide: getModelToken('Ident'),
          useValue: {
            findOne: (data: { identity: string }) =>
              Promise.resolve(identities.get(data.identity)),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: () => Promise.resolve('token'),
            verifyAsync: () =>
              Promise.resolve({
                identity: 'ff19b9fc-8f20-40dc-9be8-c6393848b0a7',
              }),
          },
        },
      ],
    }).compile();
  });

  const simulateProfile = async (
    name: string,
    profileGenerator: () => IdentInfo,
    count: number,
  ) => {
    for (let index = 0; index < count; index++) {
      const result = profileGenerator();

      identities.set(result.identity, {
        identity: result.identity,
        secret: '0xCAFEBABE',
        credibility: result.credibility,
        issuedAt: result.issuedAt,
        lastInteractionAt: result.lastInteractionAt,
        averageInteractionInterval: result.averageInteractionInterval,
        unrealisticMovementCount: result.unrealisticMovementCount,
        lastInteractionPosition: result.lastInteractionPosition
          ? {
              type: 'Point',
              coordinates: [
                result.lastInteractionPosition.longitude,
                result.lastInteractionPosition.latitude,
              ],
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
      });
    }

    const identService = app.get(IdentService);
    const credibilities: number[] = [];

    for (const ident of identities.values()) {
      const credibility = await identService.getCredibility(ident.identity);
      credibilities.push(credibility);
    }

    const average =
      credibilities.reduce((a, b) => a + b, 0) / credibilities.length;

    const output = `Profile: ${name}\nAverage Credibility: ${average}\nMin: ${Math.min(...credibilities)} Max: ${Math.max(...credibilities)}`;

    console.log(output);
  };

  describe('simulate', () => {
    it('Should run normal user simulation successfully"', async () => {
      await simulateProfile('normal', generateNormalIdent, 5000);
    });

    it('Should run malicious registration user simulation successfully"', async () => {
      await simulateProfile(
        'malicious-registration',
        generateMaliciousRegistrationIdent,
        5000,
      );
    });

    it('Should run malicious voting user simulation successfully"', async () => {
      await simulateProfile(
        'malicious-voting',
        generateMaliciousVotingIdent,
        5000,
      );
    });

    it('Should run newbie user simulation successfully"', async () => {
      await simulateProfile('newbie', generateNewbieIdent, 5000);
    });

    it('Should run power user simulation successfully"', async () => {
      await simulateProfile('power', generatePowerIdent, 5000);
    });
  });
});
