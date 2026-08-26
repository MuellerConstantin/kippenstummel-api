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

    // The rules themselves live in parseBoundingBox and are covered in
    // test/lib/bbox.spec.ts. These cases only assert that the transformer
    // relays a rejection as a filter error rather than passing it to Mongo.
    it.each([
      ["bbox=='8.0,48.0,9.0'", 'a malformed box'],
      ["bbox=='8.0,48.0,181.0,49.0'", 'an out of range box'],
      ["bbox=='9.0,49.0,8.0,48.0'", 'a reversed box'],
    ])('Should reject %s (%s)', (rsql) => {
      expect(() => transformer.transform(rsql)).toThrow(
        InvalidFilterQueryError,
      );
    });
  });

  // The field is denormalized onto the read model by the synchronizer, so it
  // filters like any other date column. It used to be computed from the votes
  // collection, which forced an aggregation with a lookup per CVM.
  it('Should match the denormalized lastVotedAt field directly', () => {
    expect(transformer.transform('lastVotedAt>=2026-01-01')).toEqual({
      useAggregate: false,
      filter: { lastVotedAt: { $gte: new Date('2026-01-01') } },
    });
  });

  it('Should combine lastVotedAt with another allowed field', () => {
    expect(transformer.transform('score>=5;lastVotedAt>=2026-01-01')).toEqual({
      useAggregate: false,
      filter: {
        $and: [
          { score: { $gte: 5 } },
          { lastVotedAt: { $gte: new Date('2026-01-01') } },
        ],
      },
    });
  });
});
