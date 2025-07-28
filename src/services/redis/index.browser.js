// Browser-only Redis implementation
// Always returns NullRedisClient in browser environments

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

// In browser, always return NullRedisClient
export const getClient = () => {
  return new NullRedisClient();
};

export const setClient = () => {
  console.warn('setClient is not supported in browser environment');
};
