import { Event, type IEvent } from '@ocoda/event-sourcing';

@Event('cvm-imported')
export class CvmImportedEvent implements IEvent {
  constructor(
    public readonly cvmId: string,
    public readonly position: { longitude: number; latitude: number },
    public readonly initialScore?: number,
  ) {}
}
