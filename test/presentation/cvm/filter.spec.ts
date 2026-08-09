import { RsqlToMongoCvmTransformer } from 'src/presentation/cvm/controllers';
import {
  InvalidFilterQueryError,
  UnsupportedFilterFieldError,
} from 'src/lib/models';

describe('RsqlToMongoCvmTransformer', () => {
  let transformer: RsqlToMongoCvmTransformer;

  beforeEach(() => {
    transformer = new RsqlToMongoCvmTransformer();
  });

  describe('field allow list', () => {
    it.each([
      ['id==abc'],
      ['id=like=abc'],
      ['score>=5'],
      ['imported==true'],
      ['createdAt>=2026-01-01'],
      ['updatedAt<=2026-01-01'],
      ["bbox=='8.0,48.0,9.0,49.0'"],
    ])('Should accept %s', (rsql) => {
      expect(() => transformer.transform(rsql)).not.toThrow();
    });

    it.each([
      ['unknownField==1', 'an unknown field'],
      ['score=like=5', 'an operator the field does not allow'],
      ['imported>=true', 'a range operator on a boolean field'],
      ["bbox!='8.0,48.0,9.0,49.0'", 'a non-equality operator on bbox'],
    ])('Should reject %s (%s)', (rsql) => {
      expect(() => transformer.transform(rsql)).toThrow(
        UnsupportedFilterFieldError,
      );
    });
  });

  it('Should rename id to the aggregate identifier', () => {
    expect(transformer.transform('id==8eadee97')).toEqual({
      useAggregate: false,
      filter: { aggregateId: '8eadee97' },
    });
  });

  describe('bbox', () => {
    it('Should translate a bbox into a geo query', () => {
      expect(transformer.transform("bbox=='8.0,48.0,9.0,49.0'")).toEqual({
        useAggregate: false,
        filter: {
          position: {
            $geoWithin: {
              $box: [
                [8.0, 48.0],
                [9.0, 49.0],
              ],
            },
          },
        },
      });
    });

    it.each([
      ["bbox=='8.0,48.0,9.0'"],
      ["bbox=='a,b,c,d'"],
      ["bbox=='8.0,48.0,9.0,north'"],
    ])('Should reject malformed coordinates in %s', (rsql) => {
      expect(() => transformer.transform(rsql)).toThrow(
        InvalidFilterQueryError,
      );
    });
  });

  it('Should switch to an aggregation for the computed lastVotedAt field', () => {
    const result = transformer.transform('lastVotedAt>=2026-01-01');

    expect(result.useAggregate).toBe(true);

    // Narrowed by the assertion above; the pipeline has to look the votes up,
    // compute the field and only then filter on it.
    if (result.useAggregate) {
      expect(result.pipeline).toEqual([
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
        { $match: { lastVotedAt: { $gte: new Date('2026-01-01') } } },
      ]);
    }
  });

  it('Should combine an allowed field with a computed one', () => {
    const result = transformer.transform('score>=5;lastVotedAt>=2026-01-01');

    expect(result.useAggregate).toBe(true);
  });
});
