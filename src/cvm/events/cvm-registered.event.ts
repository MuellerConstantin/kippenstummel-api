import { Event, type IEvent } from '@ocoda/event-sourcing';

@Event('cvm-registered')
export class CvmRegisteredEvent implements IEvent {
  constructor(
    public readonly cvmId: string,
    public readonly position: { longitude: number; latitude: number },
    public readonly initialScore?: number,
    public readonly identity?: string,
    public readonly credibility?: number,
  ) {}
}
