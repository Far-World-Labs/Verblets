import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';

vi.useFakeTimers();
import { createLLMLogger, createConsoleWriter, createFileWriter } from './index.js';
import { resetLogger } from '../../lib/logger-service/index.js';

// Mock console methods
const mockConsoleLog = vi.fn();
const mockConsoleError = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  console.log = mockConsoleLog;
  console.error = mockConsoleError;
  resetLogger(); // Start with noop logger
});

afterEach(() => {
  vi.restoreAllMocks();
  resetLogger();
});

describe('LLM Logger - Factory Pattern', () => {
  describe('Logger Creation', () => {
    it('should create logger with default configuration', () => {
      const logger = createLLMLogger();

      expect(logger).toHaveProperty('log');
      expect(logger).toHaveProperty('info');
      expect(logger).toHaveProperty('warn');
      expect(logger).toHaveProperty('error');
      expect(logger).toHaveProperty('debug');
      expect(logger).toHaveProperty('trace');
      expect(logger).toHaveProperty('fatal');
      expect(logger).toHaveProperty('ringBuffer');
      expect(logger).toHaveProperty('flush');
      expect(logger).toHaveProperty('clear');
    });

    it('should create logger with custom configuration', () => {
      const logger = createLLMLogger({
        ringBufferSize: 500,
        flushInterval: 50,
        lanes: [
          {
            laneId: 'test',
            writer: createConsoleWriter('[TEST] '),
          },
        ],
      });

      const config = logger.getConfig();
      expect(config.ringBufferSize).toBe(500);
      expect(config.flushInterval).toBe(50);
      expect(config.lanes).toHaveLength(1);
      expect(config.lanes[0].laneId).toBe('test');
    });
  });

  describe('Global Logger Service Integration', () => {
    it('should work as global logger', async () => {
      const logger = createLLMLogger({
        immediateFlush: true, // Enable immediate flushing for tests
        lanes: [
          {
            laneId: 'global',
            writer: createConsoleWriter('[GLOBAL] '),
          },
        ],
      });

      logger.log('test log');
      logger.info('test info');
      logger.error('test error');

      // Use global logger service methods
      const { log, info, error } = await import('../../lib/logger-service/index.js');

      log('test log');
      info('test info');
      error('test error');

      // Allow flush loops to complete
      await vi.advanceTimersByTimeAsync(150);

      // Check that the console writer was called with JSON formatted logs
      // The console writer receives objects and converts them to JSON strings
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('[GLOBAL] {'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('"data":"test log"'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('"data":"test info"'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('"data":"test error"'));
    });
  });

  describe('Ring Buffer Operations', () => {
    it('should store logs in ring buffer', () => {
      const logger = createLLMLogger({
        ringBufferSize: 10,
        lanes: [],
      });

      logger.log('test 1');
      logger.info('test 2');
      logger.error('test 3');

      const allLogs = logger.ringBuffer.all();
      expect(allLogs).toHaveLength(3);
      expect(allLogs[0].raw).toBe('test 1');
      expect(allLogs[1].raw).toBe('test 2');
      expect(allLogs[2].raw).toBe('test 3');
    });

    it('should handle ring buffer overflow', () => {
      const logger = createLLMLogger({
        ringBufferSize: 2,
        lanes: [],
      });

      logger.log('test 1');
      logger.log('test 2');
      logger.log('test 3'); // Should evict 'test 1'

      const allLogs = logger.ringBuffer.all();
      expect(allLogs).toHaveLength(2);
      expect(allLogs[0].raw).toBe('test 2');
      expect(allLogs[1].raw).toBe('test 3');
    });
  });

  describe('Lane Processing', () => {
    it('should process logs through multiple lanes', async () => {
      const errorWriter = vi.fn();
      const infoWriter = vi.fn();

      const logger = createLLMLogger({
        immediateFlush: true, // Enable immediate flushing for tests
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
      logger.debug('debug message'); // Should not match any lane

      // Allow flush loops to complete
      await vi.advanceTimersByTimeAsync(150);

      // Check that writers received objects with expected properties
      expect(errorWriter).toHaveBeenCalledWith([
        expect.objectContaining({
          level: 'error',
          data: 'error message',
        }),
      ]);
      expect(infoWriter).toHaveBeenCalledWith([
        expect.objectContaining({
          level: 'info',
          data: 'info message',
        }),
      ]);
    });

    it('should handle lanes without filters', async () => {
      const allWriter = vi.fn();

      const logger = createLLMLogger({
        immediateFlush: true, // Enable immediate flushing for tests
        lanes: [
          {
            laneId: 'all',
            writer: allWriter, // No filters - should receive all logs
          },
        ],
      });

      logger.log('string log');
      logger.info({ type: 'object log' });

      // Allow flush loops to complete
      await vi.advanceTimersByTimeAsync(150);

      expect(allWriter).toHaveBeenCalledTimes(2);
      expect(allWriter).toHaveBeenCalledWith([
        expect.objectContaining({
          level: 'log',
          data: 'string log',
        }),
      ]);
      expect(allWriter).toHaveBeenCalledWith([
        expect.objectContaining({
          level: 'info',
          type: 'object log',
        }),
      ]);
    });
  });

  describe('File Context Tracking', () => {
    it('should capture file context for log entries', () => {
      const logger = createLLMLogger();

      logger.log('test with context');

      const logs = logger.ringBuffer.all();
      expect(logs).toHaveLength(1);

      const logEntry = logs[0];
      expect(logEntry.meta.has('fileContext')).toBe(true);

      const fileContext = logEntry.meta.get('fileContext');
      expect(fileContext).toHaveProperty('filePath');
      expect(fileContext).toHaveProperty('line');
      expect(typeof fileContext.line).toBe('number');
    });
  });

  describe('Utility Methods', () => {
    it('should flush all lanes manually', async () => {
      const writer = vi.fn();

      const logger = createLLMLogger({
        lanes: [
          {
            laneId: 'test',
            writer,
          },
        ],
      });

      logger.log('test message');

      // Manual flush
      logger.flush();

      // Check that writer received object with expected properties
      expect(writer).toHaveBeenCalledWith([
        expect.objectContaining({
          level: 'log',
          data: 'test message',
        }),
      ]);
    });

    it('should clear ring buffer and lane buffers', () => {
      const logger = createLLMLogger();

      logger.log('test 1');
      logger.log('test 2');

      expect(logger.ringBuffer.size()).toBe(2);

      logger.clear();

      expect(logger.ringBuffer.size()).toBe(0);
    });
  });

  describe('Writer Functions', () => {
    it('console writer outputs with prefix', () => {
      const writer = createConsoleWriter('[TEST] ');
      writer(['message 1', 'message 2']);

      expect(mockConsoleLog).toHaveBeenCalledWith('[TEST] message 1');
      expect(mockConsoleLog).toHaveBeenCalledWith('[TEST] message 2');
    });

    it('file writer shows placeholder output', () => {
      const writer = createFileWriter('/tmp/test.log');
      writer(['line 1', 'line 2', 'line 3']);

      expect(mockConsoleLog).toHaveBeenCalledWith('[FILE:/tmp/test.log] 3 lines');
    });
  });

  describe('Legacy API (Deprecated)', () => {
    it('should warn when using legacy log function', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Import the legacy log function
      const { log } = await import('./index.js');
      log('test', null);

      expect(consoleSpy).toHaveBeenCalledWith(
        'LLM Logger: log() called without proper logger instance. Use createLLMLogger() and setLogger().'
      );

      consoleSpy.mockRestore();
    });

    it('should work with legacy log function when logger provided', async () => {
      const mockLogger = {
        log: vi.fn(),
      };

      const { log } = await import('./index.js');
      log('test message', mockLogger);

      expect(mockLogger.log).toHaveBeenCalledWith('test message');
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle mixed data types', async () => {
      const writer = vi.fn();

      const logger = createLLMLogger({
        immediateFlush: true, // Enable immediate flushing for tests
        lanes: [
          {
            laneId: 'mixed',
            writer,
          },
        ],
      });

      logger.log('string');
      logger.log({ object: 'data' });
      logger.log(123);
      logger.log(null);

      // Allow flush loops to complete
      await vi.advanceTimersByTimeAsync(150);

      expect(writer).toHaveBeenCalledWith([
        expect.objectContaining({
          level: 'log',
          data: 'string',
        }),
      ]);
      expect(writer).toHaveBeenCalledWith([
        expect.objectContaining({
          level: 'log',
          object: 'data',
        }),
      ]);
      expect(writer).toHaveBeenCalledWith([
        expect.objectContaining({
          level: 'log',
          data: 123,
        }),
      ]);
      expect(writer).toHaveBeenCalledWith([
        expect.objectContaining({
          level: 'log',
          data: null,
        }),
      ]);
    });

    it('should handle high-volume logging', async () => {
      const writer = vi.fn();

      const logger = createLLMLogger({
        immediateFlush: true, // Enable immediate flushing for tests
        ringBufferSize: 100,
        lanes: [
          {
            laneId: 'volume',
            writer,
          },
        ],
      });

      // Generate many logs
      for (let i = 0; i < 50; i++) {
        logger.log(`message ${i}`);
      }

      // Allow flush loops to complete
      await vi.advanceTimersByTimeAsync(200);

      // Should have processed all logs
      expect(writer).toHaveBeenCalledTimes(50);

      // Ring buffer should contain all logs (within capacity)
      expect(logger.ringBuffer.size()).toBe(50);
    });
  });
});
