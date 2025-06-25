import { Event, type IEvent } from '@ocoda/event-sourcing';

@Event('cvm-repositioned')
export class CvmRepositionedEvent implements IEvent {
  constructor(
    public readonly cvmId: string,
    public readonly editorIdentity: string,
    public readonly credibility: number,
    public readonly formerPosition: {
      longitude: number;
      latitude: number;
    },
    public readonly repositionedPosition: {
      longitude: number;
      latitude: number;
    },
  ) {}
}
