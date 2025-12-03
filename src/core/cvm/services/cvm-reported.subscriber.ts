import {
  EventSubscriber,
  IEventSubscriber,
  EventEnvelope,
} from '@ocoda/event-sourcing';
import { CvmReportedEvent } from '../events';
import { Cvm, Report } from '../repositories';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PiiService } from 'src/infrastructure/pii/services';
import { InconsistentReadModelError } from 'src/lib/models';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@EventSubscriber(CvmReportedEvent)
export class CvmReportedEventSubscriber implements IEventSubscriber {
  constructor(
    @InjectModel(Cvm.name) private readonly cvmModel: Model<Cvm>,
    @InjectModel(Report.name) private readonly reportModel: Model<Report>,
    @InjectQueue('karma-computation')
    private karmaComputationQueue: Queue,
    private readonly piiService: PiiService,
  ) {}

  async handle(envelope: EventEnvelope<CvmReportedEvent>) {
    const tokenizedIdentity = envelope.payload.reporterIdentity as string;

    /*
     * Due to GDPR, PII is tokenized. This step must be reversed when reading,
     * if still possible and the authority has not already been deleted.
     */

    const untokenizedIdentity = (await this.piiService.untokenizePii(
      tokenizedIdentity,
    )) as string | null;

    const result = await this.cvmModel
      .findOne({
        aggregateId: envelope.payload.cvmId as string,
      })
      .exec();

    if (!result) {
      throw new InconsistentReadModelError();
    }

    // Update read model
    await this.reportModel.create({
      identity: untokenizedIdentity,
      cvm: result._id,
      type: envelope.payload.type as string,
    });

    await this.karmaComputationQueue.add('recompute', {
      targetIdentity: untokenizedIdentity,
      cvmId: envelope.payload.cvmId as string,
      action: 'report_cast',
    });

    if (result.registeredBy) {
      const untokenizedRegisteredBy = (await this.piiService.untokenizePii(
        result.registeredBy,
      )) as string | null;

      if (untokenizedRegisteredBy) {
        await this.karmaComputationQueue.add('recompute', {
          targetIdentity: untokenizedRegisteredBy,
          cvmId: envelope.payload.cvmId as string,
          action: 'report_received',
        });
      }
    }
  }
}
