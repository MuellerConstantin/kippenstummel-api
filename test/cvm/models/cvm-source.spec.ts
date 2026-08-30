import {
  DefaultEventSerializer,
  type IEventPayload,
} from '@ocoda/event-sourcing';
import {
  CvmImportedEvent,
  CvmRestoredEvent,
  CvmSynchronizedEvent,
} from 'src/core/cvm/events';
import { CvmId } from 'src/core/cvm/models';

const deserialize = <E extends object>(
  cls: new (...args: never[]) => E,
  payload: Record<string, unknown>,
): E =>
  DefaultEventSerializer.for(cls as never).deserialize(
    payload as IEventPayload<never>,
  ) as E;

describe('CVM provenance', () => {
  const cvmId = CvmId.generate().value;
  const position = { longitude: 8.0, latitude: 48.0 };

  describe('event store compatibility', () => {
    /*
     * An import and a synchronization declare where their data comes from, and migration
     * v6 backfilled that onto the persisted ones. These cover that the events deserialize
     * from the migrated payloads by key rather than by position.
     */

    it('deserializes a migrated import event', () => {
      const event = deserialize(CvmImportedEvent, {
        cvmId,
        position,
        source: 'osm',
        initialScore: 3,
      });

      expect(event).toBeInstanceOf(CvmImportedEvent);
      expect(event.cvmId).toBe(cvmId);
      expect(event.initialScore).toBe(3);
      expect(event.source).toBe('osm');
    });

    it('deserializes a migrated synchronization event', () => {
      const event = deserialize(CvmSynchronizedEvent, {
        cvmId,
        position,
        source: 'osm',
        forcedScore: 2,
      });

      expect(event).toBeInstanceOf(CvmSynchronizedEvent);
      expect(event.forcedScore).toBe(2);
      expect(event.source).toBe('osm');
    });

    /*
     * A restore carries nothing but the id — its position and source were aggregate state
     * that only the read model ever needed, and the read model is folded from the stream
     * instead. Payloads written before that still hold both keys, so the event has to
     * deserialize while ignoring them rather than the store needing a rewrite.
     */

    it('deserializes a legacy restore event carrying dropped keys', () => {
      const event = deserialize(CvmRestoredEvent, {
        cvmId,
        position,
        source: 'community',
      });

      expect(event).toBeInstanceOf(CvmRestoredEvent);
      expect(event.cvmId).toBe(cvmId);
    });
  });
});
