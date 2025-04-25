import { Event, type IEvent } from '@ocoda/event-sourcing';

@Event('cvm-upvoted')
export class CvmUpvotedEvent implements IEvent {
  constructor(
    public readonly cvmId: string,
    public readonly fingerprint: string,
  ) {}
}
