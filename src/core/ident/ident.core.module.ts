import { Module } from '@nestjs/common';
import {
  CaptchaService,
  IdentService,
  PoWService,
  CredibilityService,
  IdentTransferService,
  CredibilityComputationConsumer,
  KarmaService,
  KarmaComputationConsumer,
} from './services';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Credibility,
  CredibilitySchema,
  Ident,
  IdentSchema,
  Karma,
  KarmaSchema,
} from './repositories';
import { DatasourceInfrastructureModule } from 'src/infrastructure/datasource/datasource.infrastructure.module';
import { SchedulingInfrastructureModule } from 'src/infrastructure/scheduling/scheduling.infrastructure.module';
import { LoggingInfrastructureModule } from 'src/infrastructure/logging/logging.infrastructure.module';
import { SecurityInfrastructureModule } from 'src/infrastructure/security/security.infrastructure.module';
import { EventingInfrastructureModule } from 'src/infrastructure/eventing/eventing.infrastructure.module';
import { MultithreadingInfrastructureModule } from 'src/infrastructure/multithreading/multithreading.infrastructure.module';

@Module({
  imports: [
    LoggingInfrastructureModule,
    DatasourceInfrastructureModule,
    EventingInfrastructureModule,
    SchedulingInfrastructureModule,
    MultithreadingInfrastructureModule,
    SecurityInfrastructureModule,
    MongooseModule.forFeature([{ name: Ident.name, schema: IdentSchema }]),
    MongooseModule.forFeature([
      { name: Credibility.name, schema: CredibilitySchema },
    ]),
    MongooseModule.forFeature([{ name: Karma.name, schema: KarmaSchema }]),
  ],
  controllers: [],
  providers: [
    PoWService,
    IdentService,
    CaptchaService,
    CredibilityService,
    IdentTransferService,
    CredibilityComputationConsumer,
    KarmaService,
    KarmaComputationConsumer,
  ],
  exports: [
    PoWService,
    IdentService,
    CaptchaService,
    CredibilityService,
    IdentTransferService,
    KarmaService,
  ],
})
export class IdentCoreModule {}
