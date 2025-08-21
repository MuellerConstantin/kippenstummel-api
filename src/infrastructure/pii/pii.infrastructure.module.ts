import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PiiToken, PiiTokenSchema } from './repositories';
import { PiiService, IdentRemovedEventSubscriber } from './services';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PiiToken.name, schema: PiiTokenSchema },
    ]),
  ],
  controllers: [],
  providers: [PiiService, IdentRemovedEventSubscriber],
  exports: [PiiService],
})
export class PiiInfrastructureModule {}
