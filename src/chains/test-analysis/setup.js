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
let sharedRedisClient;
let sharedRingBuffer;

// Initialize logger asynchronously to avoid blocking
async function initializeLogger() {
  if (!config.aiMode) return;

  if (!sharedRedisClient) {
    sharedRedisClient = await getClient();
  }
  const redis = sharedRedisClient;

  const ringBufferKey = await redis.get(`${CONSTANTS.REDIS_KEY_PREFIX}logs-key`);

  if (!ringBufferKey) {
    // Reporter hasn't initialized yet, use no-op logger
    globalThis.logger = createLogger({
      streams: [noopStream],
      includeFileContext: false,
    });
    return;
  }

  // Initialize ring buffer if needed
  if (!sharedRingBuffer) {
    sharedRingBuffer = new RedisRingBuffer({
      key: ringBufferKey,
      redisClient: redis,
      maxSize: config.ringBufferSize,
    });
    await sharedRingBuffer.initialize();
  }

  // Create and attach logger
  globalThis.logger = createLogger({
    streams: [createRingBufferStream(sharedRingBuffer)],
    includeFileContext: true,
  });

  // Clean up ring buffer and Redis connection after all tests complete
  afterAll(async () => {
    if (!isWatchMode()) {
      if (sharedRingBuffer) {
        // Stop internal pollers that keep the event loop alive
        sharedRingBuffer.readerPoller.stop();
        sharedRingBuffer.writerPoller.stop();
        sharedRingBuffer = undefined;
      }
      if (redis) {
        await redis.disconnect();
      }
    }
  });
}

// Set up a default no-op logger immediately
globalThis.logger = createLogger({
  streams: [noopStream],
  includeFileContext: false,
});

// Then initialize the real logger if aiMode is enabled
// Top-level await ensures logger is ready before tests start running.
// Without this, early test events go to the no-op logger and never reach
// the ring buffer, causing processors to see no events and produce no output.
if (config.aiMode) {
  await initializeLogger().catch((error) => {
    console.error('[Setup] Failed to initialize logger:', error);
  });
}

// Track which suites have started in this process
const suitesStarted = new Set();

// Export helper functions that use the logger
export const logSuiteStart = async (suite, context = {}) => {
  if (suitesStarted.has(suite)) return;
  suitesStarted.add(suite);

  await globalThis.logger.info({
    event: 'suite-start',
    suite,
    timestamp: new Date().toISOString(),
    ...context,
  });
};

export const logSuiteEnd = async (suite, context = {}) => {
  await globalThis.logger.info({
    event: 'suite-end',
    suite,
    timestamp: new Date().toISOString(),
    ...context,
  });
};
