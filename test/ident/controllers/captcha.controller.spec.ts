import { Test, TestingModule } from '@nestjs/testing';
import { CaptchaController } from 'src/presentation/ident/controllers/captcha.controller';
import { CaptchaService } from 'src/core/ident/services';

describe('CaptchaController', () => {
  let app: TestingModule;
  let captchaController: CaptchaController;
  let captchaService: {
    generateCaptcha: jest.Mock;
  };

  beforeEach(async () => {
    captchaService = {
      generateCaptcha: jest.fn(),
    };

    app = await Test.createTestingModule({
      controllers: [CaptchaController],
      providers: [
        {
          provide: CaptchaService,
          useValue: captchaService,
        },
      ],
    }).compile();

    captchaController = app.get(CaptchaController);
  });

  describe('get', () => {
    it('Should return captcha dto successfully', async () => {
      captchaService.generateCaptcha.mockResolvedValue({
        id: 'captcha-id-1',
        content: Buffer.from('abc123'),
        contentType: 'image/png',
      });

      const result = await captchaController.get({ scope: 'registration' });

      expect(captchaService.generateCaptcha).toHaveBeenCalledTimes(1);
      expect(captchaService.generateCaptcha).toHaveBeenCalledWith(
        'registration',
      );
      expect(result).toEqual({
        id: 'captcha-id-1',
        content: 'data:image/png;base64,YWJjMTIz',
      });
    });
  });
});
