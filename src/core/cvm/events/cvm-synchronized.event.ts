import { Event, type IEvent } from '@ocoda/event-sourcing';

@Event('cvm-synchronized')
export class CvmSynchronizedEvent implements IEvent {
  constructor(
    public readonly cvmId: string,
    public readonly position: { longitude?: number; latitude?: number },
    public readonly forcedScore?: number,
  ) {}
}
