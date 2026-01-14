import { RsqlToMongoTransformer } from 'src/presentation/common/controllers';
import {
  InvalidFilterQueryError,
  UnsupportedFilterFieldError,
} from 'src/lib/models';

export class RsqlToMongoCvmTransformer extends RsqlToMongoTransformer {
  constructor() {
    super([]);
  }

  protected isSupported(field: string, operator: string) {
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

    if (field === 'bbox' && operator === '==') {
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

    if (selector === 'bbox') {
      if (typeof value !== 'string') {
        throw new InvalidFilterQueryError(
          new Error('Property bbox must be a string'),
        );
      }

      const [minLng, minLat, maxLng, maxLat] = value.split(',').map(Number);

      if ([minLng, minLat, maxLng, maxLat].some(isNaN)) {
        throw new InvalidFilterQueryError(
          new Error('Invalid bbox coordinates'),
        );
      }

      return {
        position: {
          $geoWithin: {
            $box: [
              [minLng, minLat],
              [maxLng, maxLat],
            ],
          },
        },
      };
    }

    if (selector === 'id') {
      selector = 'aggregateId';
    }

    if (selector === 'score') {
      value = Number(value);
    }

    return super.transformExpression(selector, operator, value);
  }
}
