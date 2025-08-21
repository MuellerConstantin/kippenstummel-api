import { Module, Logger } from '@nestjs/common';

@Module({
  imports: [],
  controllers: [],
  providers: [Logger],
  exports: [Logger],
})
export class LoggingInfrastructureModule {}
