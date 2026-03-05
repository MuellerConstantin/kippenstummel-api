import {
  EventSubscriber,
  IEventSubscriber,
  EventEnvelope,
} from '@ocoda/event-sourcing';
import { CvmReportedEvent } from '../events';
import { Cvm, CvmReadModelSynchronizer, Report } from '../repositories';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PiiService } from 'src/infrastructure/pii/services';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@EventSubscriber(CvmReportedEvent)
export class CvmReportedEventSubscriber implements IEventSubscriber {
  constructor(
    private readonly cvmReadModelSynchronizer: CvmReadModelSynchronizer,
    @InjectModel(Cvm.name) private readonly cvmModel: Model<Cvm>,
    @InjectModel(Report.name) private readonly reportModel: Model<Report>,
    @InjectQueue('karma-computation')
    private karmaComputationQueue: Queue,
    private readonly piiService: PiiService,
  ) {}

  async handle(envelope: EventEnvelope<CvmReportedEvent>) {
    const aggregateId = envelope.payload.cvmId as string;
    const reportType = envelope.payload.type as string;
    const tokenizedIdentity = envelope.payload.reporterIdentity as string;

    /*
     * Due to GDPR, PII is tokenized. This step must be reversed when reading,
     * if still possible and the authority has not already been deleted.
     */

    const untokenizedIdentity = (await this.piiService.untokenizePii(
      tokenizedIdentity,
    )) as string | null;

    await this.cvmReadModelSynchronizer.applyReport(
      aggregateId,
      untokenizedIdentity,
      reportType,
    );

    const result = await this.cvmModel.findOne({ aggregateId }).exec();

    await this.karmaComputationQueue.add('recompute', {
      targetIdentity: untokenizedIdentity,
      cvmId: aggregateId,
      action: 'report_cast',
    });

    if (result!.registeredBy) {
      const untokenizedRegisteredBy = (await this.piiService.untokenizePii(
        result!.registeredBy,
      )) as string | null;

      if (untokenizedRegisteredBy) {
        await this.karmaComputationQueue.add('recompute', {
          targetIdentity: untokenizedRegisteredBy,
          cvmId: aggregateId,
          action: 'report_received',
        });
      }
    }
  }
}
