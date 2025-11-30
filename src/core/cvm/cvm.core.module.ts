import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  CvmEventStoreRepository,
  CvmSnapshotRepository,
  Cvm,
  CvmSchema,
  VoteSchema,
  CvmTile,
  CvmTileSchema,
  Vote,
  Repositioning,
  RepositioningSchema,
  Report,
  ReportSchema,
} from './repositories';
import {
  RegisterCvmCommandHandler,
  UpvoteCvmCommandHandler,
  DownvoteCvmCommandHandler,
  ImportCvmsCommandHandler,
  RepositionCvmCommandHandler,
  ReportCvmCommandHandler,
  RemoveCvmCommandHandler,
  RestoreCvmCommandHandler,
  CleanupCvmsCommandHandler,
} from './commands';
import {
  CvmTileService,
  CvmRegisteredEventSubscriber,
  CvmUpvotedEventSubscriber,
  CvmDownvotedEventSubscriber,
  IdentRemovedEventSubscriber,
  CvmRepositionedEventSubscriber,
  CvmRestoredEventSubscriber,
  CvmManagementConsumer,
  CvmRemovedEventSubscriber,
  CvmReportedEventSubscriber,
  CvmImportedEventSubscriber,
  CvmSynchronizedEventSubscriber,
} from './services';
import {
  GetAllQueryHandler,
  GetAllWithinQueryHandler,
  GetTotalRegistrationStatsQueryHandler,
  GetTotalVotesStatsQueryHandler,
  GetByIdQueryHandler,
} from './queries';
import { IdentCoreModule } from 'src/core/ident/ident.core.module';
import { DatasourceInfrastructureModule } from 'src/infrastructure/datasource/datasource.infrastructure.module';
import { PiiInfrastructureModule } from 'src/infrastructure/pii/pii.infrastructure.module';
import { SchedulingInfrastructureModule } from 'src/infrastructure/scheduling/scheduling.infrastructure.module';
import { LoggingInfrastructureModule } from 'src/infrastructure/logging/logging.infrastructure.module';
import { EventingInfrastructureModule } from 'src/infrastructure/eventing/eventing.infrastructure.module';
import { MultithreadingInfrastructureModule } from 'src/infrastructure/multithreading/multithreading.infrastructure.module';

@Module({
  imports: [
    LoggingInfrastructureModule,
    DatasourceInfrastructureModule,
    EventingInfrastructureModule,
    PiiInfrastructureModule,
    SchedulingInfrastructureModule,
    MultithreadingInfrastructureModule,
    IdentCoreModule,
    MongooseModule.forFeature([{ name: Cvm.name, schema: CvmSchema }]),
    MongooseModule.forFeature([{ name: Vote.name, schema: VoteSchema }]),
    MongooseModule.forFeature([
      { name: Repositioning.name, schema: RepositioningSchema },
    ]),
    MongooseModule.forFeature([{ name: CvmTile.name, schema: CvmTileSchema }]),
    MongooseModule.forFeature([{ name: Report.name, schema: ReportSchema }]),
  ],
  controllers: [],
  providers: [
    CvmTileService,
    CvmEventStoreRepository,
    CvmSnapshotRepository,
    RegisterCvmCommandHandler,
    UpvoteCvmCommandHandler,
    DownvoteCvmCommandHandler,
    ImportCvmsCommandHandler,
    ReportCvmCommandHandler,
    RemoveCvmCommandHandler,
    RestoreCvmCommandHandler,
    CleanupCvmsCommandHandler,
    GetAllQueryHandler,
    GetByIdQueryHandler,
    GetAllWithinQueryHandler,
    GetTotalRegistrationStatsQueryHandler,
    GetTotalVotesStatsQueryHandler,
    CvmManagementConsumer,
    CvmRegisteredEventSubscriber,
    CvmUpvotedEventSubscriber,
    CvmDownvotedEventSubscriber,
    IdentRemovedEventSubscriber,
    RepositionCvmCommandHandler,
    CvmRepositionedEventSubscriber,
    CvmRestoredEventSubscriber,
    CvmRemovedEventSubscriber,
    CvmReportedEventSubscriber,
    CvmImportedEventSubscriber,
    CvmSynchronizedEventSubscriber,
  ],
  exports: [CvmTileService],
})
export class CvmCoreModule {}
