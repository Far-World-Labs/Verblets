import { createLogger, createRingBufferStream } from '../../lib/logger/index.js';
import { getClient } from '../../services/redis/index.js';
import RedisRingBuffer from '../../lib/ring-buffer-redis/index.js';
import { createLogHelpers } from './events.js';
import { installVitestHooks } from './vitest-hooks.js';
import { writeInitialSeparator } from './output-utils.js';
import { getConfigOrExit } from './common/config.js';
import { createNullLogger, createNoOpHelpers } from './common/null-loggers.js';

const config = getConfigOrExit();

let logSuiteStart, logTestStart, logTestComplete, logExpect, logAIExpect, logSuiteEnd, logger;

if (!config) {
  const noOpHelpers = createNoOpHelpers();
  logSuiteStart = noOpHelpers.logSuiteStart;
  logTestStart = noOpHelpers.logTestStart;
  logTestComplete = noOpHelpers.logTestComplete;
  logExpect = noOpHelpers.logExpect;
  logAIExpect = noOpHelpers.logAIExpect;
  logSuiteEnd = noOpHelpers.logSuiteEnd;
  logger = createNullLogger();
  globalThis.testLogger = logger;
} else {
  // Initialize synchronously - setup will be async when first used
  let setupPromise = null;

  const getLogger = () => {
    if (!setupPromise) {
      setupPromise = setupGlobalLogger();
    }
    return setupPromise;
  };

  const helpers = createLogHelpers({
    info: async (data) => {
      const actualLogger = await getLogger();
      return actualLogger.info(data);
    },
  });

  logSuiteStart = helpers.logSuiteStart;
  logTestStart = helpers.logTestStart;
  logTestComplete = helpers.logTestComplete;
  logExpect = helpers.logExpect;
  logAIExpect = helpers.logAIExpect;
  logSuiteEnd = helpers.logSuiteEnd;

  writeInitialSeparator();
  globalThis.testLogger = {
    info: async (data, options) => (await getLogger()).info(data, options),
  };
  installVitestHooks(globalThis.testLogger);
}

async function setupGlobalLogger() {
  const redis = await getClient();

  // Get the global ring buffer key from Redis
  const ringBufferKey = await redis.get('test:logs-key');

  if (!ringBufferKey) {
    throw new Error('Global processor not active. Ring buffer key not found.');
  }

  // Connect to the global ring buffer
  const ringBuffer = new RedisRingBuffer({
    key: ringBufferKey,
    redisClient: redis,
    maxSize: 1000,
  });

  logger = createLogger({
    streams: [createRingBufferStream(ringBuffer)],
    includeFileContext: true,
  });

  return logger;
}

export {
  logSuiteStart,
  logTestStart,
  logTestComplete,
  logExpect,
  logAIExpect,
  logSuiteEnd,
  logger,
};
