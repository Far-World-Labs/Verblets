import { createClient } from 'redis';

let client;
let constructingClient;

class NullRedisClient {
  constructor() {
    this.store = {};
  }

  async get(key) {
    // Redis returns null, not undefined
    return this.store[key] ?? null;
  }

  async del(key) {
    delete this.store[key];
  }

  async set(key, value) {
    this.store[key] = value;
  }

  // eslint-disable-next-line class-methods-use-this, no-empty-function
  async disconnect() {
    // no implementation
  }
}

const constructClient = async () => {
  if (process.env.TEST === 'true' && process.env.EXAMPLES !== 'true') {
    client = new NullRedisClient();
    return;
  }

  const redisClient = createClient({
    host: process.env.REDIS_HOST ?? 'localhost',
    port: process.env.REDIS_PORT ?? 6379,
  });

  redisClient.on('error', (error) => {
    if (client instanceof NullRedisClient) {
      return;
    }

    if (/ECONNREFUSED/.test(error.message)) {
      console.error(
        `Redis service [warning]: "${error.message}" Falling back to mock Redis client. This may incur greater usage costs and have slower response times.`
      );
      client = new NullRedisClient();
    } else {
      console.error(`Redis service [error]: ${error.message}`);
    }

    redisClient.disconnect();
  });

  try {
    await redisClient.connect();
    client = redisClient;
  } catch (error) {
    console.error(
      `Redis service create [warning]: "${error.message}" Falling back to mock Redis client. This may incur greater usage costs and have slower response times.`
    );
    client = new NullRedisClient();
  }
};

export const getClient = async () => {
  if (client) {
    return client;
  }

  if (!constructingClient) {
    constructingClient = constructClient();
  }

  await constructingClient;
  return client;
};

export const setClient = (newClient) => {
  client = newClient;
};
