import { Reflector } from '@nestjs/core';

export const PoWScope = Reflector.createDecorator<
  'registration' | 'transfer'
>();
