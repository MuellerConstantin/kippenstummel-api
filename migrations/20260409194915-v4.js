module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    const now = new Date();

    await db
      .collection('idents')
      .updateMany(
        { lastActiveAt: { $exists: false } },
        { $set: { lastActiveAt: now } },
      );
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    await db
      .collection('idents')
      .updateMany({}, { $unset: { lastActiveAt: '' } });
  },
};
