import { Module } from '@nestjs/common';
import { CommonModule } from 'src/common/common.module';
import { CvmModule } from 'src/cvm/cvm.module';
import {
  CvmController,
  StatsController,
  IdentController,
  JobController,
} from './controllers';
import { IdentModule } from 'src/ident/ident.module';

@Module({
  imports: [CommonModule, CvmModule, IdentModule],
  controllers: [CvmController, StatsController, IdentController, JobController],
  providers: [],
})
export class KmcModule {}
