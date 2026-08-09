import {
  RsqlToMongoKmcCvmTransformer,
  RsqlToMongoKmcIdentTransformer,
} from 'src/presentation/kmc/controllers/filter';
import { RsqlToMongoCvmTransformer } from 'src/presentation/cvm/controllers';
import { RsqlToMongoIdentTransformer } from 'src/presentation/ident/controllers';
import { UnsupportedFilterFieldError } from 'src/lib/models';

describe('RsqlToMongoKmcCvmTransformer', () => {
  it('Should allow filtering by registeredBy, which the public transformer rejects', () => {
    expect(() =>
      new RsqlToMongoCvmTransformer().transform('registeredBy==abc'),
    ).toThrow(UnsupportedFilterFieldError);

    expect(
      new RsqlToMongoKmcCvmTransformer().transform('registeredBy==abc'),
    ).toEqual({
      useAggregate: false,
      filter: { registeredBy: 'abc' },
    });
  });

  it('Should still reject registeredBy with any other operator', () => {
    expect(() =>
      new RsqlToMongoKmcCvmTransformer().transform('registeredBy!=abc'),
    ).toThrow(UnsupportedFilterFieldError);
  });

  it('Should inherit the public field allow list', () => {
    const transformer = new RsqlToMongoKmcCvmTransformer();

    expect(transformer.transform('id==abc')).toEqual({
      useAggregate: false,
      filter: { aggregateId: 'abc' },
    });
    expect(() => transformer.transform('unknownField==1')).toThrow(
      UnsupportedFilterFieldError,
    );
  });
});

describe('RsqlToMongoKmcIdentTransformer', () => {
  it('Should allow filtering by trusted, which the public transformer rejects', () => {
    expect(() =>
      new RsqlToMongoIdentTransformer().transform('trusted==true'),
    ).toThrow(UnsupportedFilterFieldError);

    expect(() =>
      new RsqlToMongoKmcIdentTransformer().transform('trusted==true'),
    ).not.toThrow();
  });

  it('Should coerce the trusted value from string to boolean', () => {
    const transformer = new RsqlToMongoKmcIdentTransformer();

    expect(transformer.transform('trusted==true')).toEqual({
      useAggregate: false,
      filter: { trusted: true },
    });

    expect(transformer.transform('trusted==false')).toEqual({
      useAggregate: false,
      filter: { trusted: false },
    });
  });

  it('Should treat any non-"true" value as false', () => {
    // The coercion is `value === 'true'`, so anything else lands on false
    // rather than being rejected.
    expect(
      new RsqlToMongoKmcIdentTransformer().transform('trusted==yes'),
    ).toEqual({
      useAggregate: false,
      filter: { trusted: false },
    });
  });

  it('Should support negating trusted', () => {
    expect(
      new RsqlToMongoKmcIdentTransformer().transform('trusted!=true'),
    ).toEqual({
      useAggregate: false,
      filter: { trusted: { $ne: true } },
    });
  });

  it('Should inherit the public field allow list', () => {
    const transformer = new RsqlToMongoKmcIdentTransformer();

    expect(transformer.transform('displayName==alice#1234')).toEqual({
      useAggregate: false,
      filter: { username: 'alice' },
    });
    expect(() => transformer.transform('secret==abc')).toThrow(
      UnsupportedFilterFieldError,
    );
  });
});
