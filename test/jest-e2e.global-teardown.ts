module.exports = async () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  await globalThis.__MONGO_CONTAINER__.stop();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  await globalThis.__REDIS_CONTAINER__.stop();
};
