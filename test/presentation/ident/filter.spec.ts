import { RsqlToMongoIdentTransformer } from 'src/presentation/ident/controllers';
import { UnsupportedFilterFieldError } from 'src/lib/models';

describe('RsqlToMongoIdentTransformer', () => {
  let transformer: RsqlToMongoIdentTransformer;

  beforeEach(() => {
    transformer = new RsqlToMongoIdentTransformer();
  });

  describe('field allow list', () => {
    it.each([
      ['identity==abc'],
      ['identity=like=abc'],
      ['displayName==alice'],
      ['credibility>=50'],
      ['karma>=10'],
      ['createdAt>=2026-01-01'],
    ])('Should accept %s', (rsql) => {
      expect(() => transformer.transform(rsql)).not.toThrow();
    });

    it.each([
      ['secret==abc'],
      ['credibility=like=50'],
      ['karma=like=10'],
      ['createdAt=like=2026'],
    ])('Should reject %s', (rsql) => {
      expect(() => transformer.transform(rsql)).toThrow(
        UnsupportedFilterFieldError,
      );
    });
  });

  it('Should map credibility onto the nested rating and coerce it to a number', () => {
    const result = transformer.transform('credibility>=50');

    expect(result).toEqual({
      useAggregate: true,
      pipeline: expect.arrayContaining([
        { $match: { 'credibility.rating': { $gte: 50 } } },
      ]) as unknown,
    });
  });

  it('Should map karma onto the nested amount and coerce it to a number', () => {
    const result = transformer.transform('karma>=10');

    expect(result).toEqual({
      useAggregate: true,
      pipeline: expect.arrayContaining([
        { $match: { 'karma.amount': { $gte: 10 } } },
      ]) as unknown,
    });
  });

  it('Should strip the discriminator suffix from a display name', () => {
    expect(transformer.transform('displayName==alice#1234')).toEqual({
      useAggregate: false,
      filter: { username: 'alice' },
    });
  });

  it('Should leave a display name without a suffix untouched', () => {
    expect(transformer.transform('displayName==alice')).toEqual({
      useAggregate: false,
      filter: { username: 'alice' },
    });
  });

  it('Should only strip a four digit suffix at the very end', () => {
    expect(transformer.transform('displayName==alice#12345')).toEqual({
      useAggregate: false,
      filter: { username: 'alice#12345' },
    });
  });

  it('Should turn createdAt into a Date', () => {
    const result = transformer.transform('createdAt>=2026-01-01');

    expect(result).toEqual({
      useAggregate: false,
      filter: { createdAt: { $gte: new Date('2026-01-01') } },
    });
  });

  it('Should look up both references when credibility and karma are combined', () => {
    const result = transformer.transform('credibility>=50;karma>=10');

    expect(result.useAggregate).toBe(true);

    if (result.useAggregate) {
      const lookups = result.pipeline.filter((stage) => '$lookup' in stage);
      expect(lookups).toHaveLength(2);
    }
  });
});
