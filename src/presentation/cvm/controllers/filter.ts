import { RsqlToMongoTransformer } from 'src/presentation/common/controllers';
import {
  InvalidFilterQueryError,
  UnsupportedFilterFieldError,
} from 'src/lib/models';
import { parseBoundingBox } from 'src/lib';

export class RsqlToMongoCvmTransformer extends RsqlToMongoTransformer {
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

    if (
      field === 'lastVotedAt' &&
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

      const bbox = parseBoundingBox(value);

      if (!bbox) {
        throw new InvalidFilterQueryError(
          new Error('Invalid bbox coordinates'),
        );
      }

      return {
        position: {
          $geoWithin: {
            $box: [
              [bbox.minLng, bbox.minLat],
              [bbox.maxLng, bbox.maxLat],
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

    if (
      selector === 'createdAt' ||
      selector === 'updatedAt' ||
      selector === 'lastVotedAt'
    ) {
      if (Array.isArray(value)) {
        value = value.map((v) => new Date(v) as unknown as string);
      } else if (typeof value === 'string') {
        value = new Date(value) as unknown as string;
      }
    }

    if (selector === 'imported') {
      value = (value === 'true') as unknown as string;
    }

    return super.transformExpression(selector, operator, value);
  }
}
