import { Module } from '@nestjs/common';
import {
  IdentController,
  CaptchaController,
  KarmaController,
  IdentGuard,
  AnonymousGuard,
  CaptchaGuard,
} from './controllers';
import { IdentCoreModule } from '../../core/ident/ident.core.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LastActiveInterceptor } from './controllers/last-active.interceptor';

@Module({
  imports: [IdentCoreModule],
  controllers: [IdentController, CaptchaController, KarmaController],
  providers: [
    IdentGuard,
    AnonymousGuard,
    CaptchaGuard,
    {
      provide: APP_INTERCEPTOR,
      useClass: LastActiveInterceptor,
    },
  ],
  exports: [IdentCoreModule, IdentGuard, CaptchaGuard, AnonymousGuard],
})
export class IdentPresentationModule {}
