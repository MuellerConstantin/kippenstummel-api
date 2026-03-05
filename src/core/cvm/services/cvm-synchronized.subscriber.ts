import {
  EventSubscriber,
  IEventSubscriber,
  EventEnvelope,
} from '@ocoda/event-sourcing';
import { CvmSynchronizedEvent } from '../events';
import { CvmReadModelSynchronizer } from '../repositories';

@EventSubscriber(CvmSynchronizedEvent)
export class CvmSynchronizedEventSubscriber implements IEventSubscriber {
  constructor(
    private readonly cvmReadModelSynchronizer: CvmReadModelSynchronizer,
  ) {}

  async handle(envelope: EventEnvelope<CvmSynchronizedEvent>) {
    const aggregateId = envelope.payload.cvmId as string;
    const forcedScore = envelope.payload.forcedScore as number;
    const forcedPosition = envelope.payload.position as {
      longitude: number;
      latitude: number;
    };

    await this.cvmReadModelSynchronizer.applySync(
      aggregateId,
      forcedPosition.longitude,
      forcedPosition.latitude,
      forcedScore,
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
