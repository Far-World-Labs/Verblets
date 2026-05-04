import { beforeEach, afterEach, vi, expect } from 'vitest';
import { createLLMLogger, createConsoleWriter, createFileWriter } from './index.js';
import { resetLogger } from '../../lib/logger-service/index.js';
import { runTable } from '../../lib/examples-runner/index.js';

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

runTable({
  describe: 'LLM Logger - Logger Creation',
  examples: [
    {
      name: 'creates logger with default configuration',
      inputs: {},
      want: { hasAllMethods: true },
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
      want: {
        customConfig: { ringBufferSize: 500, flushInterval: 50, laneCount: 1, laneId: 'test' },
      },
    },
  ],
  process: ({ inputs }) => createLLMLogger(inputs.config),
  expects: ({ result, want }) => {
    if (want.hasAllMethods) {
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
    }
    if (want.customConfig) {
      const config = result.getConfig();
      expect(config.ringBufferSize).toBe(want.customConfig.ringBufferSize);
      expect(config.flushInterval).toBe(want.customConfig.flushInterval);
      expect(config.lanes).toHaveLength(want.customConfig.laneCount);
      expect(config.lanes[0].laneId).toBe(want.customConfig.laneId);
    }
  },
});

runTable({
  describe: 'LLM Logger - Global Logger Service Integration',
  examples: [{ name: 'works as global logger', inputs: {}, want: { globalCalls: true } }],
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
  expects: ({ want }) => {
    if (want.globalCalls) {
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[GLOBAL] {"data":"test log"')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[GLOBAL] {"data":"test info"')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[GLOBAL] {"data":"test error"')
      );
    }
  },
});

runTable({
  describe: 'LLM Logger - Ring Buffer Operations',
  examples: [
    {
      name: 'stores logs in ring buffer',
      inputs: { ringBufferSize: 10, entries: ['test 1', 'test 2', 'test 3'] },
      want: { length: 3, raws: ['test 1', 'test 2', 'test 3'] },
    },
    {
      name: 'handles ring buffer overflow',
      inputs: { ringBufferSize: 2, entries: ['test 1', 'test 2', 'test 3'] },
      want: { length: 2, raws: ['test 2', 'test 3'] },
    },
  ],
  process: ({ inputs }) => {
    const logger = createLLMLogger({ ringBufferSize: inputs.ringBufferSize, lanes: [] });
    for (const entry of inputs.entries) logger.log(entry);
    return logger;
  },
  expects: ({ result, want }) => {
    const all = result.ringBuffer.all();
    if ('length' in want) expect(all).toHaveLength(want.length);
    if (want.raws) expect(all.map((l) => l.raw)).toEqual(want.raws);
  },
});

runTable({
  describe: 'LLM Logger - Lane Processing',
  examples: [
    {
      name: 'processes logs through multiple lanes (filtered)',
      inputs: {},
      want: { filteredLanes: true },
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
  expects: ({ result, want }) => {
    if (want.filteredLanes) {
      expect(result.errorWriter).toHaveBeenCalledWith([
        expect.objectContaining({ level: 'error', data: 'error message' }),
      ]);
      expect(result.infoWriter).toHaveBeenCalledWith([
        expect.objectContaining({ level: 'info', data: 'info message' }),
      ]);
    }
  },
});

runTable({
  describe: 'LLM Logger - Lane without filters',
  examples: [
    {
      name: 'handles lanes without filters (receives all logs)',
      inputs: {},
      want: { allWriterCalledTwice: true },
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
  expects: ({ result, want }) => {
    if (want.allWriterCalledTwice) {
      expect(result.allWriter).toHaveBeenCalledTimes(2);
      expect(result.allWriter).toHaveBeenCalledWith([
        expect.objectContaining({ level: 'log', data: 'string log' }),
      ]);
      expect(result.allWriter).toHaveBeenCalledWith([
        expect.objectContaining({ level: 'info', type: 'object log' }),
      ]);
    }
  },
});

runTable({
  describe: 'LLM Logger - File Context Tracking',
  examples: [
    {
      name: 'captures file context for log entries',
      inputs: {},
      want: { fileContext: true },
    },
  ],
  process: () => {
    const logger = createLLMLogger();
    logger.log('test with context');
    return logger;
  },
  expects: ({ result, want }) => {
    if (want.fileContext) {
      const logs = result.ringBuffer.all();
      expect(logs).toHaveLength(1);
      const fileContext = logs[0].meta.get('fileContext');
      expect(fileContext).toHaveProperty('filePath');
      expect(typeof fileContext.line).toBe('number');
    }
  },
});

runTable({
  describe: 'LLM Logger - Utility Methods',
  examples: [
    { name: 'flushes all lanes manually', inputs: {}, want: { flushed: true } },
    {
      name: 'clears ring buffer and lane buffers',
      inputs: { clearMode: true },
      want: { cleared: true },
    },
  ],
  process: ({ inputs }) => {
    if (inputs.clearMode) {
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
  expects: ({ result, want }) => {
    if (want.flushed) {
      expect(result.writer).toHaveBeenCalledWith([
        expect.objectContaining({ level: 'log', data: 'test message' }),
      ]);
    }
    if (want.cleared) {
      expect(result.beforeSize).toBe(2);
      expect(result.afterSize).toBe(0);
    }
  },
});

runTable({
  describe: 'LLM Logger - Writer Functions',
  examples: [
    { name: 'console writer outputs with prefix', inputs: {}, want: { console: true } },
    { name: 'file writer shows placeholder output', inputs: {}, want: { file: true } },
  ],
  process: () => undefined,
  expects: ({ want }) => {
    if (want.console) {
      const writer = createConsoleWriter('[TEST] ');
      writer(['message 1', 'message 2']);
      expect(mockConsoleLog).toHaveBeenCalledWith('[TEST] message 1');
      expect(mockConsoleLog).toHaveBeenCalledWith('[TEST] message 2');
    }
    if (want.file) {
      const writer = createFileWriter('/tmp/test.log');
      writer(['line 1', 'line 2', 'line 3']);
      expect(mockConsoleLog).toHaveBeenCalledWith('[FILE:/tmp/test.log] 3 lines');
    }
  },
});

runTable({
  describe: 'LLM Logger - Complex Scenarios',
  examples: [
    { name: 'handles mixed data types', inputs: { mode: 'mixed' }, want: { mixed: true } },
    { name: 'handles high-volume logging', inputs: { mode: 'volume' }, want: { volume: 50 } },
  ],
  process: async ({ inputs }) => {
    const writer = vi.fn();
    if (inputs.mode === 'mixed') {
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
  expects: ({ result, want }) => {
    if (want.mixed) {
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
    }
    if (want.volume) {
      expect(result.writer).toHaveBeenCalledTimes(want.volume);
      expect(result.logger.ringBuffer.size()).toBe(want.volume);
    }
  },
});

runTable({
  describe: 'LLM Logger - Configuration validation',
  examples: [
    {
      name: 'throws when lane is missing writer function',
      inputs: { config: { lanes: [{ laneId: 'main' }] } },
      want: { throws: /writer function/ },
    },
    {
      name: 'throws when lane writer is not a function',
      inputs: { config: { lanes: [{ laneId: 'main', writer: 'not-fn' }] } },
      want: { throws: /writer function/ },
    },
    {
      name: 'throws when processor is missing processorId',
      inputs: { config: { processors: [{ process: vi.fn() }] } },
      want: { throws: /processorId/ },
    },
    {
      name: 'throws when processor processorId is empty string',
      inputs: { config: { processors: [{ processorId: '', process: vi.fn() }] } },
      want: { throws: /processorId/ },
    },
    {
      name: 'throws when processor.process is not a function',
      inputs: { config: { processors: [{ processorId: 'p1', process: 'not-fn' }] } },
      want: { throws: /process function/ },
    },
    {
      name: 'throws when processor.process is missing',
      inputs: { config: { processors: [{ processorId: 'p1' }] } },
      want: { throws: /process function/ },
    },
  ],
  process: ({ inputs }) => createLLMLogger(inputs.config),
  expects: ({ error, want }) => {
    if (want.throws) {
      expect(error?.message).toMatch(want.throws);
    }
  },
});
