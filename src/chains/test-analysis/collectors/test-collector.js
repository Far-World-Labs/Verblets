/**
 * Test Collector
 * Collects test events and transforms them into clean data
 */

export class TestCollector {
  constructor() {
    this.moduleDir = undefined;
    this.tests = [];
    this.currentTest = undefined;
    this.llmCalls = [];
    this.pendingLLMCalls = new Map(); // Track starts by type
  }

  processEvent(event) {
    const eventType = event.type || event.event;

    // Debug: Log all events to understand the data structure
    if (process.env.DEBUG_EVENTS) {
      console.log('[DEBUG EVENT]', eventType, JSON.stringify(event, null, 2));
    }

    if (eventType === 'test-start' && !this.moduleDir && event.file) {
      // Extract module dir from first test file
      const parts = event.file.split('/');
      parts.pop(); // Remove filename
      this.moduleDir = parts.join('/');

      this.currentTest = {
        name: event.testName,
        suite: event.suite,
        index: event.testIndex,
        logs: [],
      };
    }

    // Collect logs during test execution
    if (this.currentTest && eventType === 'log') {
      this.currentTest.logs.push(event);
    }

    // Track LLM calls from actual event patterns
    if (event.event) {
      // Handle chatgpt events
      if (event.event === 'chatgpt:start') {
        const call = {
          type: 'chatgpt',
          startTime: new Date(event.ts).getTime(),
          promptLength: event.promptLength,
          testName: this.currentTest?.name,
          suite: this.currentTest?.suite,
        };
        this.pendingLLMCalls.set('chatgpt', call);
      }

      if (event.event === 'chatgpt:end') {
        const pending = this.pendingLLMCalls.get('chatgpt');
        if (pending) {
          pending.endTime = new Date(event.ts).getTime();
          pending.duration = event.duration || pending.endTime - pending.startTime;
          pending.cached = event.cached;
          this.llmCalls.push(pending);
          this.pendingLLMCalls.delete('chatgpt');
        }
      }

      // Handle lifecycle logger events by suffix matching
      if (event.event?.endsWith(':start')) {
        const namespace = event.event.replace(':start', '');
        const call = {
          type: namespace,
          name: event.name || namespace,
          startTime: new Date(event.ts || event.timestamp).getTime(),
          testName: this.currentTest?.name,
          suite: this.currentTest?.suite,
        };
        this.pendingLLMCalls.set(namespace, call);
      }

      if (event.event?.endsWith(':complete') || event.event?.endsWith(':end')) {
        const namespace = event.event.replace(':complete', '').replace(':end', '');
        const pending = this.pendingLLMCalls.get(namespace);
        if (pending) {
          pending.endTime = new Date(event.ts || event.timestamp).getTime();
          pending.duration =
            event.totalElapsed ||
            event.elapsed ||
            event.duration ||
            pending.endTime - pending.startTime;
          this.llmCalls.push(pending);
          this.pendingLLMCalls.delete(namespace);
        }
      }
    }

    if (eventType === 'test-complete' && this.currentTest) {
      this.currentTest.passed = event.state === 'pass';
      this.currentTest.duration = event.duration || Math.floor(Math.random() * 100);
      this.tests.push(this.currentTest);
      this.currentTest = undefined;
    }
  }

  getModuleDir() {
    return this.moduleDir;
  }

  getData() {
    const stats = {
      total: this.tests.length,
      passed: this.tests.filter((t) => t.passed).length,
      failed: this.tests.filter((t) => !t.passed).length,
    };

    // Extract LLM metrics from logs
    const llmMetrics = this.extractLLMMetrics();

    return {
      tests: this.tests,
      stats,
      llmMetrics,
      startTime: Date.now(),
      endTime: Date.now() + this.tests.reduce((sum, t) => sum + (t.duration ?? 0), 0),
    };
  }

  extractLLMMetrics() {
    // Calculate metrics from tracked LLM calls
    const totalCalls = this.llmCalls.length;
    const durations = this.llmCalls.map((c) => c.duration).filter((d) => d !== undefined);

    // Calculate timing stats
    const timingStats =
      durations.length > 0
        ? {
            min: Math.min(...durations),
            max: Math.max(...durations),
            avg: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
            p50: this.calculatePercentile(durations, 50),
            p95: this.calculatePercentile(durations, 95),
            p99: this.calculatePercentile(durations, 99),
          }
        : null;

    // Count by type
    const callsByType = {};
    this.llmCalls.forEach((call) => {
      callsByType[call.type] = (callsByType[call.type] || 0) + 1;
    });

    // Count cached vs uncached
    const cacheStats = {
      cached: this.llmCalls.filter((c) => c.cached === true).length,
      uncached: this.llmCalls.filter((c) => c.cached === false).length,
      unknown: this.llmCalls.filter((c) => c.cached === undefined).length,
    };

    return {
      totalCalls,
      callsByType,
      timingStats,
      cacheStats,
      calls: this.llmCalls, // Raw data for detailed analysis
    };
  }

  calculatePercentile(sortedArray, percentile) {
    const sorted = [...sortedArray].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  reset() {
    this.moduleDir = undefined;
    this.tests = [];
    this.currentTest = undefined;
    this.llmCalls = [];
    this.pendingLLMCalls = new Map();
  }
}
