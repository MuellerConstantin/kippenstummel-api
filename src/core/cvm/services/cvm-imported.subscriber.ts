import {
  EventSubscriber,
  IEventSubscriber,
  EventEnvelope,
} from '@ocoda/event-sourcing';
import { CvmImportedEvent } from '../events';
import { CvmReadModelSynchronizer } from '../repositories';

@EventSubscriber(CvmImportedEvent)
export class CvmImportedEventSubscriber implements IEventSubscriber {
  constructor(
    private readonly cvmReadModelSynchronizer: CvmReadModelSynchronizer,
  ) {}

  async handle(envelope: EventEnvelope<CvmImportedEvent>) {
    const aggregateId = envelope.payload.cvmId as string;
    const initialScore = envelope.payload.initialScore as number;
    const position = envelope.payload.position as {
      longitude: number;
      latitude: number;
    };

    // Update read model
    await this.cvmReadModelSynchronizer.applyImport(
      aggregateId,
      position.longitude,
      position.latitude,
      initialScore,
    );

    /*
     * Cluster tiles are explicitly not recomputed here. This is because
     * the cluster tile computation is a time-consuming operation and should not
     * be run every time a CVM is imported. Instead the cluster tile computation
     * is scheduled batch-wise after the import finishes.
     *
     * Because of this the recomputation is triggered by the ImportCvmsCommandHandler
     * directly after all CVMs have been imported and synchronized.
     */
  }
}
