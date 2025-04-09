import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { PoWController, IdentController } from './controllers';

@Module({
  imports: [CommonModule],
  controllers: [PoWController, IdentController],
  exports: [],
})
export class IdentModule {}
