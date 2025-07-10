import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import {
  PoWController,
  IdentController,
  CaptchaController,
  PoWGuard,
  IdentGuard,
  AnonymousGuard,
  CaptchaGuard,
} from './controllers';
import {
  CaptchaService,
  IdentService,
  PoWService,
  CredibilityService,
  IdentTransferService,
  CredibilityComputationConsumer,
} from './services';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Credibility,
  CredibilitySchema,
  Ident,
  IdentSchema,
} from './repositories';

@Module({
  imports: [
    CommonModule,
    MongooseModule.forFeature([{ name: Ident.name, schema: IdentSchema }]),
    MongooseModule.forFeature([
      { name: Credibility.name, schema: CredibilitySchema },
    ]),
  ],
  controllers: [PoWController, IdentController, CaptchaController],
  providers: [
    PoWService,
    IdentService,
    CaptchaService,
    CredibilityService,
    IdentTransferService,
    CredibilityComputationConsumer,
    PoWGuard,
    IdentGuard,
    AnonymousGuard,
    CaptchaGuard,
  ],
  exports: [
    PoWService,
    IdentService,
    CaptchaService,
    CredibilityService,
    PoWGuard,
    IdentGuard,
    CaptchaGuard,
  ],
})
export class IdentModule {}
