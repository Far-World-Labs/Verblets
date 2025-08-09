import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import RedisRingBuffer from './index.js';
import { getClient } from '../../services/redis/index.js';

// Import helper functions for testing Redis boundary behavior
const getInt = async (redis, key, defaultValue = 0) => {
  const value = await redis.get(key);
  if (value === null || value === undefined) return defaultValue;
  return parseInt(value);
};

const getAllReaderOffsets = async (redis, key) => {
  const offsets = await redis.hvals(key);
  if (!offsets || offsets.length === 0) return [];
  return offsets.map((o) => parseInt(o));
};

const skipRedisTests = process.env.REDIS_TEST_SKIP === 'true';
const conditionalDescribe = skipRedisTests ? describe.skip : describe;

conditionalDescribe('RedisRingBuffer Integration', () => {
  let redis;
  let buffers = [];

  beforeEach(async () => {
    redis = await getClient();
  });

  afterEach(async () => {
    await Promise.all(buffers.map((buffer) => buffer.close()));
    buffers = [];
  });

  const createBuffer = (keyPrefix = 'test', options = {}) => {
    const buffer = new RedisRingBuffer({
      key: `${keyPrefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      redisClient: redis,
      maxSize: 10,
      ...options,
    });
    buffers.push(buffer);
    return buffer;
  };

  describe('reader creation', () => {
    const scenarios = [
      {
        name: 'semantic process IDs',
        got: { readerId: 'failure-analysis-proc-12345' },
        want: { id: 'failure-analysis-proc-12345', offset: -1, source: 'local' },
      },
      {
        name: 'timing analysis reader',
        got: { readerId: 'timing-analysis-suite-runner-67890' },
        want: { id: 'timing-analysis-suite-runner-67890', offset: -1, source: 'local' },
      },
      {
        name: 'reader with start offset',
        got: { readerId: 'positioned-reader', startOffset: 5 },
        want: { id: 'positioned-reader', offset: 4, source: 'local' },
      },
    ];

    scenarios.forEach(({ name, got, want }) => {
      it(`should handle ${name}`, async () => {
        const buffer = createBuffer();
        const reader = await buffer.createReader(got.readerId, got.startOffset);

        expect(reader.id).toBe(want.id);
        expect(reader.offset).toBe(want.offset);
        expect(reader.source).toBe(want.source);
      });
    });

    it('should prevent duplicate reader IDs', async () => {
      const buffer = createBuffer();

      await buffer.createReader('duplicate-id');
      await expect(buffer.createReader('duplicate-id')).rejects.toThrow(
        "Reader ID 'duplicate-id' already exists"
      );
    });
  });

  describe('write and read operations', () => {
    const writeScenarios = [
      {
        name: 'test result message',
        got: { data: { type: 'test-fail', suite: 'auth', error: 'timeout' } },
        want: { sequence: 0 },
      },
      {
        name: 'timing data',
        got: { data: { type: 'timing', test: 'login', duration: 1500 } },
        want: { sequence: 0 },
      },
      {
        name: 'simple string',
        got: { data: 'test-message' },
        want: { sequence: 0 },
      },
    ];

    writeScenarios.forEach(({ name, got, want }) => {
      it(`should write ${name}`, async () => {
        const buffer = createBuffer();
        const sequence = await buffer.push(got.data);
        expect(sequence).toBe(want.sequence);
      });
    });

    const readScenarios = [
      {
        name: 'consume available messages',
        got: {
          writes: ['msg1', 'msg2', 'msg3'],
          readerId: 'consumer',
          consumeCount: 2,
        },
        want: { messages: ['msg1', 'msg2'], readerOffset: 1 },
      },
      {
        name: 'multiple readers same data',
        got: {
          writes: ['shared1', 'shared2'],
          readers: [
            { id: 'reader1', consume: 2 },
            { id: 'reader2', consume: 1 },
          ],
        },
        want: {
          reader1Gets: ['shared1', 'shared2'],
          reader2Gets: ['shared1'],
          bothSeeShared1: true,
        },
      },
    ];

    readScenarios.forEach(({ name, got, want }) => {
      it(`should ${name}`, async () => {
        const buffer = createBuffer();

        for (const data of got.writes) {
          await buffer.push(data);
        }

        if (got.readerId) {
          const reader = await buffer.createReader(got.readerId);
          const messages = await reader.consume(got.consumeCount);
          expect(messages).toEqual(want.messages);
          expect(reader.offset).toBe(want.readerOffset);
        }

        if (got.readers) {
          const results = [];
          for (const { id, consume } of got.readers) {
            const reader = await buffer.createReader(id);
            const messages = await reader.consume(consume);
            results.push({ id, messages });
          }

          if (want.reader1Gets) {
            const reader1 = results.find((r) => r.id === 'reader1');
            expect(reader1.messages).toEqual(want.reader1Gets);
          }

          if (want.reader2Gets) {
            const reader2 = results.find((r) => r.id === 'reader2');
            expect(reader2.messages).toEqual(want.reader2Gets);
          }

          if (want.bothSeeShared1) {
            expect(results[0].messages[0]).toBe(results[1].messages[0]);
          }
        }
      });
    });
  });

  describe('reader tracking', () => {
    const trackingScenarios = [
      {
        name: 'local readers only',
        got: { localReaders: ['local1', 'local2'], includeRemote: false },
        want: { count: 2, allLocal: true },
      },
      {
        name: 'mixed local and remote',
        got: {
          localReaders: ['local-reader'],
          remoteInRedis: { 'remote-proc-1': '10', 'remote-proc-2': '5' },
          includeRemote: true,
        },
        want: { total: 3, local: 1, remote: 2 },
      },
    ];

    trackingScenarios.forEach(({ name, got, want }) => {
      it(`should track ${name}`, async () => {
        const buffer = createBuffer();

        for (const readerId of got.localReaders) {
          await buffer.createReader(readerId);
        }

        if (got.remoteInRedis) {
          for (const [readerId, offset] of Object.entries(got.remoteInRedis)) {
            await redis.hset(buffer.keys.readerOffsets, readerId, offset);
          }
        }

        const readers = await buffer.getReaders({ includeRemote: got.includeRemote });

        if (want.count) {
          expect(readers).toHaveLength(want.count);
        }

        if (want.total) {
          expect(readers).toHaveLength(want.total);
        }

        if (want.allLocal) {
          expect(readers.every((r) => r.source === 'local')).toBe(true);
        }

        if (want.local) {
          expect(readers.filter((r) => r.source === 'local')).toHaveLength(want.local);
        }

        if (want.remote) {
          expect(readers.filter((r) => r.source === 'remote')).toHaveLength(want.remote);
        }
      });
    });
  });

  describe('overflow protection', () => {
    const overflowScenarios = [
      {
        name: 'buffer full with slow reader',
        got: { maxSize: 3, writes: 4, slowReaderConsumes: 0 },
        want: { firstThreeSucceed: true, fourthFails: true, errorContains: 'overflow' },
      },
      {
        name: 'force write bypasses protection',
        got: { maxSize: 2, writes: 3, force: true },
        want: { allSucceed: true },
      },
    ];

    overflowScenarios.forEach(({ name, got, want }) => {
      it(`should handle ${name}`, async () => {
        const buffer = createBuffer('overflow', { maxSize: got.maxSize });
        await buffer.createReader('slow-reader');

        const results = [];
        for (let i = 0; i < got.writes; i++) {
          try {
            const seq = await buffer.push(`msg${i}`, { force: got.force });
            results.push({ success: true, sequence: seq });
          } catch (error) {
            results.push({ success: false, error: error.message });
          }
        }

        if (want.firstThreeSucceed) {
          expect(results.slice(0, 3).every((r) => r.success)).toBe(true);
        }

        if (want.fourthFails) {
          expect(results[3].success).toBe(false);
          expect(results[3].error).toContain(want.errorContains);
        }

        if (want.allSucceed) {
          expect(results.every((r) => r.success)).toBe(true);
        }
      });
    });
  });

  describe('lookback queries', () => {
    const lookbackScenarios = [
      {
        name: 'recent test results',
        got: {
          writes: ['test1', 'test2', 'test3', 'test4'],
          n: 2,
          fromOffset: 3,
        },
        want: ['test3', 'test4'],
      },
      {
        name: 'lookback beyond available',
        got: {
          writes: ['a', 'b'],
          n: 3,
          fromOffset: 5,
        },
        want: [],
      },
      {
        name: 'lookback without offset uses latest',
        got: {
          writes: ['item1', 'item2', 'item3', 'item4', 'item5'],
          n: 3,
          fromOffset: undefined,
        },
        want: ['item3', 'item4', 'item5'],
      },
    ];

    lookbackScenarios.forEach(({ name, got, want }) => {
      it(`should handle ${name}`, async () => {
        const buffer = createBuffer();

        for (const data of got.writes) {
          await buffer.push(data);
        }

        const result = await buffer.lookback(got.n, got.fromOffset);

        expect(result).toEqual(want);
      });
    });
  });

  describe('reader lookback method', () => {
    it('should look back from reader current offset by default', async () => {
      const buffer = createBuffer();
      const reader = await buffer.createReader('lookback-test');

      // Add messages
      for (let i = 0; i < 10; i++) {
        await buffer.push(`item${i}`);
      }

      // Read 5 items to advance reader offset
      await reader.consume(5);
      expect(reader.offset).toBe(4);

      // Look back 3 items from reader's current position
      const result = await reader.lookback(3);
      expect(result).toEqual(['item2', 'item3', 'item4']);
    });

    it('should look back from specified offset', async () => {
      const buffer = createBuffer();
      const reader = await buffer.createReader('lookback-test2');

      // Add messages
      for (let i = 0; i < 10; i++) {
        await buffer.push(`item${i}`);
      }

      // Read 5 items to advance reader offset
      await reader.consume(5);
      expect(reader.offset).toBe(4);

      // Look back 3 items from offset 7
      const result = await reader.lookback(3, 7);
      expect(result).toEqual(['item5', 'item6', 'item7']);
    });

    it('should work with multiple readers at different positions', async () => {
      const buffer = createBuffer();
      const reader1 = await buffer.createReader('reader1');
      const reader2 = await buffer.createReader('reader2');

      // Add messages
      for (let i = 0; i < 10; i++) {
        await buffer.push(`item${i}`);
      }

      // Advance readers to different positions
      await reader1.consume(3); // offset 2
      await reader2.consume(7); // offset 6

      // Each reader lookback uses their own offset by default
      const result1 = await reader1.lookback(2);
      const result2 = await reader2.lookback(2);

      expect(result1).toEqual(['item1', 'item2']);
      expect(result2).toEqual(['item5', 'item6']);
    });

    it('should handle reader with no reads yet', async () => {
      const buffer = createBuffer();
      const reader = await buffer.createReader('new-reader');

      // Add some messages
      for (let i = 0; i < 5; i++) {
        await buffer.push(`item${i}`);
      }

      // Reader starts at offset -1
      const result = await reader.lookback(3);

      // Should return empty since reader is at -1
      expect(result).toEqual([]);
    });

    it('should work after reader branch', async () => {
      const buffer = createBuffer();
      const reader = await buffer.createReader('original');

      // Add messages
      for (let i = 0; i < 10; i++) {
        await buffer.push(`item${i}`);
      }

      // Read some items
      await reader.consume(5);

      // Branch at current position
      const branchedReader = await reader.branch('branched');

      // Read more with original reader
      await reader.consume(3);

      // Lookback should use each reader's current offset
      const originalResult = await reader.lookback(3);
      const branchedResult = await branchedReader.lookback(3);

      expect(originalResult).toEqual(['item5', 'item6', 'item7']);
      expect(branchedResult).toEqual(['item2', 'item3', 'item4']);
    });
  });

  describe('lag calculation', () => {
    const lagScenarios = [
      {
        name: 'reader caught up',
        got: { writes: 5, readerConsumes: 5 },
        want: { lag: 0 },
      },
      {
        name: 'reader behind',
        got: { writes: 10, readerConsumes: 6 },
        want: { lag: 4 },
      },
      {
        name: 'new reader',
        got: { writes: 8, readerConsumes: 0 },
        want: { lag: 8 },
      },
    ];

    lagScenarios.forEach(({ name, got, want }) => {
      it(`should calculate lag for ${name}`, async () => {
        const buffer = createBuffer();
        const reader = await buffer.createReader('lag-test');

        for (let i = 0; i < got.writes; i++) {
          await buffer.push(`msg${i}`);
        }

        if (got.readerConsumes > 0) {
          await reader.consume(got.readerConsumes);
        }

        const lag = await reader.lag();
        expect(lag).toBe(want.lag);
      });
    });
  });

  describe('stats reporting', () => {
    it('should provide comprehensive stats', async () => {
      const got = {
        localReaders: ['local1', 'local2'],
        remoteReaders: { remote1: '5' },
        writes: 3,
      };
      const want = {
        totalReaders: 3,
        localReaders: 2,
        remoteReaders: 1,
        sequence: 3,
      };

      const buffer = createBuffer();

      for (const readerId of got.localReaders) {
        await buffer.createReader(readerId);
      }

      for (const [readerId, offset] of Object.entries(got.remoteReaders)) {
        await redis.hset(buffer.keys.readerOffsets, readerId, offset);
      }

      for (let i = 0; i < got.writes; i++) {
        await buffer.push(`data${i}`);
      }

      const stats = await buffer.getStats();

      expect(stats.readers.total).toBe(want.totalReaders);
      expect(stats.readers.local).toBe(want.localReaders);
      expect(stats.readers.remote).toBe(want.remoteReaders);
      expect(stats.sequence).toBe(want.sequence);
    });
  });

  describe('cleanup', () => {
    const cleanupScenarios = [
      {
        name: 'close removes all keys',
        got: { method: 'close' },
        want: { keysRemoved: true, localReadersCleared: true },
      },
      {
        name: 'clear resets but preserves structure',
        got: { method: 'clear' },
        want: { sequenceReset: true, readersReset: true },
      },
    ];

    cleanupScenarios.forEach(({ name, got, want }) => {
      it(`should handle ${name}`, async () => {
        const buffer = createBuffer('cleanup');
        await buffer.createReader('test-reader');
        await buffer.push('test-data');

        const sequenceBefore = await redis.get(buffer.keys.sequence);
        expect(sequenceBefore).toBeTruthy();

        await buffer[got.method]();

        if (want.keysRemoved) {
          const sequenceAfter = await redis.get(buffer.keys.sequence);
          expect(sequenceAfter).toBeNull();
        }

        if (want.localReadersCleared) {
          expect(buffer.localReaders.size).toBe(0);
        }

        if (want.sequenceReset) {
          const sequence = await redis.get(buffer.keys.sequence);
          expect(sequence).toBe('0');
        }
      });
    });
  });

  describe('key isolation', () => {
    it('should isolate multiple buffer instances', async () => {
      const got = {
        buffer1Data: 'buffer1-msg',
        buffer2Data: 'buffer2-msg',
        buffer1Reader: 'buf1-reader',
        buffer2Reader: 'buf2-reader',
      };
      const want = {
        separateReaders: true,
        separateSequences: true,
        independentClose: true,
      };

      const buffer1 = createBuffer('iso1');
      const buffer2 = createBuffer('iso2');

      await buffer1.push(got.buffer1Data);
      await buffer2.push(got.buffer2Data);

      await buffer1.createReader(got.buffer1Reader);
      await buffer2.createReader(got.buffer2Reader);

      const buf1Readers = await buffer1.getReaders();
      const buf2Readers = await buffer2.getReaders();

      if (want.separateReaders) {
        expect(buf1Readers).toHaveLength(1);
        expect(buf2Readers).toHaveLength(1);
        expect(buf1Readers[0].id).toBe(got.buffer1Reader);
        expect(buf2Readers[0].id).toBe(got.buffer2Reader);
      }

      await buffer1.close();

      if (want.independentClose) {
        const buf2Stats = await buffer2.getStats();
        expect(buf2Stats.sequence).toBe(1);
      }
    });
  });

  describe('null/undefined handling', () => {
    it('should convert Redis nulls to undefined at boundaries', async () => {
      const got = { nonExistentKey: 'non-existent-buffer-key' };
      const want = { returnsUndefined: true, neverReturnsNull: true };

      const buffer = createBuffer();

      // Access non-existent keys should return undefined, not null
      const sequence = await getInt(redis, got.nonExistentKey);
      expect(sequence).toBe(0); // Default value, not null

      const offsets = await getAllReaderOffsets(redis, got.nonExistentKey);
      expect(offsets).toEqual([]); // Empty array, not null
      expect(offsets).not.toBeNull();

      if (want.neverReturnsNull) {
        const allReaders = await buffer.getReaders({ includeRemote: true });
        allReaders.forEach((reader) => {
          expect(reader.id).not.toBeNull();
          expect(reader.offset).not.toBeNull();
          expect(reader.source).not.toBeNull();
        });
      }
    });
  });
});
