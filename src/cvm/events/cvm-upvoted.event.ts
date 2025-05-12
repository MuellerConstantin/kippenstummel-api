import { Event, type IEvent } from '@ocoda/event-sourcing';

@Event('cvm-upvoted')
export class CvmUpvotedEvent implements IEvent {
  constructor(
    public readonly cvmId: string,
    public readonly identity: string,
    public readonly credibility: number,
  ) {}
}
