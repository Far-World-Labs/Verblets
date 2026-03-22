#!/usr/bin/env node

import { getClient as getRedis } from '../src/services/redis/index.js';

async function clearRedisKeys() {
  let redis = undefined;

  try {
    console.log('🔄 Connecting to Redis...');
    redis = await getRedis();

    // Check if this is the NullRedisClient (in-memory fallback)
    if (redis.store !== undefined) {
      // This is the in-memory client
      const keyCount = Object.keys(redis.store).length;
      if (keyCount === 0) {
        console.log('✅ In-memory cache is already empty - no keys to clear');
        return;
      }

      console.log(`🗑️  Found ${keyCount} keys in in-memory cache to clear`);
      redis.store = {};
      console.log(`✅ Successfully cleared ${keyCount} in-memory cache keys`);
      console.log('🧹 In-memory cache has been cleared - tests can now run with fresh responses');
      return;
    }

    // This is the SafeRedisClient wrapper - access underlying Redis client
    const underlyingClient = redis.redisClient;
    if (!underlyingClient) {
      console.log('⚠️  No underlying Redis client found - using fallback method');
      return;
    }

    // Get count of keys before clearing
    const keys = await underlyingClient.keys('*');
    const keyCount = keys.length;

    if (keyCount === 0) {
      console.log('✅ Redis is already empty - no keys to clear');
      return;
    }

    console.log(`🗑️  Found ${keyCount} keys to clear`);

    // Use FLUSHDB to clear all keys in the current database
    // This is more efficient and reliable than deleting individual keys
    await underlyingClient.flushDb();

    console.log(`✅ Successfully cleared all ${keyCount} Redis keys`);
    console.log('🧹 Redis cache has been cleared - tests can now run with fresh responses');

  } catch (error) {
    if (error.message.includes('ECONNREFUSED') || error.message.includes('connection')) {
      console.log('⚠️  Redis is not running or not accessible - nothing to clear');
      console.log('   This is normal if you\'re using the in-memory cache fallback');
    } else {
      console.error('❌ Error clearing Redis keys:', error.message);
      process.exit(1);
    }
  } finally {
    if (redis && typeof redis.disconnect === 'function') {
      try {
        await redis.disconnect();
        console.log('🔌 Disconnected from Redis');
      } catch (disconnectError) {
        // Ignore disconnect errors
      }
    }
  }
}

clearRedisKeys();
