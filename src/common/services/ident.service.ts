import * as crypto from 'crypto';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DeviceInfo } from '../models';

@Injectable()
export class IdentService {
  constructor(private jwtService: JwtService) {}

  async generateIdentToken(deviceInfo: DeviceInfo): Promise<string> {
    const fingerprint = crypto
      .createHash('sha256')
      .update(JSON.stringify(deviceInfo))
      .digest('hex');

    return await this.jwtService.signAsync({ fingerprint });
  }
}
