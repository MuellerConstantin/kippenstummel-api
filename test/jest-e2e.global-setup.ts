import { MongoDBContainer } from '@testcontainers/mongodb';
import { RedisContainer } from '@testcontainers/redis';

module.exports = async () => {
  const mongo = await new MongoDBContainer('mongo:8').start();
  const redis = await new RedisContainer('redis:8').start();

  globalThis.__MONGO_URI__ = mongo.getConnectionString();
  globalThis.__REDIS_URI__ = redis.getConnectionUrl();

  globalThis.__MONGO_CONTAINER__ = mongo;
  globalThis.__REDIS_CONTAINER__ = redis;
};
