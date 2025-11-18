import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { IdentService } from 'src/core/ident/services';
import { Ident } from 'src/core/ident/repositories';

const identities = new Map<string, Ident>();

identities.set('4c12ee89-4672-44dd-a23c-29c1ace369b2', {
  identity: '4c12ee89-4672-44dd-a23c-29c1ace369b2',
  secret: '0xCAFEBABE',
  createdAt: new Date(),
  updatedAt: new Date(),
  karma: {
    identity: '4c12ee89-4672-44dd-a23c-29c1ace369b2',
    amount: 100,
    history: [],
  },
  credibility: {
    identity: '4c12ee89-4672-44dd-a23c-29c1ace369b2',
    rating: 50,
    behaviour: {
      lastInteractionAt: undefined,
      averageInteractionInterval: 61231,
      lastInteractionPosition: {
        type: 'Point',
        coordinates: [48.09900075726553, 11.602646642911846],
      },
      unrealisticMovementCount: 0,
      voting: {
        totalCount: 44,
        upvoteCount: 30,
        downvoteCount: 13,
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
});

describe('IdentService', () => {
  let app: TestingModule;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
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
            findOne: jest
              .fn()
              .mockImplementation((data: { identity: string }) => ({
                populate: jest.fn(() => ({
                  populate: jest
                    .fn()
                    .mockResolvedValue(identities.get(data.identity)),
                })),
              })),
            create: jest.fn(),
          },
        },
        {
          provide: getModelToken('Credibility'),
          useValue: {
            create: () =>
              Promise.resolve(
                identities.get('4c12ee89-4672-44dd-a23c-29c1ace369b2')!
                  .credibility,
              ),
          },
        },
        {
          provide: getModelToken('Karma'),
          useValue: {
            create: () =>
              Promise.resolve(
                identities.get('4c12ee89-4672-44dd-a23c-29c1ace369b2')!.karma,
              ),
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

  describe('issueIdentity', () => {
    it('Should generate identity successfully"', async () => {
      const identService = app.get(IdentService);
      const identity = await identService.issueIdentity();

      expect(identity).toBeDefined();
    });
  });

  describe('getIdentity', () => {
    it('Should get identity info successfully"', async () => {
      const identService = app.get(IdentService);
      const identInfo = await identService.getIdentity(
        '4c12ee89-4672-44dd-a23c-29c1ace369b2',
      );

      expect(identInfo).toBeDefined();
    });
  });
});
