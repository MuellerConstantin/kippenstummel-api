import {
  EventSubscriber,
  IEventSubscriber,
  EventEnvelope,
} from '@ocoda/event-sourcing';
import { CvmDeletionMarkedEvent } from '../events';
import { CvmReadModelSynchronizer } from '../repositories';

@EventSubscriber(CvmDeletionMarkedEvent)
export class CvmDeletionMarkedEventSubscriber implements IEventSubscriber {
  constructor(
    private readonly cvmReadModelSynchronizer: CvmReadModelSynchronizer,
  ) {}

  async handle(envelope: EventEnvelope<CvmDeletionMarkedEvent>) {
    const aggregateId = envelope.payload.cvmId as string;
    const markedAt = envelope.payload.markedAt as Date;

    // Update read model
    await this.cvmReadModelSynchronizer.applyDeletionMark(
      aggregateId,
      markedAt,
    );
  }
}
