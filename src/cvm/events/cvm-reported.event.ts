import { Event, type IEvent } from '@ocoda/event-sourcing';
import { ReportType } from '../models/cvm.aggregate';

@Event('cvm-reported')
export class CvmReportedEvent implements IEvent {
  constructor(
    public readonly cvmId: string,
    public readonly reporterIdentity: string,
    public readonly type: ReportType,
    public readonly timestamp: Date = new Date(),
  ) {}
}
