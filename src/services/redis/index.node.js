// Node.js-specific Redis implementation
// This file contains the full Redis client with fallback support

import { createClient } from 'redis';
import { env } from '../../lib/env/index.js';

let client;
let constructingClient;

class NullRedisClient {
  constructor() {
    this.store = {};
  }

  get(key) {
    // Redis returns null, not undefined
    return this.store[key] ?? null;
  }

  del(key) {
    delete this.store[key];
  }

  set(key, value, _options) {
    this.store[key] = value;
  }

  disconnect() {
    // no implementation
  }
}

class SafeRedisClient {
  constructor(redisClient) {
    this.redisClient = redisClient;
    this.fallbackClient = new NullRedisClient();
  }

  async get(key) {
    try {
      return await this.redisClient.get(key);
    } catch (error) {
      if (this.isConnectionError(error)) {
        console.warn('Redis connection lost, falling back to in-memory cache');
        return this.fallbackClient.get(key);
      }
      throw error;
    }
  }

  async set(key, value, options) {
    try {
      return await this.redisClient.set(key, value, options);
    } catch (error) {
      if (this.isConnectionError(error)) {
        console.warn('Redis connection lost, falling back to in-memory cache');
        return this.fallbackClient.set(key, value, options);
      }
      throw error;
    }
  }

  async del(key) {
    try {
      return await this.redisClient.del(key);
    } catch (error) {
      if (this.isConnectionError(error)) {
        console.warn('Redis connection lost, falling back to in-memory cache');
        return this.fallbackClient.del(key);
      }
      throw error;
    }
  }

  async disconnect() {
    try {
      return await this.redisClient.disconnect();
    } catch {
      // Ignore disconnect errors
    }
  }

  isConnectionError(error) {
    return (
      error.message.includes('client is closed') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('connection') ||
      error.code === 'ECONNREFUSED'
    );
  }
}

const constructClient = async () => {
  // Use in-memory cache for tests unless explicitly enabled
  if (env.NODE_ENV === 'test' && env.USE_REDIS_CACHE !== 'true') {
    client = new NullRedisClient();
    return;
  }

  const redisClient = createClient({
    host: env.REDIS_HOST ?? 'localhost',
    port: env.REDIS_PORT ?? 6379,
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
      client = new NullRedisClient();
    }

    // Safely disconnect the Redis client
    redisClient.disconnect().catch(() => {
      // Ignore disconnect errors
    });
  });

  try {
    await redisClient.connect();
    client = new SafeRedisClient(redisClient);
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
