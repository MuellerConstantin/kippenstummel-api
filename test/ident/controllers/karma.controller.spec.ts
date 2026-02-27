import { Test, TestingModule } from '@nestjs/testing';
import { KarmaController } from 'src/presentation/ident/controllers/karma.controller';
import { KarmaService } from 'src/core/ident/services';
import { IdentGuard } from 'src/presentation/ident/controllers/ident.guard';

describe('KarmaController', () => {
  let app: TestingModule;
  let karmaController: KarmaController;
  let karmaService: {
    getHistoryForIdentity: jest.Mock;
  };

  beforeEach(async () => {
    karmaService = {
      getHistoryForIdentity: jest.fn(),
    };

    app = await Test.createTestingModule({
      controllers: [KarmaController],
      providers: [
        {
          provide: KarmaService,
          useValue: karmaService,
        },
      ],
    })
      .overrideGuard(IdentGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    karmaController = app.get(KarmaController);
  });

  describe('getHistory', () => {
    it('Should return karma history using provided page and perPage', async () => {
      const historyPage = {
        content: [
          {
            type: 'upvote_received',
            delta: 15,
            occurredAt: new Date('2026-02-27T10:00:00.000Z'),
            cvmId: 'cvm-1',
          },
        ],
        info: {
          page: 1,
          perPage: 10,
          totalElements: 1,
          totalPages: 1,
        },
      };
      karmaService.getHistoryForIdentity.mockResolvedValue(historyPage);

      const result = await karmaController.getHistory(
        '4c12ee89-4672-44dd-a23c-29c1ace369b2',
        {
          page: 1,
          perPage: 10,
        },
      );

      expect(karmaService.getHistoryForIdentity).toHaveBeenCalledTimes(1);
      expect(karmaService.getHistoryForIdentity).toHaveBeenCalledWith(
        '4c12ee89-4672-44dd-a23c-29c1ace369b2',
        { page: 1, perPage: 10 },
      );
      expect(result).toEqual(historyPage);
    });

    it('Should fall back to default page and perPage when missing', async () => {
      const historyPage = {
        content: [],
        info: {
          page: 0,
          perPage: 25,
          totalElements: 0,
          totalPages: 0,
        },
      };
      karmaService.getHistoryForIdentity.mockResolvedValue(historyPage);

      const result = await karmaController.getHistory(
        '4c12ee89-4672-44dd-a23c-29c1ace369b2',
        {
          page: undefined as unknown as number,
          perPage: undefined as unknown as number,
        },
      );

      expect(karmaService.getHistoryForIdentity).toHaveBeenCalledWith(
        '4c12ee89-4672-44dd-a23c-29c1ace369b2',
        { page: 0, perPage: 25 },
      );
      expect(result).toEqual(historyPage);
    });
  });
});
