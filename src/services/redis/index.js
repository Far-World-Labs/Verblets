import { createClient } from 'redis';

let client;

class NullRedisClient {
  // eslint-disable-next-line class-methods-use-this
  async get() {
    return null;
  }

  // eslint-disable-next-line class-methods-use-this
  async set() {
    // Do nothing, as this is a null client
  }

  // eslint-disable-next-line class-methods-use-this
  async disconnect() {
    // Do nothing, as this is a null client
  }
}

const createRedisClient = async () => {
  return new Promise((resolve) => {
    if (process.env.REDIS_DISABLED) {
      resolve(new NullRedisClient());
      return;
    }

    const redisClient = createClient({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: process.env.REDIS_PORT ?? 6379,
    });

    redisClient.on('error', (error) => {
      console.error(`Redis service [error]: ${error.message}`);
      console.error(
        `Redis service [warning]: Falling back to mock Redis client. This may incur greater usage costs and have slower response times.`
      );

      redisClient.disconnect();

      resolve(new NullRedisClient());
    });

    redisClient.on('connect', () => {
      resolve(redisClient);
    });

    redisClient.connect();
  });
};

export const setClient = (newClient) => {
  client = newClient;
};

export const getClient = () => {
  if (!client) {
    client = createRedisClient();
  }

  return client;
};
