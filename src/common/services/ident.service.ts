import * as crypto from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DeviceInfo, InvalidIdentTokenError } from '../models';

@Injectable()
export class IdentService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async generateIdentToken(deviceInfo: DeviceInfo): Promise<string> {
    const fingerprint = crypto
      .createHash('sha256')
      .update(JSON.stringify(deviceInfo))
      .digest('hex');

    return await this.jwtService.signAsync({ fingerprint });
  }

  async verifyIdentToken(identToken: string): Promise<string> {
    try {
      const payload = await this.jwtService.verifyAsync(identToken, {
        secret: this.configService.get<string>('IDENT_SECRET'),
      });

      return payload.fingerprint;
    } catch {
      throw new InvalidIdentTokenError();
    }
  }
}
