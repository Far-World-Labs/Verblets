import { getClient } from '../../services/redis/index.js';
import RedisRingBuffer from '../../lib/ring-buffer-redis/index.js';
import { createLogger, createRingBufferStream } from '../../lib/logger/index.js';
import { getConfig, CONSTANTS } from './config.js';

async function cleanupTestRedisKeys(redis) {
  const prefix = CONSTANTS.REDIS_KEY_PREFIX;
  const testKeys = [
    `${prefix}logs-key`,
    `${prefix}processor-active`,
    `${prefix}failed-count`,
    `${prefix}run-complete`,
    `${prefix}suite-status`,
    `${prefix}error-patterns`,
  ];
  await redis.del(testKeys);
}

export default async function globalSetup() {
  const config = getConfig();
  if (!config?.aiMode) return;

  // Set up Redis and ring buffer (this is the FIRST Redis connection)
  const redis = await getClient();
  await cleanupTestRedisKeys(redis);

  const ringBuffer = new RedisRingBuffer({
    key: `test-logs-${Date.now()}`,
    redisClient: redis,
    maxSize: config.ringBufferSize,
  });

  // Store key for reporter to find
  await redis.set(`${CONSTANTS.REDIS_KEY_PREFIX}logs-key`, ringBuffer.key);
  await redis.set(`${CONSTANTS.REDIS_KEY_PREFIX}processor-active`, 'true');

  // Set up global logger
  const logger = createLogger({
    streams: [createRingBufferStream(ringBuffer)],
    includeFileContext: true,
  });

  globalThis.logger = logger;
  globalThis.ringBufferKey = ringBuffer.key;

  // Return a teardown function - but don't disconnect in watch mode
  return async () => {
    const isWatchMode = process.env.VITEST_MODE === 'WATCH' || process.argv.includes('--watch');
    await cleanupTestRedisKeys(redis);
    if (!isWatchMode) {
      await redis.disconnect();
    }
  };
}
