import { Event, type IEvent } from '@ocoda/event-sourcing';
import type { CvmImportSource } from '../models/cvm-source.model';

@Event('cvm-synchronized')
export class CvmSynchronizedEvent implements IEvent {
  constructor(
    public readonly cvmId: string,
    public readonly position: { longitude?: number; latitude?: number },
    public readonly source: CvmImportSource,
    public readonly forcedScore?: number,
  ) {}
}
