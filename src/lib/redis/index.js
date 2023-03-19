import { createClient } from 'redis';

let client;

class NullRedisClient {
  async get(key) {
    return null;
  }

  async set(key, value) {
    // Do nothing, as this is a null client
  }

  async disconnect() {}
};

const createRedisClient = async () => {
  return new Promise((resolve, reject) => {
    if (process.env.REDIS_DISABLED) {
      return resolve(new NullRedisClient());
    }

    const client = createClient({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: process.env.REDIS_PORT ?? 6379,
    });

    client.on('error', (error) => {
      console.error(`Redis service [error]: ${error.message}`);
      console.error(`Redis service [warning]: Falling back to mock Redis client. This may incur greater usage costs and have slower response times.`);

      client.disconnect();

      resolve(new NullRedisClient());
    });

    client.on('connect', () => {
      resolve(client);
    });

    client.connect();
  });
}

export default async () => {
  if (!client) {
    client = createRedisClient();
  }

  return client;
}
