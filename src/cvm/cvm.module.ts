import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommonModule } from 'src/common/common.module';
import {
  CvmEventStoreRepository,
  CvmSnapshotRepository,
  Cvm,
  CvmSchema,
} from './repositories';
import {
  RegisterCvmCommandHandler,
  UpvoteCvmCommandHandler,
  DownvoteCvmCommandHandler,
  ImportCvmsCommandHandler,
} from './commands';
import { CvmTileService, TileComputationConsumer } from './services';
import { GetAllQueryHandler, GetAllWithinQueryHandler } from './queries';
import { CvmController } from './controllers';
import { CvmTile, CvmTileSchema } from './repositories/schemas';

@Module({
  imports: [
    CommonModule,
    MongooseModule.forFeature([{ name: Cvm.name, schema: CvmSchema }]),
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
    GetAllWithinQueryHandler,
    TileComputationConsumer,
  ],
})
export class CvmModule {}
