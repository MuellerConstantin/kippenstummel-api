import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommonModule } from 'src/common/common.module';
import { IdentModule } from 'src/ident/ident.module';
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
  TileComputationConsumer,
  CvmImportConsumer,
  CvmRegisteredEventSubscriber,
  CvmUpvotedEventSubscriber,
  CvmDownvotedEventSubscriber,
  IdentRemovedEventSubscriber,
  CvmRepositionedEventSubscriber,
  CvmRestoredEventSubscriber,
  CvmManagementConsumer,
} from './services';
import {
  GetAllQueryHandler,
  GetAllWithinQueryHandler,
  GetTotalRegistrationStatsQueryHandler,
  GetTotalVotesStatsQueryHandler,
  GetByIdQueryHandler,
} from './queries';
import { CvmController } from './controllers';

@Module({
  imports: [
    CommonModule,
    IdentModule,
    MongooseModule.forFeature([{ name: Cvm.name, schema: CvmSchema }]),
    MongooseModule.forFeature([{ name: Vote.name, schema: VoteSchema }]),
    MongooseModule.forFeature([
      { name: Repositioning.name, schema: RepositioningSchema },
    ]),
    MongooseModule.forFeature([{ name: CvmTile.name, schema: CvmTileSchema }]),
    MongooseModule.forFeature([{ name: Report.name, schema: ReportSchema }]),
  ],
  controllers: [CvmController],
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
    TileComputationConsumer,
    CvmManagementConsumer,
    CvmRegisteredEventSubscriber,
    CvmUpvotedEventSubscriber,
    CvmDownvotedEventSubscriber,
    CvmImportConsumer,
    IdentRemovedEventSubscriber,
    RepositionCvmCommandHandler,
    CvmRepositionedEventSubscriber,
    CvmRestoredEventSubscriber,
  ],
})
export class CvmModule {}
