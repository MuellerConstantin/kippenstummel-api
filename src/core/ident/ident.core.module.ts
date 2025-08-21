import { Module } from '@nestjs/common';
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
import { DatasourceInfrastructureModule } from 'src/infrastructure/datasource/datasource.infrastructure.module';
import { SchedulingInfrastructureModule } from 'src/infrastructure/scheduling/scheduling.infrastructure.module';
import { LoggingInfrastructureModule } from 'src/infrastructure/logging/logging.infrastructure.module';
import { SecurityInfrastructureModule } from 'src/infrastructure/security/security.infrastructure.module';
import { EventingInfrastructureModule } from 'src/infrastructure/eventing/eventing.infrastructure.module';

@Module({
  imports: [
    LoggingInfrastructureModule,
    DatasourceInfrastructureModule,
    EventingInfrastructureModule,
    SchedulingInfrastructureModule,
    SecurityInfrastructureModule,
    MongooseModule.forFeature([{ name: Ident.name, schema: IdentSchema }]),
    MongooseModule.forFeature([
      { name: Credibility.name, schema: CredibilitySchema },
    ]),
  ],
  controllers: [],
  providers: [
    PoWService,
    IdentService,
    CaptchaService,
    CredibilityService,
    IdentTransferService,
    CredibilityComputationConsumer,
  ],
  exports: [
    PoWService,
    IdentService,
    CaptchaService,
    CredibilityService,
    IdentTransferService,
  ],
})
export class IdentCoreModule {}
