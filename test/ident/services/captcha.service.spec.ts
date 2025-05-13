import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CaptchaService } from '../../../src/ident/services';

const inMemoryCache = new Map<string, string>();

describe('PoWService', () => {
  let app: TestingModule;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      controllers: [],
      providers: [
        CaptchaService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              switch (key) {
                case 'CAPTCHA_EXPIRES_IN':
                  return 60 * 5;
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

  describe('generateCaptcha', () => {
    it('Should generate captcha successfully"', async () => {
      const captchaService = app.get(CaptchaService);
      const captcha = await captchaService.generateCaptcha();

      expect(captcha).toBeDefined();
    });
  });
});
