import { Event, type IEvent } from '@ocoda/event-sourcing';

@Event('cvm-downvoted')
export class CvmDownvotedEvent implements IEvent {
  constructor(
    public readonly cvmId: string,
    public readonly identity: string,
  ) {}
}
