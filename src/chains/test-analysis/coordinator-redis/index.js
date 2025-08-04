/**
 * Redis wait utilities for coordination
 */

// Wait for key to exist
export async function waitForKey(redis, key, timeoutMs = 30000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const value = await redis.get(key);
    if (value !== null && value !== undefined) return JSON.parse(value);

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return undefined;
}

// Wait for key to have specific value
export async function waitForValue(redis, key, expectedValue, timeoutMs = 30000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const value = await redis.get(key);
    if (value === null || value === undefined) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      continue;
    }

    const parsed = JSON.parse(value);
    if (parsed === expectedValue) return true;

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return false;
}

// Wait for condition function to return truthy
export async function waitForCondition(conditionFn, timeoutMs = 30000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const result = await conditionFn();
    if (result) return result;

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return false;
}

// Wait for all keys to exist
export async function waitForAllKeys(redis, keys, timeoutMs = 30000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const values = {};
    let allExist = true;

    for (const key of keys) {
      const value = await redis.get(key);
      if (value === null || value === undefined) {
        allExist = false;
        break;
      }
      values[key] = JSON.parse(value);
    }

    if (allExist) return values;

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return null;
}

// Wait for hash to have all fields
export async function waitForHashFields(redis, hashKey, fields, timeoutMs = 30000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const hash = await redis.hgetall(hashKey);
    if (!hash) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      continue;
    }

    const hasAllFields = fields.every((field) => hash[field] !== undefined);
    if (!hasAllFields) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      continue;
    }

    const result = {};
    for (const field of fields) {
      result[field] = JSON.parse(hash[field]);
    }
    return result;
  }

  return null;
}

// Wait for counter to reach value
export async function waitForCount(redis, key, targetCount, timeoutMs = 30000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const value = await redis.get(key);
    if (value === null || value === undefined) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      continue;
    }

    const count = parseInt(value);
    if (count >= targetCount) return count;

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return -1;
}
