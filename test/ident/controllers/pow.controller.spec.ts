import { Test, TestingModule } from '@nestjs/testing';
import { PoWController } from 'src/presentation/ident/controllers/pow.controller';
import { PoWService } from 'src/core/ident/services';

describe('PoWController', () => {
  let app: TestingModule;
  let powController: PoWController;
  let powService: {
    generateChallenge: jest.Mock;
  };

  beforeEach(async () => {
    powService = {
      generateChallenge: jest.fn(),
    };

    app = await Test.createTestingModule({
      controllers: [PoWController],
      providers: [
        {
          provide: PoWService,
          useValue: powService,
        },
      ],
    }).compile();

    powController = app.get(PoWController);
  });

  describe('get', () => {
    it('Should set x-pow header and send response successfully', async () => {
      powService.generateChallenge.mockResolvedValue({
        toStamp: () => '20:20260227000000:sha256:test-resource:12345',
      });

      const send = jest.fn();
      const header = jest.fn().mockReturnValue({ send });
      const res = { header };

      await powController.get(res as never, {
        scope: 'registration',
      });

      expect(powService.generateChallenge).toHaveBeenCalledTimes(1);
      expect(powService.generateChallenge).toHaveBeenCalledWith('registration');
      expect(header).toHaveBeenCalledTimes(1);
      expect(header).toHaveBeenCalledWith(
        'X-PoW',
        '20:20260227000000:sha256:test-resource:12345',
      );
      expect(send).toHaveBeenCalledTimes(1);
    });
  });
});
