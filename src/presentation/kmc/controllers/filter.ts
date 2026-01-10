import { RsqlToMongoCvmTransformer } from 'src/presentation/cvm/controllers';
import { RsqlToMongoIdentTransformer } from 'src/presentation/ident/controllers';

export class RsqlToMongoKmcCvmTransformer extends RsqlToMongoCvmTransformer {
  protected isSupported(field: string, operator: string) {
    if (field === 'registeredBy' && operator === '==') {
      return true;
    }

    return super.isSupported(field, operator);
  }
}

export class RsqlToMongoKmcIdentTransformer extends RsqlToMongoIdentTransformer {}
