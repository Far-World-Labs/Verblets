/**
 * Redis-backed promise for cross-process coordination
 *
 * A promise is just an ID that maps to state in Redis.
 * Any process can create a promise instance with the same ID
 * to resolve, reject, or wait for it.
 */

import { v4 as uuidv4 } from 'uuid';

export class RedisPromise {
  constructor(redis, id = uuidv4(), options = {}) {
    this.redis = redis;
    this.id = id;
    this.namespace = options.namespace || 'promise';
    this.key = `${this.namespace}:${this.id}`;
    this.ttl = options.ttl || 600; // 10 min default
    this.pollInterval = options.pollInterval || 100;
    this.timeout = options.timeout || 30000;
  }

  async resolve(value) {
    const data = JSON.stringify({
      status: 'resolved',
      value,
      timestamp: new Date().toISOString(),
    });

    // NX - only set if doesn't exist (first write wins)
    return await this.redis.set(this.key, data, 'EX', this.ttl, 'NX');
  }

  async reject(error) {
    const data = JSON.stringify({
      status: 'rejected',
      error: error?.message || String(error),
      stack: error?.stack,
      timestamp: new Date().toISOString(),
    });

    return await this.redis.set(this.key, data, 'EX', this.ttl, 'NX');
  }

  /**
   * Get value without cleanup - can be called multiple times
   */
  async getValue() {
    const end = Date.now() + this.timeout;

    while (Date.now() < end) {
      const data = await this.redis.get(this.key);

      if (data) {
        const state = JSON.parse(data);

        if (state.status === 'resolved') {
          return state.value;
        } else if (state.status === 'rejected') {
          const error = new Error(state.error);
          if (state.stack) error.stack = state.stack;
          throw error;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, this.pollInterval));
    }

    throw new Error(`RedisPromise ${this.id} timed out after ${this.timeout}ms`);
  }

  /**
   * Makes this awaitable - waits once and cleans up
   * Usage: const result = await new RedisPromise(redis, 'my-id');
   */
  then(onFulfilled, onRejected) {
    const promise = this.getValue().finally(() => this.cleanup());
    return promise.then(onFulfilled, onRejected);
  }

  /**
   * Implement catch for promise interface
   */
  catch(onRejected) {
    return this.then(undefined, onRejected);
  }

  /**
   * Implement finally for promise interface
   */
  finally(onFinally) {
    return this.then(
      (value) => {
        onFinally();
        return value;
      },
      (reason) => {
        onFinally();
        throw reason;
      }
    );
  }

  async cleanup() {
    return await this.redis.del(this.key);
  }

  // Non-blocking status checks
  async isPending() {
    const data = await this.redis.get(this.key);
    return data === null;
  }

  async isResolved() {
    const data = await this.redis.get(this.key);
    if (!data) return false;
    const state = JSON.parse(data);
    return state.status === 'resolved';
  }

  async isRejected() {
    const data = await this.redis.get(this.key);
    if (!data) return false;
    const state = JSON.parse(data);
    return state.status === 'rejected';
  }

  // Get raw state without blocking (for debugging)
  async getState() {
    const data = await this.redis.get(this.key);
    if (!data) return undefined;
    return JSON.parse(data);
  }
}
