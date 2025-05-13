import { Module } from '@nestjs/common';
import { CommonModule } from 'src/common/common.module';
import { CvmModule } from 'src/cvm/cvm.module';
import { CvmController } from './controllers';

@Module({
  imports: [CommonModule, CvmModule],
  controllers: [CvmController],
  providers: [],
})
export class KmcModule {}
