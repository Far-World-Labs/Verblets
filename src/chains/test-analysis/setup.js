import { afterAll } from 'vitest';
import { getClient } from '../../services/redis/index.js';
import RedisRingBuffer from '../../lib/ring-buffer-redis/index.js';
import { createLogger, createRingBufferStream, noopStream } from '../../lib/logger/index.js';
import { getConfig, CONSTANTS } from './config.js';

function isWatchMode() {
  return process.env.VITEST_MODE === 'WATCH' || process.argv.includes('--watch');
}

const config = getConfig();

// Singleton Redis client shared across all test files
let sharedRedisClient = null;
let sharedRingBuffer = null;

// Initialize logger asynchronously to avoid blocking
async function initializeLogger() {
  // Only initialize Redis and ring buffer if AI mode is enabled
  if (!config.aiMode) {
    return;
  }

  // Reuse existing Redis client if available
  if (!sharedRedisClient) {
    sharedRedisClient = await getClient();
  }
  const redis = sharedRedisClient;

  const ringBufferKey = await redis.get(`${CONSTANTS.REDIS_KEY_PREFIX}logs-key`);

  if (ringBufferKey) {
    // Reuse existing ring buffer if available
    if (!sharedRingBuffer) {
      sharedRingBuffer = new RedisRingBuffer({
        key: ringBufferKey,
        redisClient: redis,
        maxSize: config.ringBufferSize,
      });

      // Ensure ring buffer is initialized before tests start
      await sharedRingBuffer.initialize();
    }
    const ringBuffer = sharedRingBuffer;

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
}

// Set up a default no-op logger immediately
globalThis.logger = createLogger({
  streams: [noopStream],
  includeFileContext: false,
});

// Then initialize the real logger if aiMode is enabled
if (config.aiMode) {
  initializeLogger().catch((error) => {
    console.error('[Setup] Failed to initialize logger:', error);
  });
}

// Track which suites have started in this process
const suitesStarted = new Set();

// Export helper functions that use the logger
export const logSuiteStart = async (suite, context = {}) => {
  // Only emit once per suite per process
  if (suitesStarted.has(suite)) return;
  suitesStarted.add(suite);

  // Add try-catch to prevent hanging if logger fails
  try {
    await globalThis.logger.info({
      event: 'suite-start',
      suite,
      timestamp: new Date().toISOString(),
      ...context,
    });
  } catch (error) {
    console.error('[Setup] Error logging suite-start:', error);
  }
};

export const logSuiteEnd = async (suite, context = {}) => {
  await globalThis.logger.info({
    event: 'suite-end',
    suite,
    timestamp: new Date().toISOString(),
    ...context,
  });
};
