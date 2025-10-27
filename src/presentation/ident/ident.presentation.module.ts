import { Module } from '@nestjs/common';
import {
  PoWController,
  IdentController,
  CaptchaController,
  KarmaController,
  PoWGuard,
  IdentGuard,
  AnonymousGuard,
  CaptchaGuard,
} from './controllers';
import { IdentCoreModule } from '../../core/ident/ident.core.module';

@Module({
  imports: [IdentCoreModule],
  controllers: [
    PoWController,
    IdentController,
    CaptchaController,
    KarmaController,
  ],
  providers: [PoWGuard, IdentGuard, AnonymousGuard, CaptchaGuard],
  exports: [
    IdentCoreModule,
    PoWGuard,
    IdentGuard,
    CaptchaGuard,
    AnonymousGuard,
  ],
})
export class IdentPresentationModule {}
