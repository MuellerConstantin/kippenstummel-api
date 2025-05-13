import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
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

const inMemoryCache = new Map<string, string>();

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

  beforeEach(() => {
    inMemoryCache.clear();
  });

  const simulateProfile = async (
    name: string,
    profileGenerator: () => IdentInfo,
    count: number,
  ) => {
    const identities: string[] = [];

    for (let index = 0; index < count; index++) {
      const ident = profileGenerator();

      identities.push(ident.identity);
      inMemoryCache.set(`ident:${ident.identity}`, JSON.stringify(ident));
    }

    const identService = app.get(IdentService);
    const credibilities: number[] = [];

    for (let index = 0; index < count; index++) {
      const credibility = await identService.getIdentityCredibility(
        identities[index],
      );
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
