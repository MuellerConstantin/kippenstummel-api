import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommonModule } from 'src/common/common.module';
import {
  CvmEventStoreRepository,
  CvmSnapshotRepository,
  Cvm,
  CvmSchema,
} from './repositories';
import { RegisterCvmCommandHandler } from './commands';
import { GetAllQueryHandler, GetAllWithinQueryHandler } from './queries';
import { CvmController } from './controllers';

@Module({
  imports: [
    CommonModule,
    MongooseModule.forFeature([{ name: Cvm.name, schema: CvmSchema }]),
  ],
  controllers: [CvmController],
  providers: [
    CvmEventStoreRepository,
    CvmSnapshotRepository,
    RegisterCvmCommandHandler,
    GetAllQueryHandler,
    GetAllWithinQueryHandler,
  ],
})
export class CvmModule {}
