import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import {
  PoWController,
  IdentController,
  CaptchaController,
} from './controllers';

@Module({
  imports: [CommonModule],
  controllers: [PoWController, IdentController, CaptchaController],
  exports: [],
})
export class IdentModule {}
