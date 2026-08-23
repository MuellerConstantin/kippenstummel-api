import {
  DefaultEventSerializer,
  type IEventPayload,
} from '@ocoda/event-sourcing';
import {
  CvmImportedEvent,
  CvmRegisteredEvent,
  CvmRestoredEvent,
  CvmSynchronizedEvent,
} from 'src/core/cvm/events';
import { CvmAggregate, CvmId } from 'src/core/cvm/models';
import { CvmSnapshotRepository } from 'src/core/cvm/repositories/cvm.snapshot-repository';

const replay = (...events: object[]): CvmAggregate => {
  const aggregate = new CvmAggregate();

  for (const event of events) {
    aggregate.applyEvent(event, true);
  }

  return aggregate;
};

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
     * Migration v6 backfills the source into every persisted import, synchronization and
     * restore event, so a replay always yields a defined source. These cover that the
     * events deserialize from the migrated payloads by key rather than by position.
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

    it('deserializes a migrated restore event', () => {
      const event = deserialize(CvmRestoredEvent, {
        cvmId,
        position,
        source: 'community',
      });

      expect(event).toBeInstanceOf(CvmRestoredEvent);
      expect(event.source).toBe('community');
    });
  });

  describe('derivation from the event stream', () => {
    it('records a registered CVM as community-contributed', () => {
      const aggregate = replay(
        new CvmRegisteredEvent(cvmId, position, 'identity'),
      );

      expect(aggregate.source).toBe('community');
    });

    it.each(['osm', 'operator'] as const)(
      'records a %s import with its declared origin',
      (source) => {
        const aggregate = replay(new CvmImportedEvent(cvmId, position, source));

        expect(aggregate.source).toBe(source);
      },
    );

    /*
     * A synchronization replaces the data, so the previous origin stops describing what
     * the record holds.
     */

    it('overwrites the source when data is synchronized into a CVM', () => {
      const aggregate = replay(
        new CvmRegisteredEvent(cvmId, position, 'identity'),
        new CvmSynchronizedEvent(cvmId, position, 'osm'),
      );

      expect(aggregate.source).toBe('osm');
    });

    it('overwrites the source again when another import synchronizes it', () => {
      const aggregate = replay(
        new CvmImportedEvent(cvmId, position, 'osm'),
        new CvmSynchronizedEvent(cvmId, position, 'operator'),
      );

      expect(aggregate.source).toBe('operator');
    });

    it('keeps the source across a restore', () => {
      const aggregate = replay(
        new CvmImportedEvent(cvmId, position, 'osm'),
        new CvmRestoredEvent(cvmId, position, 'osm'),
      );

      expect(aggregate.source).toBe('osm');
    });
  });

  describe('snapshots', () => {
    const repository = Object.create(
      CvmSnapshotRepository.prototype,
    ) as CvmSnapshotRepository;

    it('round-trips the source', () => {
      const aggregate = replay(new CvmImportedEvent(cvmId, position, 'osm'));

      const restored = repository.deserialize(repository.serialize(aggregate));

      expect(restored.source).toBe('osm');
    });
  });
});
