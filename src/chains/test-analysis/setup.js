import { afterAll } from 'vitest';
import { getClient } from '../../services/redis/index.js';
import RedisRingBuffer from '../../lib/ring-buffer-redis/index.js';
import { createLogger, createRingBufferStream, noopStream } from '../../lib/logger/index.js';
import { getConfig, CONSTANTS } from './config.js';

function isWatchMode() {
  return process.env.VITEST_MODE === 'WATCH' || process.argv.includes('--watch');
}

const config = getConfig();

// Only initialize Redis and ring buffer if AI mode is enabled
if (config.aiMode) {
  const redis = await getClient();

  const ringBufferKey = await redis.get(`${CONSTANTS.REDIS_KEY_PREFIX}logs-key`);

  if (ringBufferKey) {
    const ringBuffer = new RedisRingBuffer({
      key: ringBufferKey,
      redisClient: redis,
      maxSize: config.ringBufferSize,
    });

    // Ensure ring buffer is initialized before tests start
    await ringBuffer.initialize();

    const logger = createLogger({
      streams: [createRingBufferStream(ringBuffer)],
      includeFileContext: true,
    });

    globalThis.logger = logger;
    //
    // Logger created and attached to globalThis for test access
    //

    // Clean up Redis connection after all tests complete
    afterAll(async () => {
      //
      // Don't disconnect Redis in watch mode - we need it for reruns
      //
      if (!isWatchMode()) {
        await redis.disconnect();
      }
    });
  } else {
    // Reporter hasn't initialized yet, use no-op logger
    globalThis.logger = createLogger({
      streams: [noopStream],
      includeFileContext: false,
    });
  }
} else {
  // Create a no-op logger when AI mode is not enabled
  globalThis.logger = createLogger({
    streams: [noopStream],
    includeFileContext: false,
  });
}

// Export helper functions that use the logger
export const logSuiteEnd = async (suite, context = {}) => {
  await globalThis.logger.info({
    event: 'suite-end',
    suite,
    timestamp: new Date().toISOString(),
    ...context,
  });
};
