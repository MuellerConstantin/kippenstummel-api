import { RsqlToMongoTransformer } from 'src/common/controllers';
import { UnsupportedFilterFieldError } from 'src/common/models';

export class RsqlToMongoIdentTransformer extends RsqlToMongoTransformer {
  constructor() {
    super([
      {
        collection: 'credibilities',
        localField: 'credibility',
        foreignField: '_id',
      },
    ]);
  }

  private isSupported(field: string, operator: string) {
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

    if (field === 'credibility' && operator !== '=like=') {
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

    return super.transformExpression(selector, operator, value);
  }
}
