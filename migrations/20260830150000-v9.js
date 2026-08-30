const COMMUNITY = 'community';
const DECLARED_EVENTS = ['cvm-imported', 'cvm-synchronized'];
const COMMUNITY_EVENTS = ['cvm-registered', 'cvm-repositioned'];
const BATCH_SIZE = 1000;

module.exports = {
  /**
   * Replaces the CVM read model's `source` with the `sources` set.
   *
   * `source` recorded who wrote the record last. That answers a question nobody asks —
   * it is neither filterable nor indexed, and only the KMC detail view reads it — while
   * failing the one that matters: whether OpenStreetMap material ever entered. An
   * operator import synchronizing an OSM-derived CVM overwrote `osm` with `operator`,
   * and with it the fact that the record is a Derivative Database under ODbL.
   *
   * `sources` only grows, so it survives that. Every origin that contributed data joins
   * the set: an import or synchronization adds its declared origin, a registration and a
   * repositioning add `community`, because in both cases a person supplied the
   * coordinate.
   *
   * The set is derived from the event stream rather than from the column being replaced,
   * because the column has already lost what the stream still holds. Restores are
   * skipped even though migration v6 stamped a source onto them — a restore contributes
   * no data, it only revives what the stream already describes.
   *
   * This reads `events` and writes `cvms`. The event store is not modified.
   *
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    const cursor = db.collection('events').find(
      { event: { $in: [...DECLARED_EVENTS, ...COMMUNITY_EVENTS] } },
      {
        projection: { event: 1, 'payload.cvmId': 1, 'payload.source': 1 },
      },
    );

    /** @type {Map<string, Set<string>>} */
    const sourcesByAggregate = new Map();

    for await (const doc of cursor) {
      const aggregateId = doc.payload && doc.payload.cvmId;

      if (!aggregateId) {
        continue;
      }

      const source = DECLARED_EVENTS.includes(doc.event)
        ? doc.payload.source
        : COMMUNITY;

      if (!source) {
        continue;
      }

      const sources = sourcesByAggregate.get(aggregateId) || new Set();
      sources.add(source);
      sourcesByAggregate.set(aggregateId, sources);
    }

    const operations = [...sourcesByAggregate].map(
      ([aggregateId, sources]) => ({
        updateOne: {
          filter: { aggregateId },
          update: {
            $set: { sources: [...sources] },
            $unset: { source: '' },
          },
        },
      }),
    );

    for (let index = 0; index < operations.length; index += BATCH_SIZE) {
      await db
        .collection('cvms')
        .bulkWrite(operations.slice(index, index + BATCH_SIZE));
    }

    /*
     * A read model entry whose stream holds none of the events above cannot exist, but
     * leaving one without `sources` would surface as an undefined field in the API
     * rather than as a loud failure. The old column is the best available answer for it.
     */
    await db
      .collection('cvms')
      .updateMany({ sources: { $exists: false }, source: { $exists: true } }, [
        { $set: { sources: ['$source'] } },
        { $unset: 'source' },
      ]);
  },

  /**
   * Collapses `sources` back into a single `source`.
   *
   * Which import wrote last is ordering that only the event stream holds, so this picks
   * the declared origin over `community` rather than pretending to recover it. That is
   * lossy in principle and harmless in practice: `up` derives the set from the events
   * again, so a down-and-up round trip restores the full answer.
   *
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    await db.collection('cvms').updateMany({ sources: { $exists: true } }, [
      {
        $set: {
          source: {
            $ifNull: [
              {
                $first: {
                  $filter: {
                    input: '$sources',
                    cond: { $ne: ['$$this', COMMUNITY] },
                  },
                },
              },
              COMMUNITY,
            ],
          },
        },
      },
      { $unset: 'sources' },
    ]);
  },
};
