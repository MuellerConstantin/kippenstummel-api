import { Event, type IEvent } from '@ocoda/event-sourcing';

@Event('cvm-deletion-marked')
export class CvmDeletionMarkedEvent implements IEvent {
  constructor(
    public readonly cvmId: string,
    public readonly markedAt: Date,
  ) {}
}
