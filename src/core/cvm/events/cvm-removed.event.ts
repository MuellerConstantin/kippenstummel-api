import { Event, type IEvent } from '@ocoda/event-sourcing';

@Event('cvm-removed')
export class CvmRemovedEvent implements IEvent {
  constructor(
    public readonly cvmId: string,
    public readonly position: { longitude: number; latitude: number },
  ) {}
}
