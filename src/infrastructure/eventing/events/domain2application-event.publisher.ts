import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  EventEnvelope,
  EventPublisher,
  IEvent,
  IEventPublisher,
} from '@ocoda/event-sourcing';

@Injectable()
@EventPublisher()
export class Domain2ApplicationEventPublisher implements IEventPublisher {
  constructor(private eventEmitter: EventEmitter2) {}

  // eslint-disable-next-line @typescript-eslint/require-await
  async publish(envelope: EventEnvelope<IEvent>): Promise<void> {
    this.eventEmitter.emit(envelope.event, envelope.payload);
  }
}
