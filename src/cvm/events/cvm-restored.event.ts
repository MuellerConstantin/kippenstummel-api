import { Event, type IEvent } from '@ocoda/event-sourcing';

@Event('cvm-restored')
export class CvmRestoredEvent implements IEvent {
  constructor(
    public readonly cvmId: string,
    public readonly position: { longitude: number; latitude: number },
  ) {}
}
