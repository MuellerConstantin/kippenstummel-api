module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    const batchSize = 1000;
    let skip = 0;

    while (true) {
      const credibilities = await db
        .collection('credibilities')
        .find({})
        .skip(skip)
        .limit(batchSize)
        .toArray();

      if (credibilities.length === 0) break;

      const updates = credibilities.map((cred) => ({
        updateOne: {
          filter: { _id: cred._id },
          update: {
            $unset: { 'behaviour.unrealisticMovementCount': '' },
            $set: {
              'behaviour.unrealisticMovementScore': 0,
              updatedAt: new Date(),
            },
          },
        },
      }));

      await db.collection('credibilities').bulkWrite(updates);
      skip += batchSize;
    }
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    const batchSize = 1000;
    let skip = 0;

    while (true) {
      const credibilities = await db
        .collection('credibilities')
        .find({})
        .skip(skip)
        .limit(batchSize)
        .toArray();

      if (credibilities.length === 0) break;

      const updates = credibilities.map((cred) => ({
        updateOne: {
          filter: { _id: cred._id },
          update: {
            $unset: { 'behaviour.unrealisticMovementScore': '' },
            $set: {
              'behaviour.unrealisticMovementCount': 0,
              updatedAt: new Date(),
            },
          },
        },
      }));

      await db.collection('credibilities').bulkWrite(updates);
      skip += batchSize;
    }
  },
};
