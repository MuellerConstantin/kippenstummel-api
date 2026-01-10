import { RsqlToMongoTransformer } from 'src/presentation/common/controllers';
import { UnsupportedFilterFieldError } from 'src/lib/models';

export class RsqlToMongoIdentTransformer extends RsqlToMongoTransformer {
  constructor() {
    super([
      {
        collection: 'credibilities',
        localField: 'credibility',
        foreignField: '_id',
      },
      {
        collection: 'karmas',
        localField: 'karma',
        foreignField: '_id',
      },
    ]);
  }

  protected isSupported(field: string, operator: string) {
    if (
      field === 'identity' &&
      (operator === '=like=' ||
        operator === '=in=' ||
        operator === '=out=' ||
        operator === '!=' ||
        operator === '==')
    ) {
      return true;
    }

    if (
      field === 'displayName' &&
      (operator === '=like=' ||
        operator === '=in=' ||
        operator === '=out=' ||
        operator === '!=' ||
        operator === '==')
    ) {
      return true;
    }

    if (field === 'credibility' && operator !== '=like=') {
      return true;
    }

    if (field === 'karma' && operator !== '=like=') {
      return true;
    }

    if (
      field === 'createdAt' &&
      operator !== '=like=' &&
      operator !== '=in=' &&
      operator !== '=out='
    ) {
      return true;
    }

    return false;
  }

  protected transformExpression(
    selector: string,
    operator: string,
    value: string | string[] | number,
  ): object {
    if (!this.isSupported(selector, operator)) {
      throw new UnsupportedFilterFieldError([
        {
          field: selector,
          operator,
        },
      ]);
    }

    if (selector === 'credibility') {
      selector = 'credibility.rating';
      value = Number(value);
    }

    if (selector === 'karma') {
      selector = 'karma.amount';
      value = Number(value);
    }

    if (selector === 'displayName') {
      selector = 'username';
      value = String(value).replace(/#\d{4}$/, '');
    }

    return super.transformExpression(selector, operator, value);
  }
}
