import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { IdentService } from '../../../src/ident/services';
import { JwtService } from '@nestjs/jwt';

const inMemoryCache = new Map<string, string>();

inMemoryCache.set(
  'ident:ff19b9fc-8f20-40dc-9be8-c6393848b0a7',
  JSON.stringify({
    identity: 'ff19b9fc-8f20-40dc-9be8-c6393848b0a7',
    issuedAt: 1,
    lastInteractionAt: 2,
    averageInteractionInterval: 3,
    lastInteractionPosition: { longitude: 4, latitude: 5 },
    unrealisticMovementCount: 6,
    voting: { totalCount: 7, upvoteCount: 8, downvoteCount: 9 },
    registrations: { totalCount: 10 },
  }),
);

describe('IdentService', () => {
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
          provide: JwtService,
          useValue: {
            signAsync: () => Promise.resolve('token'),
            verifyAsync: () =>
              Promise.resolve({
                identity: 'ff19b9fc-8f20-40dc-9be8-c6393848b0a7',
              }),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: (key: string) => inMemoryCache.get(key),
            set: (key: string, value: string) => inMemoryCache.set(key, value),
            del: () => {},
          },
        },
      ],
    }).compile();
  });

  describe('generateIdentToken', () => {
    it('Should generate ident token with new identity successfully"', async () => {
      const identService = app.get(IdentService);
      const identToken = await identService.generateIdentToken();

      expect(identToken).toBeDefined();
    });
  });

  describe('getIdentityInfo', () => {
    it('Should get identity info successfully"', async () => {
      const identService = app.get(IdentService);
      const identInfo = await identService.getIdentityInfo(
        'ff19b9fc-8f20-40dc-9be8-c6393848b0a7',
      );

      expect(identInfo).toBeDefined();
    });
  });

  describe('getIdentityCredibility', () => {
    it('Should get identity credibility successfully"', async () => {
      const identService = app.get(IdentService);
      const credibility = await identService.getIdentityCredibility(
        'ff19b9fc-8f20-40dc-9be8-c6393848b0a7',
      );

      expect(credibility).toBeDefined();
    });
  });
});
