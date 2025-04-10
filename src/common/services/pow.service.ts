import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import * as crypto from 'crypto';
import { PoWStamp, InvalidPoWStampError } from '../models';

@Injectable()
export class PoWService {
  constructor(
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  protected generateNonce() {
    return crypto.randomBytes(16).toString('hex');
  }

  public async generateChallenge(): Promise<PoWStamp> {
    const difficulty = this.configService.get<number>('POW_DIFFICULTY')!;
    const expiresIn = this.configService.get<number>('POW_EXPIRES_IN')!;
    const algorithm = 'sha256';
    const nonce = this.generateNonce();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresIn * 1000);

    const stamp = new PoWStamp(
      difficulty,
      new Date(expiresAt),
      algorithm,
      nonce,
    );

    await this.cacheManager.set(
      `pow:${stamp.nonce}`,
      stamp.toString(),
      expiresIn * 1000,
    );

    return stamp;
  }

  public async verifyChallenge(stamp: PoWStamp): Promise<void> {
    if (!stamp.isSolved) {
      throw new InvalidPoWStampError();
    }

    const rawStamp = await this.cacheManager.get<string>(`pow:${stamp.nonce}`);

    if (!rawStamp) {
      throw new InvalidPoWStampError();
    }

    const storedStamp = PoWStamp.fromStamp(rawStamp);

    if (stamp.toStamp() !== `${storedStamp.toStamp()}:${stamp.counter}`) {
      throw new InvalidPoWStampError();
    }

    const hash = crypto
      .createHash(stamp.algorithm)
      .update(stamp.toStamp())
      .digest('hex');
    const binaryHash = BigInt('0x' + hash)
      .toString(2)
      .padStart(256, '0');

    const isValid = binaryHash
      .slice(0, stamp.difficulty)
      .split('')
      .every((bit) => bit === '0');

    if (!isValid) {
      throw new InvalidPoWStampError();
    }

    await this.cacheManager.del(`pow:${stamp.nonce}`);
  }

  public static async solveChallenge(stamp: PoWStamp): Promise<PoWStamp> {
    let counter = 0;

    while (true) {
      const currentStamp = new PoWStamp(
        stamp.difficulty,
        stamp.expiresAt,
        stamp.algorithm,
        stamp.nonce,
        counter,
      );

      const currentHash = crypto
        .createHash(stamp.algorithm)
        .update(currentStamp.toStamp())
        .digest('hex');
      const binaryHash = BigInt('0x' + currentHash)
        .toString(2)
        .padStart(256, '0');

      const isValid = binaryHash
        .slice(0, stamp.difficulty)
        .split('')
        .every((bit) => bit === '0');

      if (isValid) {
        return currentStamp;
      }

      counter += 1;
    }
  }
}
