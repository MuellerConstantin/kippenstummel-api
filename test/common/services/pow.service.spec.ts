import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { PoWService } from 'src/../src/common/services';
import { InvalidPoWStampError, PoWStamp } from 'src/../src/common/models';

const inMemoryCache = new Map<string, string>();

inMemoryCache.set(
  'pow:acd001cd6286c8c14c5415301f8d9dd7',
  '20:20250409082325:sha256:acd001cd6286c8c14c5415301f8d9dd7',
);

describe('PoWService', () => {
  let app: TestingModule;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      controllers: [],
      providers: [
        PoWService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              switch (key) {
                case 'POW_DIFFICULTY':
                  return 20;
                case 'POW_EXPIRES_IN':
                  return 60;
              }
            },
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

  describe('generateChallenge', () => {
    it('Should generate challenge successfully"', async () => {
      const powService = app.get(PoWService);
      const stamp = await powService.generateChallenge();

      expect(stamp).toBeDefined();
    });
  });

  describe('verifyChallenge', () => {
    it('Should verify challenge successfully"', async () => {
      const powService = app.get(PoWService);
      const stamp = PoWStamp.fromStamp(
        '20:20250409082325:sha256:acd001cd6286c8c14c5415301f8d9dd7:1613733',
      );
      await powService.verifyChallenge(stamp);
    });

    it('Should throw error when challenge is invalid', async () => {
      const powService = app.get(PoWService);
      const stamp = PoWStamp.fromStamp(
        '20:20250409082325:sha256:acd001cd6286c8c14c5415301f8d9dd7:1614433',
      );

      await expect(() => powService.verifyChallenge(stamp)).rejects.toThrow(
        InvalidPoWStampError,
      );
    });

    it('Should throw error when challenge is missing', async () => {
      const powService = app.get(PoWService);
      const stamp = PoWStamp.fromStamp(
        '20:20250409082325:sha256:876001caba86c8c14c5415372d8d9dd7',
      );

      await expect(() => powService.verifyChallenge(stamp)).rejects.toThrow(
        InvalidPoWStampError,
      );
    });
  });

  describe('solveChallenge', () => {
    it('Should solve challenge successfully"', async () => {
      jest.setTimeout(10000);

      const cache = app.get<Cache>(CACHE_MANAGER);

      const rawStamp = await cache.get<string>(
        'pow:acd001cd6286c8c14c5415301f8d9dd7',
      );
      const stamp = PoWStamp.fromStamp(rawStamp!);

      const solvedStamp = PoWService.solveChallenge(stamp);

      expect(solvedStamp).toBeDefined();
      expect(solvedStamp.isSolved).toBe(true);
      expect(solvedStamp).toHaveProperty('counter', 1613733);
    });
  });
});
