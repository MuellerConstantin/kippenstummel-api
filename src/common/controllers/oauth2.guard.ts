import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UnauthenticatedError } from '../models';

@Injectable()
export class OAuth2Guard extends AuthGuard('oauth2') {
  handleRequest(err, user, info) {
    if (err || !user) {
      throw new UnauthenticatedError(err);
    }

    return user;
  }
}
