import { Module } from '@nestjs/common';
import { CvmController } from './controllers';
import { CvmCoreModule } from '../../core/cvm/cvm.core.module';
import { IdentPresentationModule } from 'src/presentation/ident/ident.presentation.module';
import { EventingInfrastructureModule } from 'src/infrastructure/eventing/eventing.infrastructure.module';

@Module({
  imports: [
    EventingInfrastructureModule,
    IdentPresentationModule,
    CvmCoreModule,
  ],
  controllers: [CvmController],
  providers: [],
})
export class CvmPresentationModule {}
