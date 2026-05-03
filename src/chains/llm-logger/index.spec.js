import { beforeEach, afterEach, vi, expect } from 'vitest';
import { createLLMLogger, createConsoleWriter, createFileWriter } from './index.js';
import { resetLogger } from '../../lib/logger-service/index.js';
import { runTable, throws } from '../../lib/examples-runner/index.js';

vi.useFakeTimers();

const mockConsoleLog = vi.fn();
const mockConsoleError = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  console.log = mockConsoleLog;
  console.error = mockConsoleError;
  resetLogger();
});

afterEach(() => {
  vi.restoreAllMocks();
  resetLogger();
});

// ─── Logger Creation ──────────────────────────────────────────────────────

runTable({
  describe: 'LLM Logger - Logger Creation',
  examples: [
    {
      name: 'creates logger with default configuration',
      inputs: {},
      check: ({ result }) => {
        for (const key of [
          'log',
          'info',
          'warn',
          'error',
          'debug',
          'trace',
          'fatal',
          'ringBuffer',
          'flush',
          'clear',
        ]) {
          expect(result).toHaveProperty(key);
        }
      },
    },
    {
      name: 'creates logger with custom configuration',
      inputs: {
        config: {
          ringBufferSize: 500,
          flushInterval: 50,
          lanes: [{ laneId: 'test', writer: createConsoleWriter('[TEST] ') }],
        },
      },
      check: ({ result }) => {
        const config = result.getConfig();
        expect(config.ringBufferSize).toBe(500);
        expect(config.flushInterval).toBe(50);
        expect(config.lanes).toHaveLength(1);
        expect(config.lanes[0].laneId).toBe('test');
      },
    },
  ],
  process: ({ config }) => createLLMLogger(config),
});

// ─── Global Logger Service Integration ───────────────────────────────────

runTable({
  describe: 'LLM Logger - Global Logger Service Integration',
  examples: [
    {
      name: 'works as global logger',
      inputs: {},
      check: () => {
        expect(mockConsoleLog).toHaveBeenCalledWith(
          expect.stringContaining('[GLOBAL] {"data":"test log"')
        );
        expect(mockConsoleLog).toHaveBeenCalledWith(
          expect.stringContaining('[GLOBAL] {"data":"test info"')
        );
        expect(mockConsoleLog).toHaveBeenCalledWith(
          expect.stringContaining('[GLOBAL] {"data":"test error"')
        );
      },
    },
  ],
  process: async () => {
    const logger = createLLMLogger({
      immediateFlush: true,
      lanes: [{ laneId: 'global', writer: createConsoleWriter('[GLOBAL] ') }],
    });
    logger.log('test log');
    logger.info('test info');
    logger.error('test error');
    const { log, info, error } = await import('../../lib/logger-service/index.js');
    log('test log');
    info('test info');
    error('test error');
    await vi.advanceTimersByTimeAsync(150);
  },
});

// ─── Ring Buffer Operations ──────────────────────────────────────────────

runTable({
  describe: 'LLM Logger - Ring Buffer Operations',
  examples: [
    {
      name: 'stores logs in ring buffer',
      inputs: { ringBufferSize: 10, entries: ['test 1', 'test 2', 'test 3'] },
      check: ({ result }) => {
        const all = result.ringBuffer.all();
        expect(all).toHaveLength(3);
        expect(all.map((l) => l.raw)).toEqual(['test 1', 'test 2', 'test 3']);
      },
    },
    {
      name: 'handles ring buffer overflow',
      inputs: { ringBufferSize: 2, entries: ['test 1', 'test 2', 'test 3'] },
      check: ({ result }) => {
        const all = result.ringBuffer.all();
        expect(all).toHaveLength(2);
        expect(all.map((l) => l.raw)).toEqual(['test 2', 'test 3']);
      },
    },
  ],
  process: ({ ringBufferSize, entries }) => {
    const logger = createLLMLogger({ ringBufferSize, lanes: [] });
    for (const entry of entries) logger.log(entry);
    return logger;
  },
});

// ─── Lane Processing ─────────────────────────────────────────────────────

runTable({
  describe: 'LLM Logger - Lane Processing',
  examples: [
    {
      name: 'processes logs through multiple lanes (filtered)',
      inputs: {},
      check: ({ result }) => {
        expect(result.errorWriter).toHaveBeenCalledWith([
          expect.objectContaining({ level: 'error', data: 'error message' }),
        ]);
        expect(result.infoWriter).toHaveBeenCalledWith([
          expect.objectContaining({ level: 'info', data: 'info message' }),
        ]);
      },
    },
  ],
  process: async () => {
    const errorWriter = vi.fn();
    const infoWriter = vi.fn();
    const logger = createLLMLogger({
      immediateFlush: true,
      lanes: [
        {
          laneId: 'errors',
          writer: errorWriter,
          filters: (log) => log.meta.get('level') === 'error',
        },
        {
          laneId: 'info',
          writer: infoWriter,
          filters: (log) => log.meta.get('level') === 'info',
        },
      ],
    });
    logger.error('error message');
    logger.info('info message');
    logger.debug('debug message');
    await vi.advanceTimersByTimeAsync(150);
    return { errorWriter, infoWriter };
  },
});

runTable({
  describe: 'LLM Logger - Lane without filters',
  examples: [
    {
      name: 'handles lanes without filters (receives all logs)',
      inputs: {},
      check: ({ result }) => {
        expect(result.allWriter).toHaveBeenCalledTimes(2);
        expect(result.allWriter).toHaveBeenCalledWith([
          expect.objectContaining({ level: 'log', data: 'string log' }),
        ]);
        expect(result.allWriter).toHaveBeenCalledWith([
          expect.objectContaining({ level: 'info', type: 'object log' }),
        ]);
      },
    },
  ],
  process: async () => {
    const allWriter = vi.fn();
    const logger = createLLMLogger({
      immediateFlush: true,
      lanes: [{ laneId: 'all', writer: allWriter }],
    });
    logger.log('string log');
    logger.info({ type: 'object log' });
    await vi.advanceTimersByTimeAsync(150);
    return { allWriter };
  },
});

// ─── File Context Tracking ───────────────────────────────────────────────

runTable({
  describe: 'LLM Logger - File Context Tracking',
  examples: [
    {
      name: 'captures file context for log entries',
      inputs: {},
      check: ({ result }) => {
        const logs = result.ringBuffer.all();
        expect(logs).toHaveLength(1);
        const fileContext = logs[0].meta.get('fileContext');
        expect(fileContext).toHaveProperty('filePath');
        expect(typeof fileContext.line).toBe('number');
      },
    },
  ],
  process: () => {
    const logger = createLLMLogger();
    logger.log('test with context');
    return logger;
  },
});

// ─── Utility Methods ─────────────────────────────────────────────────────

runTable({
  describe: 'LLM Logger - Utility Methods',
  examples: [
    {
      name: 'flushes all lanes manually',
      inputs: {},
      check: ({ result }) => {
        expect(result.writer).toHaveBeenCalledWith([
          expect.objectContaining({ level: 'log', data: 'test message' }),
        ]);
      },
    },
    {
      name: 'clears ring buffer and lane buffers',
      inputs: { clearMode: true },
      check: ({ result }) => {
        expect(result.beforeSize).toBe(2);
        expect(result.afterSize).toBe(0);
      },
    },
  ],
  process: ({ clearMode }) => {
    if (clearMode) {
      const logger = createLLMLogger();
      logger.log('test 1');
      logger.log('test 2');
      const beforeSize = logger.ringBuffer.size();
      logger.clear();
      return { beforeSize, afterSize: logger.ringBuffer.size() };
    }
    const writer = vi.fn();
    const logger = createLLMLogger({ lanes: [{ laneId: 'test', writer }] });
    logger.log('test message');
    logger.flush();
    return { writer };
  },
});

// ─── Writer Functions ────────────────────────────────────────────────────

runTable({
  describe: 'LLM Logger - Writer Functions',
  examples: [
    {
      name: 'console writer outputs with prefix',
      inputs: {},
      check: () => {
        const writer = createConsoleWriter('[TEST] ');
        writer(['message 1', 'message 2']);
        expect(mockConsoleLog).toHaveBeenCalledWith('[TEST] message 1');
        expect(mockConsoleLog).toHaveBeenCalledWith('[TEST] message 2');
      },
    },
    {
      name: 'file writer shows placeholder output',
      inputs: {},
      check: () => {
        const writer = createFileWriter('/tmp/test.log');
        writer(['line 1', 'line 2', 'line 3']);
        expect(mockConsoleLog).toHaveBeenCalledWith('[FILE:/tmp/test.log] 3 lines');
      },
    },
  ],
  process: () => undefined,
});

// ─── Complex Scenarios ───────────────────────────────────────────────────

runTable({
  describe: 'LLM Logger - Complex Scenarios',
  examples: [
    {
      name: 'handles mixed data types',
      inputs: { mode: 'mixed' },
      check: ({ result }) => {
        expect(result.writer).toHaveBeenCalledWith([
          expect.objectContaining({ level: 'log', data: 'string' }),
        ]);
        expect(result.writer).toHaveBeenCalledWith([
          expect.objectContaining({ level: 'log', object: 'data' }),
        ]);
        expect(result.writer).toHaveBeenCalledWith([
          expect.objectContaining({ level: 'log', data: 123 }),
        ]);
        expect(result.writer).toHaveBeenCalledWith([
          expect.objectContaining({ level: 'log', data: null }),
        ]);
      },
    },
    {
      name: 'handles high-volume logging',
      inputs: { mode: 'volume' },
      check: ({ result }) => {
        expect(result.writer).toHaveBeenCalledTimes(50);
        expect(result.logger.ringBuffer.size()).toBe(50);
      },
    },
  ],
  process: async ({ mode }) => {
    const writer = vi.fn();
    if (mode === 'mixed') {
      const logger = createLLMLogger({
        immediateFlush: true,
        lanes: [{ laneId: 'mixed', writer }],
      });
      logger.log('string');
      logger.log({ object: 'data' });
      logger.log(123);
      logger.log(null);
      await vi.advanceTimersByTimeAsync(150);
      return { writer, logger };
    }
    const logger = createLLMLogger({
      immediateFlush: true,
      ringBufferSize: 100,
      lanes: [{ laneId: 'volume', writer }],
    });
    for (let i = 0; i < 50; i++) logger.log(`message ${i}`);
    await vi.advanceTimersByTimeAsync(200);
    return { writer, logger };
  },
});

// ─── Configuration Validation ────────────────────────────────────────────

runTable({
  describe: 'LLM Logger - Configuration validation',
  examples: [
    {
      name: 'throws when lane is missing writer function',
      inputs: { config: { lanes: [{ laneId: 'main' }] } },
      check: throws(/writer function/),
    },
    {
      name: 'throws when lane writer is not a function',
      inputs: { config: { lanes: [{ laneId: 'main', writer: 'not-fn' }] } },
      check: throws(/writer function/),
    },
    {
      name: 'throws when processor is missing processorId',
      inputs: { config: { processors: [{ process: vi.fn() }] } },
      check: throws(/processorId/),
    },
    {
      name: 'throws when processor processorId is empty string',
      inputs: { config: { processors: [{ processorId: '', process: vi.fn() }] } },
      check: throws(/processorId/),
    },
    {
      name: 'throws when processor.process is not a function',
      inputs: { config: { processors: [{ processorId: 'p1', process: 'not-fn' }] } },
      check: throws(/process function/),
    },
    {
      name: 'throws when processor.process is missing',
      inputs: { config: { processors: [{ processorId: 'p1' }] } },
      check: throws(/process function/),
    },
  ],
  process: ({ config }) => createLLMLogger(config),
});
