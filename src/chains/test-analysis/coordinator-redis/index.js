/**
 * Redis wait utilities for coordination
 */

const POLL_INTERVAL_MS = 100;

// Simple polling
const poll = async (check, timeout = 30000) => {
  const end = Date.now() + timeout;

  while (Date.now() < end) {
    const result = await check();
    if (result !== undefined) return result;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  return undefined;
};

export const waitForKey = (redis, key, timeoutMs = 30000) =>
  poll(async () => {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : undefined;
  }, timeoutMs);

export const waitForValue = async (redis, key, expectedValue, timeoutMs = 30000) =>
  !!(await poll(async () => {
    const value = await redis.get(key);
    return (value && JSON.parse(value) === expectedValue) || undefined;
  }, timeoutMs));

export const waitForCondition = async (conditionFn, timeoutMs = 30000) =>
  (await poll(conditionFn, timeoutMs)) || false;

export const waitForAllKeys = async (redis, keys, timeoutMs = 30000) =>
  (await poll(async () => {
    const values = {};
    for (const key of keys) {
      const value = await redis.get(key);
      if (!value) return undefined;
      values[key] = JSON.parse(value);
    }
    return values;
  }, timeoutMs)) || null;

export const waitForHashFields = async (redis, hashKey, fields, timeoutMs = 30000) =>
  (await poll(async () => {
    const hash = await redis.hgetall(hashKey);
    if (!hash || !fields.every((f) => hash[f] !== undefined)) return undefined;

    const result = {};
    for (const field of fields) {
      result[field] = JSON.parse(hash[field]);
    }
    return result;
  }, timeoutMs)) || null;

export const waitForCount = async (redis, key, targetCount, timeoutMs = 30000) =>
  (await poll(async () => {
    const value = await redis.get(key);
    if (!value) return undefined;
    const count = parseInt(value);
    return count >= targetCount ? count : undefined;
  }, timeoutMs)) || -1;
