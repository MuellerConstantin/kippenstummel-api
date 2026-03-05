import { Event, type IEvent } from '@ocoda/event-sourcing';

@Event('cvm-deletion-unmarked')
export class CvmDeletionUnmarkedEvent implements IEvent {
  constructor(public readonly cvmId: string) {}
}
