import * as crypto from 'crypto';
import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { TransferToken, EncryptedIdentSecret } from '../models';
import { NotFoundError, TransferTokenAlreadyUsedError } from 'src/lib/models';
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
      JSON.stringify({ identity, encryptedSecret, used: false }),
      expiresIn * 1000,
    );

    return { identity, token };
  }

  async verifyTransferToken(token: string): Promise<EncryptedIdentSecret> {
    const data = await this.cacheManager.get<string>(`transfer:${token}`);
    const expiresIn = this.configService.get<number>('TRANSFER_EXPIRES_IN')!;

    if (!data) {
      throw new NotFoundError();
    }

    const { identity, encryptedSecret, used } = JSON.parse(data) as {
      identity: string;
      encryptedSecret: string;
      used: boolean;
    };

    if (used) {
      throw new TransferTokenAlreadyUsedError();
    }

    await this.cacheManager.set(
      `transfer:${token}`,
      JSON.stringify({ identity, encryptedSecret, used: true }),
      expiresIn * 1000,
    );

    return { identity, encryptedSecret };
  }
}
