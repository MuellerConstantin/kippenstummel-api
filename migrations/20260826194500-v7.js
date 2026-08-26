module.exports = {
  /**
   * Backfills `cvms.lastVotedAt` from the `votes` collection.
   *
   * The field used to be computed on the fly: filtering a CVM by `lastVotedAt` made the
   * RSQL transformer switch to an aggregation that looked `votes` up per CVM and reduced
   * it with `$max`. With no index on `votes.cvm` that is a full scan of the collection
   * for every CVM the surrounding query touches.
   *
   * The read model already writes the CVM document on every vote (`$inc` on `score`), so
   * carrying the timestamp along costs nothing and turns the filter back into a plain
   * match. From here on the read model synchronizer maintains the field; this migration
   * only supplies the history.
   *
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    await db
      .collection('votes')
      .aggregate([
        { $group: { _id: '$cvm', lastVotedAt: { $max: '$createdAt' } } },
        {
          $merge: {
            into: 'cvms',
            on: '_id',
            whenMatched: 'merge',
            whenNotMatched: 'discard',
          },
        },
      ])
      .toArray();
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    await db.collection('cvms').updateMany({}, { $unset: { lastVotedAt: '' } });
  },
};
