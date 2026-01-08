const BATCH_SIZE = 1000;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEX_REGEX = /^[0-9a-f]+$/i;

module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    const cvms = db.collection('cvms');
    const piiTokens = db.collection('pii-tokens');

    while (true) {
      const batch = await cvms
        .find({
          registeredBy: { $type: 'string' },
          $expr: {
            $and: [
              {
                $regexMatch: {
                  input: '$registeredBy',
                  regex: HEX_REGEX.source,
                  options: 'i',
                },
              },
              {
                $not: {
                  $regexMatch: {
                    input: '$registeredBy',
                    regex: UUID_REGEX.source,
                    options: 'i',
                  },
                },
              },
            ],
          },
        })
        .limit(BATCH_SIZE)
        .toArray();

      if (batch.length === 0) break;

      const tokens = batch.map((doc) => doc.registeredBy);

      const lookups = await piiTokens
        .find({ token: { $in: tokens } })
        .toArray();

      const tokenToPii = new Map(lookups.map((l) => [l.token, l.data]));

      const updates = batch.map((doc) => {
        const pii = tokenToPii.get(doc.registeredBy);

        return {
          updateOne: {
            filter: { _id: doc._id },
            update: pii
              ? {
                  $set: {
                    registeredBy: pii,
                    registeredByBackfilledAt: new Date(),
                    updatedAt: new Date(),
                  },
                }
              : {
                  $unset: { registeredBy: '' },
                  $set: {
                    registeredByBackfilledAt: new Date(),
                    updatedAt: new Date(),
                  },
                },
          },
        };
      });

      if (updates.length > 0) {
        await cvms.bulkWrite(updates);
      }
    }
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {},
};
