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

@Module({
  imports: [IdentCoreModule],
  controllers: [IdentController, CaptchaController, KarmaController],
  providers: [IdentGuard, AnonymousGuard, CaptchaGuard],
  exports: [IdentCoreModule, IdentGuard, CaptchaGuard, AnonymousGuard],
})
export class IdentPresentationModule {}
