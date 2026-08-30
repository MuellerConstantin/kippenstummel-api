import { Injectable } from '@nestjs/common';
import {
  EventStore,
  EventStream,
  type EventEnvelope,
} from '@ocoda/event-sourcing';
import { PiiService } from 'src/infrastructure/pii/services';
import { CvmAggregate, CvmId } from '../models';
import type { CvmImportSource } from '../models/cvm-source.model';
import { CvmReadModelSynchronizer } from './cvm.rm-syncronizer';

type EventPosition = { longitude: number; latitude: number };

/**
 * Replays the event stream of a single CVM to rebuild its read model entry.
 *
 * The entry is dropped before it is rebuilt, so a replay can be run as often as
 * needed and lands on the same result every time. The one input outside the
 * stream is the PII token mapping — an identity erased under Art. 17 of the
 * GDPR does not reappear in a replayed entry.
 */
@Injectable()
export class CvmReadModelReplayer {
  constructor(
    private readonly eventStore: EventStore,
    private readonly cvmReadModelSynchronizer: CvmReadModelSynchronizer,
    private readonly piiService: PiiService,
  ) {}

  /**
   * Rebuilds the read model entry of a CVM from its event history.
   *
   * @param cvmId The CVM to replay.
   */
  async replay(cvmId: CvmId): Promise<void> {
    if (!this.eventStore.getEnvelopes) {
      throw new Error('The configured event store cannot read event envelopes');
    }

    const eventStream = EventStream.for<CvmAggregate>(CvmAggregate, cvmId);

    /*
     * Snapshots are bypassed on purpose. They cap a replay by restoring an
     * aggregate, and the aggregate carries neither `registeredBy` nor
     * `lastVotedAt`. Only the stream from its first event holds everything the
     * read model needs.
     */
    const envelopeCursor = this.eventStore.getEnvelopes(eventStream, {
      fromVersion: 1,
    });

    /*
     * A projection is rebuilt from scratch, so whatever is left of the previous
     * one is dropped first. On a restore this is a no-op — the removal deleted
     * the entry — but it keeps the replayer to a single path and stops a
     * rebuild of a still-present CVM from inserting a duplicate.
     */
    await this.cvmReadModelSynchronizer.applyRemove(cvmId.value);

    for await (const envelopes of envelopeCursor) {
      for (const envelope of envelopes) {
        await this.apply(envelope);
      }
    }
  }

  private async apply(envelope: EventEnvelope): Promise<void> {
    /*
     * The envelope is read without its event type, so the payload arrives
     * untyped and is narrowed per case below, the same way the subscribers do.
     */
    const payload = envelope.payload as Record<string, unknown>;
    const cvmId = payload.cvmId as string;
    const occurredOn = envelope.metadata.occurredOn;

    switch (envelope.event) {
      case 'cvm-registered': {
        const position = payload.position as EventPosition;

        await this.cvmReadModelSynchronizer.applyRegister(
          cvmId,
          position.longitude,
          position.latitude,
          await this.untokenize(payload.creatorIdentity as string),
          occurredOn,
        );

        break;
      }
      case 'cvm-imported': {
        const position = payload.position as EventPosition;

        await this.cvmReadModelSynchronizer.applyImport(
          cvmId,
          position.longitude,
          position.latitude,
          payload.source as CvmImportSource,
          payload.initialScore as number | undefined,
          occurredOn,
        );

        break;
      }
      case 'cvm-synchronized': {
        const position = payload.position as Partial<EventPosition>;

        await this.cvmReadModelSynchronizer.applySync(
          cvmId,
          position.longitude as number,
          position.latitude as number,
          payload.source as CvmImportSource,
          payload.forcedScore as number | undefined,
        );

        break;
      }
      case 'cvm-upvoted': {
        await this.cvmReadModelSynchronizer.applyUpvote(
          cvmId,
          await this.untokenize(payload.voterIdentity as string),
          payload.impact as number,
          occurredOn,
        );

        break;
      }
      case 'cvm-downvoted': {
        await this.cvmReadModelSynchronizer.applyDownvote(
          cvmId,
          await this.untokenize(payload.voterIdentity as string),
          payload.impact as number,
          occurredOn,
        );

        break;
      }
      case 'cvm-repositioned': {
        const position = payload.repositionedPosition as EventPosition;

        await this.cvmReadModelSynchronizer.applyReposition(
          cvmId,
          await this.untokenize(payload.editorIdentity as string),
          position.longitude,
          position.latitude,
          occurredOn,
        );

        break;
      }
      case 'cvm-reported': {
        await this.cvmReadModelSynchronizer.applyReport(
          cvmId,
          await this.untokenize(payload.reporterIdentity as string),
          payload.type as string,
          occurredOn,
        );

        break;
      }
      case 'cvm-deletion-marked': {
        await this.cvmReadModelSynchronizer.applyDeletionMark(
          cvmId,
          new Date(payload.markedAt as string | Date),
        );

        break;
      }
      case 'cvm-deletion-unmarked': {
        await this.cvmReadModelSynchronizer.applyDeletionUnmark(cvmId);

        break;
      }
      /*
       * Removals and restores mark the lifecycle of the entry, they do not
       * describe its data. Folding them would delete the entry being built and,
       * across repeated cycles, recurse into this very replay.
       */
      case 'cvm-removed':
      case 'cvm-restored':
        break;
    }
  }

  /*
   * Due to GDPR, PII is tokenized. This step must be reversed when reading, if
   * still possible and the authority has not already been deleted. An erased
   * identity therefore does not reappear in a rebuilt entry.
   */
  private async untokenize(token: string): Promise<string | null> {
    return (await this.piiService.untokenizePii(token)) as string | null;
  }
}
