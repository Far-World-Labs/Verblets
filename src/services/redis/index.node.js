// Node.js-specific Redis implementation
// This file contains the full Redis client with fallback support

import { createClient } from 'redis';
import { env } from '../../lib/env/index.js';

let client;
let constructingClient;

class NullRedisClient {
  constructor() {
    this.store = {};
    this.hashes = {};
    this.lists = {};
  }

  get(key) {
    return this.store[key] ?? null;
  }

  del(keys) {
    const keysArray = Array.isArray(keys) ? keys : [keys];
    let deleted = 0;
    keysArray.forEach((key) => {
      if (this.store[key] !== undefined || this.hashes[key] || this.lists[key]) {
        delete this.store[key];
        delete this.hashes[key];
        delete this.lists[key];
        deleted++;
      }
    });
    return deleted;
  }

  set(key, value, _options) {
    this.store[key] = value;
  }

  incr(key) {
    const current = parseInt(this.store[key] || '0', 10);
    const newValue = current + 1;
    this.store[key] = String(newValue);
    return newValue;
  }

  incrby(key, increment) {
    const current = parseInt(this.store[key] || '0', 10);
    const newValue = current + increment;
    this.store[key] = String(newValue);
    return newValue;
  }

  incrBy(key, increment) {
    return this.incrby(key, increment);
  }

  // Hash operations
  hset(key, field, value) {
    if (!this.hashes[key]) this.hashes[key] = {};
    const isNew = !this.hashes[key][field];
    this.hashes[key][field] = value;
    return isNew ? 1 : 0;
  }

  hSet(key, field, value) {
    return this.hset(key, field, value);
  }

  hsetnx(key, field, value) {
    if (!this.hashes[key]) this.hashes[key] = {};
    if (this.hashes[key][field] !== undefined) return 0;
    this.hashes[key][field] = value;
    return 1;
  }

  hget(key, field) {
    return this.hashes[key]?.[field] ?? null;
  }

  hgetall(key) {
    return this.hashes[key] || {};
  }

  hGetAll(key) {
    return this.hgetall(key);
  }

  hvals(key) {
    const hash = this.hashes[key];
    return hash ? Object.values(hash) : [];
  }

  hdel(key, field) {
    if (!this.hashes[key] || this.hashes[key][field] === undefined) return 0;
    delete this.hashes[key][field];
    return 1;
  }

  hincrby(key, field, increment) {
    if (!this.hashes[key]) this.hashes[key] = {};
    const current = parseInt(this.hashes[key][field] || '0', 10);
    const newValue = current + increment;
    this.hashes[key][field] = String(newValue);
    return newValue;
  }

  hIncrBy(key, field, increment) {
    return this.hincrby(key, field, increment);
  }

  hlen(key) {
    return this.hashes[key] ? Object.keys(this.hashes[key]).length : 0;
  }

  // List operations
  rpush(key, ...values) {
    if (!this.lists[key]) this.lists[key] = [];
    this.lists[key].push(...values);
    return this.lists[key].length;
  }

  lpush(key, ...values) {
    if (!this.lists[key]) this.lists[key] = [];
    this.lists[key].unshift(...values);
    return this.lists[key].length;
  }

  llen(key) {
    return this.lists[key]?.length || 0;
  }

  lrange(key, start, stop) {
    const list = this.lists[key];
    if (!list) return [];

    const len = list.length;
    let startIdx = start < 0 ? Math.max(0, len + start) : Math.min(start, len);
    let stopIdx = stop < 0 ? Math.max(-1, len + stop) : Math.min(stop, len - 1);

    if (startIdx > stopIdx) return [];
    return list.slice(startIdx, stopIdx + 1);
  }

  lset(key, index, value) {
    const list = this.lists[key];
    if (!list || index >= list.length || index < -list.length) {
      throw new Error('ERR index out of range');
    }
    const idx = index < 0 ? list.length + index : index;
    list[idx] = value;
    return 'OK';
  }

  ltrim(key, start, stop) {
    const list = this.lists[key];
    if (!list) return 'OK';

    const len = list.length;
    let startIdx = start < 0 ? Math.max(0, len + start) : Math.min(start, len);
    let stopIdx = stop < 0 ? Math.max(-1, len + stop) : Math.min(stop, len - 1);

    if (startIdx > stopIdx) {
      this.lists[key] = [];
    } else {
      this.lists[key] = list.slice(startIdx, stopIdx + 1);
    }
    return 'OK';
  }

  // Transaction support (simplified)
  multi() {
    const operations = [];
    return {
      set: (key, value) => {
        operations.push(['set', key, value]);
        return this;
      },
      hset: (key, field, value) => {
        operations.push(['hset', key, field, value]);
        return this;
      },
      lset: (key, index, value) => {
        operations.push(['lset', key, index, value]);
        return this;
      },
      rpush: (key, ...values) => {
        operations.push(['rpush', key, ...values]);
        return this;
      },
      lpush: (key, ...values) => {
        operations.push(['lpush', key, ...values]);
        return this;
      },
      ltrim: (key, start, stop) => {
        operations.push(['ltrim', key, start, stop]);
        return this;
      },
      exec: () => {
        const results = [];
        for (const [op, ...args] of operations) {
          try {
            results.push(this[op](...args));
          } catch (error) {
            results.push(error);
          }
        }
        return Promise.resolve(results);
      },
    };
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

  async del(keys) {
    try {
      return await this.redisClient.del(keys);
    } catch (error) {
      if (this.isConnectionError(error)) {
        console.warn('Redis connection lost, falling back to in-memory cache');
        return this.fallbackClient.del(keys);
      }
      throw error;
    }
  }

  async incrBy(key, increment) {
    try {
      return await this.redisClient.incrBy(key, increment);
    } catch (error) {
      if (this.isConnectionError(error)) {
        console.warn('Redis connection lost, falling back to in-memory cache');
        return this.fallbackClient.incrBy(key, increment);
      }
      throw error;
    }
  }

  // Hash operations
  async hset(key, field, value) {
    try {
      return await this.redisClient.hSet(key, field, value);
    } catch (error) {
      if (this.isConnectionError(error)) {
        console.warn('Redis connection lost, falling back to in-memory cache');
        return this.fallbackClient.hset(key, field, value);
      }
      throw error;
    }
  }

  async hsetnx(key, field, value) {
    try {
      return await this.redisClient.hSetNX(key, field, value);
    } catch (error) {
      if (this.isConnectionError(error)) {
        console.warn('Redis connection lost, falling back to in-memory cache');
        return this.fallbackClient.hsetnx(key, field, value);
      }
      throw error;
    }
  }

  async hget(key, field) {
    try {
      return await this.redisClient.hGet(key, field);
    } catch (error) {
      if (this.isConnectionError(error)) {
        console.warn('Redis connection lost, falling back to in-memory cache');
        return this.fallbackClient.hget(key, field);
      }
      throw error;
    }
  }

  async hgetall(key) {
    try {
      return await this.redisClient.hGetAll(key);
    } catch (error) {
      if (this.isConnectionError(error)) {
        console.warn('Redis connection lost, falling back to in-memory cache');
        return this.fallbackClient.hgetall(key);
      }
      throw error;
    }
  }

  hGetAll(key) {
    return this.hgetall(key);
  }

  hSet(key, field, value) {
    return this.hset(key, field, value);
  }

  async hvals(key) {
    try {
      return await this.redisClient.hVals(key);
    } catch (error) {
      if (this.isConnectionError(error)) {
        console.warn('Redis connection lost, falling back to in-memory cache');
        return this.fallbackClient.hvals(key);
      }
      throw error;
    }
  }

  async hdel(key, field) {
    try {
      return await this.redisClient.hDel(key, field);
    } catch (error) {
      if (this.isConnectionError(error)) {
        console.warn('Redis connection lost, falling back to in-memory cache');
        return this.fallbackClient.hdel(key, field);
      }
      throw error;
    }
  }

  async hIncrBy(key, field, increment) {
    try {
      return await this.redisClient.hIncrBy(key, field, increment);
    } catch (error) {
      if (this.isConnectionError(error)) {
        console.warn('Redis connection lost, falling back to in-memory cache');
        return this.fallbackClient.hIncrBy(key, field, increment);
      }
      throw error;
    }
  }

  async hlen(key) {
    try {
      return await this.redisClient.hLen(key);
    } catch (error) {
      if (this.isConnectionError(error)) {
        console.warn('Redis connection lost, falling back to in-memory cache');
        return this.fallbackClient.hlen(key);
      }
      throw error;
    }
  }

  // List operations
  async rpush(key, ...values) {
    try {
      return await this.redisClient.rPush(key, values);
    } catch (error) {
      if (this.isConnectionError(error)) {
        console.warn('Redis connection lost, falling back to in-memory cache');
        return this.fallbackClient.rpush(key, ...values);
      }
      throw error;
    }
  }

  async lpush(key, ...values) {
    try {
      return await this.redisClient.lPush(key, values);
    } catch (error) {
      if (this.isConnectionError(error)) {
        console.warn('Redis connection lost, falling back to in-memory cache');
        return this.fallbackClient.lpush(key, ...values);
      }
      throw error;
    }
  }

  async llen(key) {
    try {
      return await this.redisClient.lLen(key);
    } catch (error) {
      if (this.isConnectionError(error)) {
        console.warn('Redis connection lost, falling back to in-memory cache');
        return this.fallbackClient.llen(key);
      }
      throw error;
    }
  }

  async lrange(key, start, stop) {
    try {
      return await this.redisClient.lRange(key, start, stop);
    } catch (error) {
      if (this.isConnectionError(error)) {
        console.warn('Redis connection lost, falling back to in-memory cache');
        return this.fallbackClient.lrange(key, start, stop);
      }
      throw error;
    }
  }

  async lset(key, index, value) {
    try {
      return await this.redisClient.lSet(key, index, value);
    } catch (error) {
      if (this.isConnectionError(error)) {
        console.warn('Redis connection lost, falling back to in-memory cache');
        return this.fallbackClient.lset(key, index, value);
      }
      throw error;
    }
  }

  async ltrim(key, start, stop) {
    try {
      return await this.redisClient.lTrim(key, start, stop);
    } catch (error) {
      if (this.isConnectionError(error)) {
        console.warn('Redis connection lost, falling back to in-memory cache');
        return this.fallbackClient.ltrim(key, start, stop);
      }
      throw error;
    }
  }

  // Transaction support
  multi() {
    try {
      const multi = this.redisClient.multi();
      return {
        set: (key, value) => {
          multi.set(key, value);
          return this;
        },
        hset: (key, field, value) => {
          multi.hSet(key, field, value);
          return this;
        },
        lset: (key, index, value) => {
          multi.lSet(key, index, value);
          return this;
        },
        rpush: (key, ...values) => {
          multi.rPush(key, values);
          return this;
        },
        lpush: (key, ...values) => {
          multi.lPush(key, values);
          return this;
        },
        ltrim: (key, start, stop) => {
          multi.lTrim(key, start, stop);
          return this;
        },
        exec: async () => await multi.exec(),
      };
    } catch (error) {
      if (this.isConnectionError(error)) {
        console.warn('Redis connection lost, falling back to in-memory cache');
        return this.fallbackClient.multi();
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
