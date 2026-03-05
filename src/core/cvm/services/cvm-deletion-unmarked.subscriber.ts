import {
  EventSubscriber,
  IEventSubscriber,
  EventEnvelope,
} from '@ocoda/event-sourcing';
import { CvmDeletionUnmarkedEvent } from '../events';
import { CvmReadModelSynchronizer } from '../repositories';

@EventSubscriber(CvmDeletionUnmarkedEvent)
export class CvmDeletionUnmarkedEventSubscriber implements IEventSubscriber {
  constructor(
    private readonly cvmReadModelSynchronizer: CvmReadModelSynchronizer,
  ) {}

  async handle(envelope: EventEnvelope<CvmDeletionUnmarkedEvent>) {
    const aggregateId = envelope.payload.cvmId as string;

    // Update read model
    await this.cvmReadModelSynchronizer.applyDeletionUnmark(aggregateId);
  }
}
