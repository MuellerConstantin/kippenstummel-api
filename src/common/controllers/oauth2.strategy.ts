import * as fs from 'fs';
import * as path from 'path';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OAuth2Strategy extends PassportStrategy(Strategy, 'oauth2') {
  constructor(configService: ConfigService) {
    const publicKeyPath = configService.get<string>('OAUTH2_KEY_PATH');
    const fullPath = path.resolve(publicKeyPath!);
    const publicKey = fs.readFileSync(fullPath, 'utf8');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      algorithms: ['RS256'],
      secretOrKey: publicKey,
    });
  }

  async validate(payload: any) {
    return payload.sub;
  }
}
