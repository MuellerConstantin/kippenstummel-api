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
      const idents = await db
        .collection('idents')
        .find({})
        .skip(skip)
        .limit(batchSize)
        .toArray();

      if (idents.length === 0) {
        break;
      }

      const karmaDocs = idents.map((identity) => ({
        insertOne: {
          document: {
            identity: identity.identity.toString(),
            amount: 100,
            history: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      }));

      const result = await db.collection('karmas').bulkWrite(karmaDocs);
      const insertedIds = Object.values(result.insertedIds);

      const updates = idents.map((identity, index) => ({
        updateOne: {
          filter: { _id: identity._id },
          update: { $set: { karma: insertedIds[index] } },
        },
      }));

      await db.collection('idents').bulkWrite(updates);

      skip += batchSize;
    }
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    await db.collection('idents').updateMany({}, { $unset: { karma: '' } });
    await db.collection('karmas').deleteMany({});
  },
};
