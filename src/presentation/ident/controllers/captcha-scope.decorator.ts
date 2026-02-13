import { Reflector } from '@nestjs/core';

export const CaptchaScope = Reflector.createDecorator<
  'registration' | 'transfer'
>();
