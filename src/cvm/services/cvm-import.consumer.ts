import * as fs from 'fs';
import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { CommandBus } from '@ocoda/event-sourcing';
import { JobService } from 'src/common/services';
import { ImportCvmsCommand } from '../commands';

@Processor('cvm-import')
export class CvmImportConsumer extends WorkerHost {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly jobService: JobService,
    private readonly logger: Logger,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case 'file': {
        return this.importFile(
          job as Job<
            {
              path: string;
              filename: string;
              mimetype: string;
              encoding: string;
            },
            void,
            string
          >,
        );
      }
    }
  }

  async importFile(
    job: Job<
      {
        path: string;
        filename: string;
        mimetype: string;
        encoding: string;
      },
      void,
      string
    >,
  ): Promise<void> {
    this.logger.debug(
      `Importing CVM data from file '${job.data.path}'...`,
      'CvmImportConsumer',
    );

    const data = await fs.promises.readFile(job.data.path);
    const content = JSON.parse(data.toString()) as {
      longitude: number;
      latitude: number;
      score: number;
    }[];

    await fs.promises.unlink(job.data.path);

    const command = new ImportCvmsCommand(content);
    await this.commandBus.execute<ImportCvmsCommand>(command);
  }

  @OnWorkerEvent('active')
  async onActive(job: Job): Promise<void> {
    await this.jobService.upsertJobLog({ job, status: 'running' });
  }

  @OnWorkerEvent('completed')
  async onCompleted(job: Job, result: any): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    await this.jobService.upsertJobLog({ job, result, status: 'completed' });
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job, error: Error): Promise<void> {
    this.logger.error(error.message, error.stack, 'CvmImportConsumer');
    await this.jobService.upsertJobLog({ job, error, status: 'failed' });
  }
}
