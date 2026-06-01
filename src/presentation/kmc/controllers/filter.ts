import { RsqlToMongoCvmTransformer } from 'src/presentation/cvm/controllers';
import { RsqlToMongoIdentTransformer } from 'src/presentation/ident/controllers';

export class RsqlToMongoKmcCvmTransformer extends RsqlToMongoCvmTransformer {
  protected isSupported(field: string, operator: string) {
    if (field === 'registeredBy' && operator === '==') {
      return true;
    }

    return super.isSupported(field, operator);
  }

  protected transformExpression(
    selector: string,
    operator: string,
    value: string | string[] | number,
  ): object {
    if (selector === 'imported') {
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
