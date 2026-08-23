import { Event, type IEvent } from '@ocoda/event-sourcing';
import type { CvmSource } from '../models/cvm-source.model';

@Event('cvm-restored')
export class CvmRestoredEvent implements IEvent {
  constructor(
    public readonly cvmId: string,
    public readonly position: { longitude: number; latitude: number },
    // A restore recreates the read model entry, so it carries the source it holds
    public readonly source: CvmSource,
  ) {}
}
