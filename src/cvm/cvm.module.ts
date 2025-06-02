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
} from './repositories';
import {
  RegisterCvmCommandHandler,
  UpvoteCvmCommandHandler,
  DownvoteCvmCommandHandler,
  ImportCvmsCommandHandler,
} from './commands';
import {
  CvmTileService,
  TileComputationConsumer,
  CvmImportConsumer,
  CvmRegisteredEventSubscriber,
  CvmUpvotedEventSubscriber,
  CvmDownvotedEventSubscriber,
} from './services';
import {
  GetAllQueryHandler,
  GetAllWithinQueryHandler,
  GetMetaQueryHandler,
  GetVotesMetaQueryHandler,
  GetByIdQueryHandler,
} from './queries';
import { CvmController } from './controllers';

@Module({
  imports: [
    CommonModule,
    IdentModule,
    MongooseModule.forFeature([{ name: Cvm.name, schema: CvmSchema }]),
    MongooseModule.forFeature([{ name: Vote.name, schema: VoteSchema }]),
    MongooseModule.forFeature([{ name: CvmTile.name, schema: CvmTileSchema }]),
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
    GetAllQueryHandler,
    GetByIdQueryHandler,
    GetAllWithinQueryHandler,
    GetMetaQueryHandler,
    GetVotesMetaQueryHandler,
    TileComputationConsumer,
    CvmRegisteredEventSubscriber,
    CvmUpvotedEventSubscriber,
    CvmDownvotedEventSubscriber,
    CvmImportConsumer,
  ],
})
export class CvmModule {}
