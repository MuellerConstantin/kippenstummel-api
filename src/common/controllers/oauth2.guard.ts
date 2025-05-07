import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UnauthenticatedError } from '../models';

@Injectable()
export class OAuth2Guard extends AuthGuard('oauth2') {
  handleRequest<TUser = string>(err: Error, user: TUser): TUser {
    if (err || !user) {
      throw new UnauthenticatedError();
    }

    return user;
  }
}
