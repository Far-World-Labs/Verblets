// Browser-only Redis implementation
// Always returns NullRedisClient in browser environments

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

// In browser, always return NullRedisClient
export const getClient = () => {
  return new NullRedisClient();
};

export const setClient = () => {
  console.warn('setClient is not supported in browser environment');
};
