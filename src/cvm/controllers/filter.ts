import { RsqlToMongoTransformer } from 'src/common/controllers';
import { UnsupportedFilterFieldError } from 'src/common/models';

export class RsqlToMongoCvmTransformer extends RsqlToMongoTransformer {
  private isSupported(field: string, operator: string) {
    if (
      field === 'id' &&
      (operator === '=like=' ||
        operator === '=in=' ||
        operator === '=out=' ||
        operator === '!=' ||
        operator === '==')
    ) {
      return true;
    }

    if (field === 'score' && operator !== '=like=') {
      return true;
    }

    if (field === 'imported' && (operator == '!=' || operator == '==')) {
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

    if (
      field === 'updatedAt' &&
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

    if (selector === 'id') {
      selector = 'aggregate_id';
    }

    if (selector === 'score') {
      value = Number(value);
    }

    return super.transformExpression(selector, operator, value);
  }
}
