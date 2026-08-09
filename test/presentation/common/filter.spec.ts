import { RsqlToMongoTransformer } from 'src/presentation/common/controllers';
import { InvalidFilterQueryError } from 'src/lib/models';

describe('RsqlToMongoTransformer', () => {
  describe('comparison operators', () => {
    const transformer = new RsqlToMongoTransformer();

    it.each([
      ['score==5', { score: '5' }],
      ['score!=5', { score: { $ne: '5' } }],
      ['score<=5', { score: { $lte: '5' } }],
      ['score>=5', { score: { $gte: '5' } }],
      ['score<5', { score: { $lt: '5' } }],
      ['score>5', { score: { $gt: '5' } }],
      ['score=in=(1,2)', { score: { $in: ['1', '2'] } }],
      ['score=out=(1,2)', { score: { $nin: ['1', '2'] } }],
      ['score=like=foo', { score: { $regex: 'foo' } }],
    ])('Should translate %s', (rsql, expected) => {
      const result = transformer.transform(rsql);

      expect(result).toEqual({ useAggregate: false, filter: expected });
    });
  });

  describe('logic operators', () => {
    const transformer = new RsqlToMongoTransformer();

    it('Should translate a conjunction', () => {
      const result = transformer.transform('score==5;imported==true');

      expect(result).toEqual({
        useAggregate: false,
        filter: { $and: [{ score: '5' }, { imported: 'true' }] },
      });
    });

    it('Should translate a disjunction', () => {
      const result = transformer.transform('score==5,score==6');

      expect(result).toEqual({
        useAggregate: false,
        filter: { $or: [{ score: '5' }, { score: '6' }] },
      });
    });

    it('Should treat the verbose "and" like a semicolon', () => {
      expect(transformer.transform('score==5 and imported==true')).toEqual(
        transformer.transform('score==5;imported==true'),
      );
    });

    it('Should nest logic nodes', () => {
      const result = transformer.transform(
        '(score==5,score==6);imported==true',
      );

      expect(result).toEqual({
        useAggregate: false,
        filter: {
          $and: [
            { $or: [{ score: '5' }, { score: '6' }] },
            { imported: 'true' },
          ],
        },
      });
    });
  });

  describe('invalid input', () => {
    const transformer = new RsqlToMongoTransformer();

    it.each([['score=='], ['=='], ['score'], ['((score==5)']])(
      'Should reject unparsable rsql %s',
      (rsql) => {
        expect(() => transformer.transform(rsql)).toThrow(
          InvalidFilterQueryError,
        );
      },
    );
  });

  describe('reference resolution', () => {
    it('Should stay a plain filter while no reference is touched', () => {
      const transformer = new RsqlToMongoTransformer([
        { collection: 'votes', localField: '_id', foreignField: 'cvm' },
      ]);

      expect(transformer.transform('score==5')).toEqual({
        useAggregate: false,
        filter: { score: '5' },
      });
    });

    it('Should build a lookup pipeline once a reference is used', () => {
      const transformer = new RsqlToMongoTransformer([
        { collection: 'karmas', localField: 'karma', foreignField: '_id' },
      ]);

      const result = transformer.transform('karma.amount>=10');

      expect(result).toEqual({
        useAggregate: true,
        pipeline: [
          {
            $lookup: {
              from: 'karmas',
              localField: 'karma',
              foreignField: '_id',
              as: 'karma',
            },
          },
          {
            $unwind: { path: '$karma', preserveNullAndEmptyArrays: false },
          },
          { $match: { 'karma.amount': { $gte: '10' } } },
        ],
      });
    });

    it('Should project computed fields away instead of unwinding', () => {
      const transformer = new RsqlToMongoTransformer([
        {
          collection: 'votes',
          localField: '_id',
          foreignField: 'cvm',
          as: '_votes',
          computedFields: { lastVotedAt: { $max: '$_votes.createdAt' } },
        },
      ]);

      const result = transformer.transform('lastVotedAt>=2026-01-01');

      expect(result).toEqual({
        useAggregate: true,
        pipeline: [
          {
            $lookup: {
              from: 'votes',
              localField: '_id',
              foreignField: 'cvm',
              as: '_votes',
            },
          },
          { $addFields: { lastVotedAt: { $max: '$_votes.createdAt' } } },
          { $project: { _votes: 0 } },
          { $match: { lastVotedAt: { $gte: '2026-01-01' } } },
        ],
      });
    });

    it('Should reset reference state between calls', () => {
      const transformer = new RsqlToMongoTransformer([
        { collection: 'karmas', localField: 'karma', foreignField: '_id' },
      ]);

      transformer.transform('karma.amount>=10');

      // Without the reset in transform() this second call would still be
      // reported as needing an aggregation.
      expect(transformer.transform('score==5')).toEqual({
        useAggregate: false,
        filter: { score: '5' },
      });
    });
  });
});
