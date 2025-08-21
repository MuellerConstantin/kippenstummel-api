import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UnauthenticatedError } from 'src/lib/models';

@Injectable()
export class JwtGuard extends AuthGuard('jwt') {
  handleRequest<TUser = string>(err: Error, user: TUser): TUser {
    if (err || !user) {
      throw new UnauthenticatedError();
    }

    return user;
  }
}
