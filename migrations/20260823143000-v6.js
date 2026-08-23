const OSM = 'osm';
const COMMUNITY = 'community';

const SOURCED_EVENTS = ['cvm-imported', 'cvm-synchronized', 'cvm-restored'];

module.exports = {
  /**
   * Backfills the provenance of every CVM.
   *
   * ## This migration rewrites event payloads. That is a deliberate, one-time exception.
   *
   * Event sourcing treats the event store as append-only, and this project holds to that
   * everywhere else — reading from `events` is fine, writing to it is not. The regular
   * answer to "we learned something about the past" is to append a correcting event, and
   * that route was built and then discarded on purpose. The reasons:
   *
   * - The correcting event carries no information the migration does not. Every import
   *   that ran before provenance tracking was an OpenStreetMap import; this is attested
   *   by the operator, closed, and will not change. There is no ongoing process that
   *   would produce more such events.
   * - It is not a rewrite of what happened. The source was always a property of these
   *   imports — it was simply never written down. No recorded fact is altered, contrast
   *   turning a past upvote into a downvote.
   * - The append route cost a dedicated event type, its subscriber, an aggregate method,
   *   a read model method, a standalone backfill script and a deployment ordering hazard
   *   (an instance that predates the new event type throws on replaying it). All of that
   *   would exist solely to run once.
   * - The record of the declaration does not depend on the data. This file is in version
   *   control, dated and reviewed. Any import, synchronization or restore event created
   *   before it ran carries a backfilled source — that is reconstructible from here.
   *
   * So YAGNI and KISS win over the convention in this specific case, and what is bought
   * is a materially simpler codebase and a migration that either succeeds or fails as a
   * whole. Should moderators ever need to correct a CVM's provenance at runtime, that is
   * a genuine use case for an appended event and should be built then.
   *
   * This exception applies to this migration only. It is not a precedent for editing the
   * event store whenever it is convenient — the next case has to argue for itself.
   *
   * ## What is written
   *
   * Everything is community-contributed except aggregates carrying an import or
   * synchronization event; those came from OpenStreetMap. Events, snapshots and the read
   * model are updated together so that a replay and the projection agree.
   *
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    const importedAggregateIds = await db
      .collection('events')
      .distinct('payload.cvmId', {
        event: { $in: ['cvm-imported', 'cvm-synchronized'] },
      });

    // Event store

    await db.collection('events').updateMany(
      {
        event: { $in: SOURCED_EVENTS },
        'payload.cvmId': { $in: importedAggregateIds },
      },
      { $set: { 'payload.source': OSM } },
    );

    /*
     * Only restores can belong to an aggregate that was never imported — imports and
     * synchronizations define the set above.
     */

    await db.collection('events').updateMany(
      {
        event: 'cvm-restored',
        'payload.cvmId': { $nin: importedAggregateIds },
      },
      { $set: { 'payload.source': COMMUNITY } },
    );

    /*
     * Snapshots cap the replay, so an unpatched one would keep an aggregate without a
     * source no matter what the events say.
     */

    await db
      .collection('snapshots')
      .updateMany(
        { aggregateName: 'cvm', 'payload.id': { $in: importedAggregateIds } },
        { $set: { 'payload.source': OSM } },
      );

    await db
      .collection('snapshots')
      .updateMany(
        { aggregateName: 'cvm', 'payload.id': { $nin: importedAggregateIds } },
        { $set: { 'payload.source': COMMUNITY } },
      );

    // Read model

    await db
      .collection('cvms')
      .updateMany(
        { aggregateId: { $in: importedAggregateIds } },
        { $set: { source: OSM } },
      );

    await db
      .collection('cvms')
      .updateMany(
        { aggregateId: { $nin: importedAggregateIds } },
        { $set: { source: COMMUNITY } },
      );
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    await db
      .collection('events')
      .updateMany(
        { event: { $in: SOURCED_EVENTS } },
        { $unset: { 'payload.source': '' } },
      );

    await db
      .collection('snapshots')
      .updateMany(
        { aggregateName: 'cvm' },
        { $unset: { 'payload.source': '' } },
      );

    await db.collection('cvms').updateMany({}, { $unset: { source: '' } });
  },
};
