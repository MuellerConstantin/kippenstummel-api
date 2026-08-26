const DEAD_INDEX = 'aggregate_id_1';
const INDEX = 'aggregateId_1';

/**
 * @param db {import('mongodb').Db}
 * @param name {string}
 * @returns {Promise<boolean>}
 */
async function hasIndex(db, name) {
  const indexes = await db.collection('cvms').indexes();
  return indexes.some((index) => index.name === name);
}

module.exports = {
  /**
   * Replaces the CVM index that never indexed anything.
   *
   * The read model schema declared `{ aggregate_id: 1 }` while the field is called
   * `aggregateId`. Mongo happily builds an index over a field that does not exist — every
   * document lands under the same null key — so the collection has been paying the write
   * cost of an index that no query can use. Meanwhile every lookup by `aggregateId` is a
   * collection scan, and the read model synchronizer issues one on each vote, reposition
   * and report.
   *
   * Mongoose would create the corrected index by itself on boot, but it never drops the
   * stale one, and relying on it would leave the window between deploy and first boot
   * unindexed. Doing both here keeps the change deterministic and reversible.
   *
   * The index is deliberately not unique. Uniqueness holds in the data — the read model
   * carries exactly one document per aggregate — but declaring it turns a projection bug
   * into a write failure at runtime, which is a separate decision from fixing a typo.
   *
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    await db.collection('cvms').createIndex({ aggregateId: 1 });

    if (await hasIndex(db, DEAD_INDEX)) {
      await db.collection('cvms').dropIndex(DEAD_INDEX);
    }
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    await db.collection('cvms').createIndex({ aggregate_id: 1 });

    if (await hasIndex(db, INDEX)) {
      await db.collection('cvms').dropIndex(INDEX);
    }
  },
};
