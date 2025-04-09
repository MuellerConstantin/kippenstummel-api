import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { PoWController } from './controllers';

@Module({
  imports: [CommonModule],
  controllers: [PoWController],
  exports: [],
})
export class PoWModule {}
