import * as crypto from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { IdentToken, InvalidIdentTokenError } from '../models';

@Injectable()
export class IdentService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async generateIdentToken(existingIdentity?: string): Promise<IdentToken> {
    const identity = existingIdentity || crypto.randomUUID();

    const token = await this.jwtService.signAsync({ identity });

    return { identity, token };
  }

  async verifyIdentToken(identToken: string): Promise<string> {
    try {
      const payload = await this.jwtService.verifyAsync<{
        identity: string;
      }>(identToken, {
        secret: this.configService.get<string>('IDENT_SECRET'),
      });

      return payload.identity;
    } catch {
      throw new InvalidIdentTokenError();
    }
  }
}
