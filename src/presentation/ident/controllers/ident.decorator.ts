import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

declare module 'express' {
  export interface Request {
    identity: string;
  }
}

export const Identity = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.identity;
  },
);
