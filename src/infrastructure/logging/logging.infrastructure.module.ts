import { Module, Logger, Global } from '@nestjs/common';

@Global()
@Module({
  imports: [],
  controllers: [],
  providers: [Logger],
  exports: [Logger],
})
export class LoggingInfrastructureModule {}
