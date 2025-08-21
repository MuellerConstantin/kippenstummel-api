import { Module } from '@nestjs/common';
import {
  CvmController,
  StatsController,
  IdentController,
  JobController,
} from './controllers';
import { IdentCoreModule } from 'src/core/ident/ident.core.module';
import { CvmCoreModule } from 'src/core/cvm/cvm.core.module';
import { EventingInfrastructureModule } from 'src/infrastructure/eventing/eventing.infrastructure.module';
import { SchedulingInfrastructureModule } from 'src/infrastructure/scheduling/scheduling.infrastructure.module';

@Module({
  imports: [
    EventingInfrastructureModule,
    SchedulingInfrastructureModule,
    CvmCoreModule,
    IdentCoreModule,
  ],
  controllers: [CvmController, StatsController, IdentController, JobController],
  providers: [],
})
export class KmcPresentationModule {}
