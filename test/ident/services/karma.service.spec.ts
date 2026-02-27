import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { KarmaService } from 'src/core/ident/services';

describe('KarmaService', () => {
  let app: TestingModule;
  let karmaService: KarmaService;
  let karmaModel: {
    updateOne: jest.Mock;
    aggregate: jest.Mock;
  };

  beforeEach(async () => {
    karmaModel = {
      updateOne: jest.fn().mockResolvedValue(undefined),
      aggregate: jest.fn(),
    };

    app = await Test.createTestingModule({
      controllers: [],
      providers: [
        KarmaService,
        {
          provide: getModelToken('Karma'),
          useValue: karmaModel,
        },
      ],
    }).compile();

    karmaService = app.get(KarmaService);
  });

  describe('applyEvent', () => {
    it('Should apply karma event successfully', async () => {
      await karmaService.applyEvent(
        '4c12ee89-4672-44dd-a23c-29c1ace369b2',
        'cvm-123',
        'upvote_received',
      );

      expect(karmaModel.updateOne).toHaveBeenCalledTimes(1);

      const [query, update, options] = karmaModel.updateOne.mock.calls[0] as [
        { identity: string },
        {
          $inc: { amount: number };
          $push: {
            history: {
              type: string;
              delta: number;
              occurredAt: Date;
              cvmId: string;
            };
          };
        },
        { upsert: boolean },
      ];

      expect(query).toEqual({
        identity: '4c12ee89-4672-44dd-a23c-29c1ace369b2',
      });
      expect(update.$inc).toEqual({ amount: 15 });
      expect(update.$push.history).toEqual({
        type: 'upvote_received',
        delta: 15,
        cvmId: 'cvm-123',
        occurredAt: update.$push.history.occurredAt,
      });
      expect(update.$push.history.occurredAt).toBeInstanceOf(Date);
      expect(options).toEqual({ upsert: true });
    });
  });

  describe('getHistoryForIdentity', () => {
    it('Should return paged karma history successfully', async () => {
      const eventA = {
        type: 'upvote_received',
        delta: 15,
        occurredAt: new Date('2026-01-01T12:00:00.000Z'),
        cvmId: 'cvm-a',
      };
      const eventB = {
        type: 'downvote_received',
        delta: -10,
        occurredAt: new Date('2025-12-31T12:00:00.000Z'),
        cvmId: 'cvm-b',
      };

      karmaModel.aggregate.mockResolvedValue([
        {
          events: [eventA, eventB],
          total: 3,
        },
      ]);

      const result = await karmaService.getHistoryForIdentity(
        '4c12ee89-4672-44dd-a23c-29c1ace369b2',
        { page: 1, perPage: 2 },
      );

      expect(karmaModel.aggregate).toHaveBeenCalledTimes(1);
      expect(karmaModel.aggregate).toHaveBeenCalledWith([
        { $match: { identity: '4c12ee89-4672-44dd-a23c-29c1ace369b2' } },
        { $project: { history: 1, _id: 0, total: { $size: '$history' } } },
        { $unwind: '$history' },
        { $sort: { 'history.occurredAt': -1 } },
        { $skip: 2 },
        { $limit: 2 },
        {
          $group: {
            _id: null,
            events: { $push: '$history' },
            total: { $first: '$total' },
          },
        },
      ]);

      expect(result).toEqual({
        content: [eventA, eventB],
        info: {
          page: 1,
          perPage: 2,
          totalElements: 3,
          totalPages: 2,
        },
      });
    });

    it('Should return empty page when no history exists', async () => {
      karmaModel.aggregate.mockResolvedValue([]);

      const result = await karmaService.getHistoryForIdentity(
        'missing-identity',
        { page: 0, perPage: 10 },
      );

      expect(result).toEqual({
        content: [],
        info: {
          page: 0,
          perPage: 10,
          totalElements: 0,
          totalPages: 0,
        },
      });
    });
  });
});
