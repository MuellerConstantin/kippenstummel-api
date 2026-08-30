import { RsqlToMongoCvmTransformer } from 'src/presentation/cvm/controllers';
import { RsqlToMongoIdentTransformer } from 'src/presentation/ident/controllers';

export class RsqlToMongoKmcCvmTransformer extends RsqlToMongoCvmTransformer {
  protected isSupported(field: string, operator: string) {
    if (field === 'registeredBy' && operator === '==') {
      return true;
    }

    /*
     * Mongo matches an array field against a scalar by element, so equality on
     * `sources` asks whether an origin has ever contributed to the record and
     * `=in=` asks it for a list of them. No coercion is needed, the values are
     * plain strings.
     */
    if (
      field === 'sources' &&
      (operator === '==' ||
        operator === '!=' ||
        operator === '=in=' ||
        operator === '=out=')
    ) {
      return true;
    }

    return super.isSupported(field, operator);
  }
}

export class RsqlToMongoKmcIdentTransformer extends RsqlToMongoIdentTransformer {
  protected isSupported(field: string, operator: string) {
    if (field === 'trusted' && (operator === '==' || operator === '!=')) {
      return true;
    }

    return super.isSupported(field, operator);
  }

  protected transformExpression(
    selector: string,
    operator: string,
    value: string | string[] | number,
  ): object {
    if (selector === 'trusted') {
      const boolValue = value === 'true';
      return super.transformExpression(
        selector,
        operator,
        boolValue as unknown as string,
      );
    }

    return super.transformExpression(selector, operator, value);
  }
}
