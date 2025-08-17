/**
 * Base Processor for Ring Buffer Event Processing
 *
 * This base class provides the foundation for all ring buffer processors.
 * Processors can be toggled via environment flags and operate in isolation
 * while performing powerful async orchestrations.
 *
 * Key Features:
 * - Environment flag toggling
 * - Isolated operation with shared ring buffer
 * - Async event processing with batching
 * - Lifecycle hooks for suite/run contexts
 * - Multi-run tracking capability
 * - Automatic state reset on reruns
 */

import { truthyValues } from '../../../constants/common.js';

// Pure helper functions
const isEnabled = (envFlag, alwaysEnabled = false) => {
  if (alwaysEnabled) return true;
  if (!envFlag) return false;
  const value = process.env[envFlag];
  if (envFlag === 'VERBLETS_DEBUG') {
    return value && value.length > 0;
  }
  return value && truthyValues.includes(value);
};

const toPascalCase = (str) => {
  if (!str) return '';
  return str
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
};

const log = (name, ...args) => console.log(`[${name}]`, ...args);
const error = (name, ...args) => console.error(`[${name}]`, ...args);

const findLastIndex = (arr, predicate) => {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (predicate(arr[i], i)) return i;
  }
  return -1;
};

// Domain logic
const isRunStart = (event) => event.event === 'run-start';
const isRunEnd = (event) => event.event === 'run-end';
const isSuiteStart = (event) => event.event === 'suite-start';
const isSuiteEnd = (event) => event.event === 'suite-end';

const isResetError = (err) =>
  err.message === 'Suite restarted' ||
  err.message === 'Run restarted' ||
  err.message === 'State reset';

const makeCancellable = (promise) => {
  let cancelled = false;
  const wrapped = promise.then(
    result => cancelled ? undefined : result,
    error => cancelled ? undefined : Promise.reject(error)
  );
  wrapped.cancel = () => { cancelled = true; };
  return wrapped;
};

const rejectBlocker = (blocker, message) => {
  if (!blocker) return;
  blocker.reject(new Error(message));
};

const rejectAllBlockers = (blockers, message) => {
  blockers.forEach((blocker) => rejectBlocker(blocker, message));
};

export class BaseProcessor {
  constructor({
    name = 'BaseProcessor',
    envFlag,
    ringBuffer,
    batchSize = 100,
    pollInterval = 100,
    lookbackSize = 1000,
    blockOnSuiteEnd = false,
    blockOnRunEnd = false,
    processAsync = true,
    alwaysEnabled = false,
  } = {}) {
    this.name = name;
    this.enabled = isEnabled(envFlag, alwaysEnabled);
    this.ringBuffer = ringBuffer;
    this.reader = null;
    this.processing = false;
    this.pollTimer = null;

    this.config = {
      batchSize,
      pollInterval,
      lookbackSize,
    };

    this.lifecycle = {
      blockOnSuiteEnd,
      blockOnRunEnd,
      processAsync,
    };

    // State that resets frequently
    this.resetState();
  }

  resetState() {
    if (this.pendingWork) {
      this.pendingWork.forEach(work => work.cancel?.());
    }

    if (this.blockers) {
      rejectAllBlockers(this.blockers.suites, 'State reset');
      rejectBlocker(this.blockers.run, 'State reset');
    }

    this.pendingWork = new Set();
    this.blockers = { suites: new Map(), run: null };
    this.activeSuites = new Set();
    this.activeRun = false;
  }

  async initialize() {
    if (!this.enabled || !this.ringBuffer) return false;

    this.reader = await this.ringBuffer.createReader(this.name);

    if (this.lifecycle.processAsync) {
      this.startProcessing();
    }

    await this.onInitialize();
    return true;
  }

  async shutdown() {
    this.stopProcessing();
    this.resetState();
    await this.onShutdown();
  }

  // Processing lifecycle

  startProcessing() {
    if (this.processing) return;

    this.processing = true;
    this.pollTimer = setInterval(() => this.poll(), this.config.pollInterval);
    this.pollTimer.unref();
  }

  stopProcessing() {
    if (!this.processing) return;

    this.processing = false;
    clearInterval(this.pollTimer);
    this.pollTimer = null;
  }

  async poll() {
    try {
      const events = await this.reader.consume(this.config.batchSize);
      if (events.length > 0) {
        await this.processBatch(events);
      }
    } catch (err) {
      error(this.name, 'Poll error:', err);
    }
  }

  async processBatch(events) {
    for (const event of events) {
      await this.processEvent(event);
    }
  }

  async processEvent(event) {
    this.handleStateResets(event);
    await this.routeToHandler(event);
    this.resolveBlockers(event);
  }

  handleStateResets(event) {
    if (isRunStart(event)) {
      this.resetRunState();
      return;
    }

    if (isSuiteStart(event)) {
      this.resetSuiteState(event.suite);
      return;
    }

    if (isSuiteEnd(event)) {
      this.activeSuites.delete(event.suite);
      return;
    }

    if (isRunEnd(event)) {
      this.activeRun = false;
    }
  }

  resetRunState() {
    this.activeSuites.clear();
    this.activeRun = true;

    rejectAllBlockers(this.blockers.suites, 'Run restarted');
    this.blockers.suites.clear();

    rejectBlocker(this.blockers.run, 'Run restarted');
    this.blockers.run = null;
  }

  resetSuiteState(suiteName) {
    if (!this.activeSuites.has(suiteName)) {
      this.activeSuites.add(suiteName);
      return;
    }

    const blocker = this.blockers.suites.get(suiteName);
    if (blocker) {
      rejectBlocker(blocker, 'Suite restarted');
      this.blockers.suites.delete(suiteName);
    }
  }

  routeToHandler(event) {
    if (!event || !event.event) return;
    const handler = this.getHandler(event.event);
    if (!handler) return;

    const work = handler.call(this, event);
    if (!work?.then) return;

    const cancellable = makeCancellable(work);
    this.pendingWork.add(cancellable);
    cancellable.finally(() => this.pendingWork.delete(cancellable));
  }

  getHandler(eventType) {
    const methodName = `handle${toPascalCase(eventType)}`;
    return this[methodName];
  }

  resolveBlockers(event) {
    if (isSuiteEnd(event) && this.lifecycle.blockOnSuiteEnd) {
      this.resolveSuiteBlocker(event.suite);
      return;
    }

    if (isRunEnd(event) && this.lifecycle.blockOnRunEnd) {
      this.resolveRunBlocker();
    }
  }

  resolveSuiteBlocker(suiteName) {
    const resolver = this.blockers.suites.get(suiteName);
    if (!resolver) return;

    this.waitForPendingWork()
      .then(() => resolver.resolve())
      .catch((err) => resolver.reject(err))
      .finally(() => this.blockers.suites.delete(suiteName));
  }

  resolveRunBlocker() {
    const resolver = this.blockers.run;
    if (!resolver) return;

    this.waitForPendingWork()
      .then(() => resolver.resolve())
      .catch((err) => resolver.reject(err))
      .finally(() => (this.blockers.run = null));
  }

  // Blocking APIs

  createBlocker() {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  }

  async blockForSuite(suiteName) {
    if (!this.lifecycle.blockOnSuiteEnd) return;

    if (!this.blockers.suites.has(suiteName)) {
      this.blockers.suites.set(suiteName, this.createBlocker());
    }

    const { promise } = this.blockers.suites.get(suiteName);
    log(this.name, `Blocking for suite "${suiteName}"...`);

    try {
      await promise;
      log(this.name, `Suite "${suiteName}" complete`);
    } catch (err) {
      if (!isResetError(err)) throw err;
      log(this.name, `Suite "${suiteName}" cancelled: ${err.message}`);
    }
  }

  async blockForRun() {
    if (!this.lifecycle.blockOnRunEnd) return;

    if (!this.blockers.run) {
      this.blockers.run = this.createBlocker();
    }

    const { promise } = this.blockers.run;
    log(this.name, 'Blocking for run...');

    try {
      await promise;
      log(this.name, 'Run complete');
    } catch (err) {
      if (!isResetError(err)) throw err;
      log(this.name, `Run cancelled: ${err.message}`);
    }
  }

  async waitForPendingWork() {
    if (this.pendingWork.size === 0) return;
    await Promise.allSettled(this.pendingWork);
  }

  // Query APIs

  async lookback(count = this.config.lookbackSize) {
    if (!this.reader) return [];

    const latestSequence = await this.reader.buffer.getLatestSequence();
    return this.reader.lookback(count, latestSequence);
  }

  async getCurrentRunEvents() {
    const events = await this.lookback();
    const runStartIdx = findLastIndex(events, isRunStart);
    return runStartIdx === -1 ? events : events.slice(runStartIdx);
  }

  async getSuiteEvents(suiteName) {
    const events = await this.getCurrentRunEvents();
    const startIdx = findLastIndex(events, e => isSuiteStart(e) && e.suite === suiteName);
    
    if (startIdx === -1) return [];
    
    const endIdx = events.findIndex(
      (e, i) => i > startIdx && isSuiteEnd(e) && e.suite === suiteName
    );
    
    const range = endIdx === -1 ? events.slice(startIdx) : events.slice(startIdx, endIdx + 1);
    return range.filter(e => e.suite === suiteName);
  }

  async getTestEvents(suiteName, testIndex) {
    const events = await this.getSuiteEvents(suiteName);
    return events.filter((e) => e.testIndex === testIndex);
  }

  // Lifecycle hooks for subclasses

  async onInitialize() {
    // Override in subclass
  }

  async onShutdown() {
    // Override in subclass
  }
}
