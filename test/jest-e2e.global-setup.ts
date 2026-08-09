import { MongoDBContainer } from '@testcontainers/mongodb';
import { RedisContainer } from '@testcontainers/redis';

module.exports = async () => {
  const mongo = await new MongoDBContainer('mongo:8').start();
  const redis = await new RedisContainer('redis:8').start();

  // globalThis is per process, so jest workers never see it. process.env is
  // inherited by the workers jest forks after this hook, so publish it there.
  process.env.MONGO_URI = mongo.getConnectionString();
  process.env.REDIS_URI = redis.getConnectionUrl();

  globalThis.__MONGO_URI__ = process.env.MONGO_URI;
  globalThis.__REDIS_URI__ = process.env.REDIS_URI;

  globalThis.__MONGO_CONTAINER__ = mongo;
  globalThis.__REDIS_CONTAINER__ = redis;
};
