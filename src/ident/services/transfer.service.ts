import * as crypto from 'crypto';
import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { TransferToken, EncryptedIdentSecret } from '../models';
import { NotFoundError } from 'src/common/models';
import { InjectModel } from '@nestjs/mongoose';
import { Ident } from '../repositories';
import { Model } from 'mongoose';

@Injectable()
export class IdentTransferService {
  constructor(
    private readonly configService: ConfigService,
    @InjectModel(Ident.name) private readonly identModel: Model<Ident>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async generateTransferToken(
    identity: string,
    encryptedSecret: string,
  ): Promise<TransferToken> {
    const token = crypto.randomBytes(4).toString('hex');
    const expiresIn = this.configService.get<number>('TRANSFER_EXPIRES_IN')!;

    await this.cacheManager.set(
      `transfer:${token}`,
      JSON.stringify({ identity, encryptedSecret }),
      expiresIn * 1000,
    );

    return { identity, token };
  }

  async verifyTransferToken(token: string): Promise<EncryptedIdentSecret> {
    const data = await this.cacheManager.get<string>(`transfer:${token}`);

    if (!data) {
      throw new NotFoundError();
    }

    const { identity, encryptedSecret } = JSON.parse(data) as {
      identity: string;
      encryptedSecret: string;
    };

    await this.cacheManager.del(`transfer:${token}`);

    return { identity, encryptedSecret };
  }
}
