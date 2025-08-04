import { getClient } from '../../services/redis/index.js';
import RedisRingBuffer from '../../lib/ring-buffer-redis/index.js';
import { createLogger, createRingBufferStream } from '../../lib/logger/index.js';
import { createTestAnalyzer } from './test-analyzer.js';
import { getConfig } from './config.js';
import { formatTestSummary, createSeparator } from './output-utils.js';
import { aggregateFromLogs } from './aggregator.js';
import analyzeTestError from '../test-analyzer/index.js';

async function cleanupTestRedisKeys(redis) {
  // Clean up locally created test keys
  const testKeys = [
    'test:logs-key',
    'test:processor-active',
    'test:failed-count',
    'test:run-complete',
    'test:suite-status',
    'test:error-patterns',
  ];

  await redis.del(testKeys);
}

function extractErrorPattern(errorText) {
  if (!errorText) return 'unknown';

  return String(errorText)
    .replace(/\d+/g, 'N')
    .replace(/0x[0-9a-f]+/gi, '0xHEX')
    .replace(/["'].*?["']/g, '"..."')
    .replace(/\/.*?\//g, '/.../')
    .split('\n')[0]
    .substring(0, 100);
}

function hasTestFailures(files, errors) {
  const hasErrors = errors && errors.length > 0;
  const hasFailures =
    files &&
    files.some(
      (file) =>
        file.result?.state === 'fail' ||
        (file.tasks && file.tasks.some((task) => task.result?.state === 'fail'))
    );
  return hasErrors || hasFailures;
}

function isWatchMode() {
  return process.env.VITEST_MODE === 'WATCH' || process.argv.includes('--watch');
}

export default class SilentReporter {
  constructor() {
    this.processor = null;
    this.eventLoopTimer = null;
    this.eventLoopRunning = true;
    this.pendingAnalyses = [];
  }

  // Lifecycle methods in execution order

  async onInit() {
    const config = getConfig();

    if (!config?.enabled || !config?.modes?.debugSuiteFirst) return;

    // Clean up any leftover test data from previous runs
    const redis = await getClient();
    await cleanupTestRedisKeys(redis);

    this.processor = await this.createProcessor(config);
    this.startEventLoop();
  }

  onPathsCollected() {}
  onCollected() {}
  onWatcherStart() {}
  onTaskUpdate() {}
  onTestRemoved() {}

  onUserConsoleLog(log) {
    const stream = log.type === 'stdout' ? process.stdout : process.stderr;
    stream.write(log.content);
  }

  onServerRestart() {}
  onProcessTimeout() {}

  async onWatcherRerun() {
    await this.waitForPendingAnalyses('Watcher Rerun');
    this.pendingAnalyses = [];
  }

  async onFinished(files, errors) {
    const config = getConfig();

    if (config?.enabled && config?.modes?.debugSuiteFirst && this.processor) {
      await this.emitRunEnd();
      await this.processRemainingEvents();
      this.stopEventLoop();
      await this.shutdown();
    }

    if (!isWatchMode()) {
      await Promise.all(this.pendingAnalyses);
      const exitCode = hasTestFailures(files, errors) ? 1 : 0;
      process.exit(exitCode);
    }

    this.pendingAnalyses = [];
  }

  // Event processing flow

  async startEventLoop() {
    if (!this.processor || !this.eventLoopRunning) return;

    const logs = await this.processor.reader.consume(50);
    if (logs.length > 0) {
      await this.handleEvents(logs);
    }

    if (this.eventLoopRunning) {
      this.eventLoopTimer = setTimeout(() => this.startEventLoop(), 100);
    }
  }

  async handleEvents(logs) {
    for (const log of logs) {
      await this.handleEvent(log);
    }
  }

  async handleEvent(log) {
    const handlers = {
      'test-suite-start': () => this.processor.analyzer.onSuiteStart(log),
      'test-start': () => this.processor.analyzer.onTestStart(log),
      'test-complete': () => this.handleTestComplete(log),
      expect: () => this.handleExpectation(log),
      aiExpect: () => this.handleExpectation(log),
      'suite-end': () => this.handleSuiteEnd(log),
      'run-end': () => this.handleRunEnd(log),
    };

    const handler = handlers[log.event];
    if (handler) await handler();
  }

  async handleTestComplete(log) {
    this.processor.analyzer.onTestComplete(log);
    if (log.state === 'fail') {
      await this.processor.redis.incrBy('test:failed-count', 1);
    }
  }

  async handleExpectation(log) {
    this.processor.analyzer.onExpect(log);
    if (!log.passed && log.actual) {
      await this.updateErrorPatterns(log);
    }
  }

  async handleSuiteEnd(log) {
    await this.processor.redis.hSet('test:suite-status', log.suite, 'complete');
    this.pendingAnalyses.push(this.runSuiteAnalysis(log));
  }

  async handleRunEnd(log) {
    await this.waitForPendingAnalyses('Run End');
    await this.markRunComplete(log);
  }

  // Analysis methods

  async runSuiteAnalysis(log) {
    // Small delay to ensure all logs are written
    await new Promise((resolve) => setTimeout(resolve, 100));

    const reader = await this.processor.ringBuffer.createReader(
      `analysis-${log.suite}-${Date.now()}`
    );
    const logs = await reader.consume(1000);

    const suites = aggregateFromLogs(logs);
    const suiteData = suites.find((s) => s.name === log.suite);

    if (suiteData) {
      // Build output to display all at once
      const output = [];
      output.push(
        formatTestSummary(
          suiteData.name,
          suiteData.passedCount,
          suiteData.testCount,
          suiteData.avgDuration
        )
      );
      output.push(''); // Just a newline

      // Get failed tests from analyzer
      const failedTests = this.processor.analyzer.getFailedTests(log.suite);

      if (failedTests.length > 0) {
        // Analyze the first failed test
        const failedTest = failedTests[0];
        const failureLogs = logs.filter((l) => l.testIndex === failedTest.index);

        // Get file/line from the test itself
        const testFile = failedTest.file;
        const testLine = failedTest.line;

        // Get file/line from the failed expectation if available
        const failureFile = failedTest.failureFile || testFile;
        const failureLine = failedTest.failureLine || testLine;

        // Use the file/line from where the assertion failed, not where the test started
        const analysis = await analyzeTestError({
          testName: failedTest.name,
          testFile: failureFile,
          testLine: failureLine,
          logs: failureLogs,
          failureDetails: failedTest.failureLog,
        });

        if (analysis) {
          output.push(analysis);
        }
      }

      // Output everything together
      console.log(output.join('\n'));
    }
  }

  async updateErrorPatterns(assertionLog) {
    const pattern = extractErrorPattern(assertionLog.actual);
    await this.storeErrorPattern(pattern, assertionLog);
  }

  async storeErrorPattern(pattern, assertionLog) {
    await this.processor.redis.hIncrBy('test:error-patterns', pattern, 1);
    await this.processor.redis.rpush(
      `test:error-examples:${pattern}`,
      JSON.stringify({
        test: assertionLog.testName,
        testIndex: assertionLog.testIndex,
        expected: assertionLog.expected,
        actual: assertionLog.actual,
        timestamp: assertionLog.ts,
      })
    );
  }

  async waitForPendingAnalyses(context) {
    if (this.pendingAnalyses.length > 0) {
      console.log(
        `[${context}] Waiting for ${this.pendingAnalyses.length} analyses to complete...`
      );
      console.log(createSeparator());

      // Show waiting message every 10 seconds
      const interval = setInterval(() => {
        if (this.pendingAnalyses.length > 0) {
          console.log(`[${context}] Still waiting for ${this.pendingAnalyses.length} analyses...`);
          console.log(createSeparator());
        }
      }, 10000);

      try {
        await Promise.all(this.pendingAnalyses);
      } finally {
        clearInterval(interval);
      }
    }
  }

  async markRunComplete() {
    await this.processor.redis.set('test:run-complete', 'true');

    // Previously collected error patterns and suite statuses
    // Now just marking completion without collecting stats

    // Mark run as complete
    // Result was unused - removed to satisfy linter
  }

  // Helper methods

  async createProcessor(config) {
    const redis = await getClient();
    const ringBuffer = new RedisRingBuffer({
      key: `test-logs-${Date.now()}`,
      redisClient: redis,
      maxSize: config.ringBufferSize || 1000,
    });

    await redis.set('test:logs-key', ringBuffer.key);
    await redis.set('test:processor-active', 'true');

    const reader = await ringBuffer.createReader('processor');
    const analyzer = createTestAnalyzer();

    return { redis, ringBuffer, reader, config, analyzer };
  }

  async emitRunEnd() {
    const redis = await getClient();
    const ringBufferKey = await redis.get('test:logs-key');
    if (!ringBufferKey) return;

    const ringBuffer = new RedisRingBuffer({
      key: ringBufferKey,
      redisClient: redis,
      maxSize: 1000,
    });

    const logger = createLogger({
      streams: [createRingBufferStream(ringBuffer)],
    });

    await logger.info({
      event: 'run-end',
      timestamp: new Date().toISOString(),
    });
  }

  async processRemainingEvents() {
    let attempts = 0;
    while (attempts < 10) {
      const logs = await this.processor.reader.consume(50);
      if (logs.length > 0) {
        await this.handleEvents(logs);
      }

      const runComplete = await this.processor.redis.get('test:run-complete');
      if (runComplete) break;

      attempts++;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  stopEventLoop() {
    this.eventLoopRunning = false;
    if (this.eventLoopTimer) {
      clearTimeout(this.eventLoopTimer);
    }
  }

  async shutdown() {
    if (!this.processor) return;

    this.stopEventLoop();
    await this.cleanupRedis();
    await this.processor.ringBuffer.close();
    this.processor = null;
  }

  async cleanupRedis() {
    await cleanupTestRedisKeys(this.processor.redis);
  }
}
