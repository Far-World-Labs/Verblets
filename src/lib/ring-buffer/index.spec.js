import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import RingBuffer from './index.js';

describe('RingBuffer', () => {
  let buffer;

  beforeEach(() => {
    vi.useFakeTimers();
    buffer = new RingBuffer(10);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor and basic setup', () => {
    it('should create buffer with correct initial state', () => {
      expect(buffer.maxSize).toBe(10);
      expect(buffer.writeIndex).toBe(0);
      expect(buffer.sequence).toBe(0);
      expect(buffer.readers.size).toBe(0);
      expect(buffer.waitingReads.size).toBe(0);
    });

    it('should have double-sized internal buffer', () => {
      expect(buffer.buffer.length).toBe(20); // 2 * maxSize
    });
  });

  describe('reader creation', () => {
    it('should create readers with sequential IDs', () => {
      const reader1 = buffer.reader();
      const reader2 = buffer.reader();

      expect(reader1.id).toBe('r0');
      expect(reader2.id).toBe('r1');
      expect(buffer.readers.size).toBe(2);
    });

    it('should initialize readers with offset -1', () => {
      const reader = buffer.reader();
      expect(reader.offset).toBe(-1);
    });

    it('should create reader at specific offset', () => {
      const reader = buffer.reader(5);
      expect(reader.offset).toBe(4); // offset - 1
    });

    it('should remove readers correctly', () => {
      const reader = buffer.reader();
      expect(buffer.readers.size).toBe(1);

      reader.close();
      expect(buffer.readers.size).toBe(0);
    });
  });

  describe('writing data', () => {
    it('should write data and return sequence numbers', async () => {
      const seq1 = await buffer.write('item1');
      const seq2 = await buffer.write('item2');

      expect(seq1).toBe(0);
      expect(seq2).toBe(1);
      expect(buffer.sequence).toBe(2);
    });

    it('should write to both main and mirror positions', async () => {
      await buffer.write('test');

      expect(buffer.buffer[0]).toBe('test');
      expect(buffer.buffer[10]).toBe('test'); // Mirror position
    });

    it('should advance write index with wraparound', async () => {
      // Fill buffer to capacity
      for (let i = 0; i < 10; i++) {
        await buffer.write(`item${i}`);
      }

      expect(buffer.writeIndex).toBe(0); // Should wrap around

      // Write one more
      await buffer.write('wrapped');
      expect(buffer.writeIndex).toBe(1);
    });
  });

  describe('reader reading', () => {
    it('should read available data immediately', async () => {
      const reader = buffer.reader();
      await buffer.write('item0');

      const data = await reader.take();
      expect(data).toEqual(['item0']);
      expect(reader.offset).toBe(0);
    });

    it('should read data in sequence', async () => {
      const reader = buffer.reader();
      await buffer.write('item0');
      await buffer.write('item1');
      await buffer.write('item2');

      const data1 = await reader.take();
      const data2 = await reader.take();
      const data3 = await reader.take();

      expect(data1).toEqual(['item0']);
      expect(data2).toEqual(['item1']);
      expect(data3).toEqual(['item2']);
    });

    it('should block when no data is available', async () => {
      const reader = buffer.reader();

      let resolved = false;
      const readPromise = reader.takeOrWait(1, undefined).then((data) => {
        resolved = true;
        return data;
      });

      // Should not resolve immediately
      await vi.advanceTimersByTimeAsync(10);
      expect(resolved).toBe(false);

      // Write data to unblock
      await buffer.write('item3');
      const data = await readPromise;
      expect(data).toEqual(['item3']);
      expect(resolved).toBe(true);
    });

    it('should handle multiple readers independently', async () => {
      const reader1 = buffer.reader();
      const reader2 = buffer.reader();

      await buffer.write('item0');
      await buffer.write('item1');

      const data1a = await reader1.take();
      const data2a = await reader2.take();
      const data1b = await reader1.take();

      expect(data1a).toEqual(['item0']);
      expect(data2a).toEqual(['item0']); // Same data
      expect(data1b).toEqual(['item1']);
    });
  });

  describe('batch reading', () => {
    it('should read full batches when available', async () => {
      const reader = buffer.reader();

      await buffer.write('batch0');
      await buffer.write('batch1');
      await buffer.write('batch2');

      const data = await reader.take(3);

      expect(data).toEqual(['batch0', 'batch1', 'batch2']);
      expect(reader.offset).toBe(2);
    });

    it('should use double buffer for efficient slicing', async () => {
      const reader = buffer.reader();

      // Write more data than batch size
      for (let i = 0; i < 6; i++) {
        await buffer.write(`batch${i}`);
      }

      // Read first batch
      const data1 = await reader.take(3);
      expect(data1).toEqual(['batch0', 'batch1', 'batch2']);

      // Read second batch - should work seamlessly
      const data2 = await reader.take(3);
      expect(data2).toEqual(['batch3', 'batch4', 'batch5']);
    });

    it('should block until full batch is available', async () => {
      const reader = buffer.reader();

      // Write partial data
      await buffer.write('batch0');
      await buffer.write('batch1');

      let resolved = false;
      const batchPromise = reader.takeOrWait(3, undefined).then((data) => {
        resolved = true;
        return data;
      });

      // Should not resolve with partial batch
      await vi.advanceTimersByTimeAsync(10);
      expect(resolved).toBe(false);

      // Complete the batch
      await buffer.write('batch2');

      const data = await batchPromise;
      expect(data).toEqual(['batch0', 'batch1', 'batch2']);
      expect(resolved).toBe(true);
    });

    it('should handle wraparound in batch reads', async () => {
      const reader = buffer.reader();

      // Fill buffer with initial data
      for (let i = 0; i < 10; i++) {
        await buffer.write(`batch${i}`);
      }

      // Read first 4 items to advance reader
      const data1 = await reader.take(4);
      expect(data1).toEqual(['batch0', 'batch1', 'batch2', 'batch3']);

      // Read the rest to make room
      const data2 = await reader.take(6);
      expect(data2).toEqual(['batch4', 'batch5', 'batch6', 'batch7', 'batch8', 'batch9']);

      // Now we can write new data that will wrap around
      for (let i = 10; i < 16; i++) {
        await buffer.write(`wrap${i}`);
      }

      // Read the wrapped data
      const data3 = await reader.take(6);
      expect(data3).toEqual(['wrap10', 'wrap11', 'wrap12', 'wrap13', 'wrap14', 'wrap15']);

      // Verify the wraparound happened
      expect(buffer.writeIndex).toBe(6); // Should have wrapped around
    });
  });

  describe('reader methods', () => {
    it('should return correct available count', async () => {
      const reader = buffer.reader();

      expect(reader.lag()).toBe(0);

      await buffer.write('item1');
      expect(reader.lag()).toBe(1);

      await buffer.write('item2');
      expect(reader.lag()).toBe(2);

      // Read one item
      await reader.take();
      expect(reader.lag()).toBe(1);
    });

    it('should handle read with details', async () => {
      const reader = buffer.reader();

      await buffer.write('item0');
      await buffer.write('item1');
      await buffer.write('item2');

      const result = await reader.read(2);
      expect(result).toEqual({
        data: ['item0', 'item1'],
        startOffset: 0,
        lastOffset: 1,
      });
    });
  });

  describe('stats and monitoring', () => {
    it('should return correct stats', async () => {
      buffer.reader();
      await buffer.write('test');

      const stats = buffer.stats();
      expect(stats.maxSize).toBe(10);
      expect(stats.sequence).toBe(1);
      expect(stats.readers).toBe(1);
      expect(stats.waitingReads).toBe(0);
    });

    it('should track waiting readers', async () => {
      const reader = buffer.reader();

      // Start a read that will block
      const readPromise = reader.takeOrWait(1, undefined);

      // Check stats show waiting reader
      await vi.advanceTimersByTimeAsync(10);
      const stats = buffer.stats();
      expect(stats.waitingReads).toBe(1);

      // Unblock the read
      await buffer.write('test');
      await readPromise;

      // Should no longer be waiting
      const finalStats = buffer.stats();
      expect(finalStats.waitingReads).toBe(0);
    });
  });

  describe('clear functionality', () => {
    it('should reset all state', async () => {
      const reader = buffer.reader();
      await buffer.write('test1');
      await buffer.write('test2');

      buffer.clear();

      expect(buffer.writeIndex).toBe(0);
      expect(buffer.sequence).toBe(0);
      expect(reader.offset).toBe(-1);
      expect(buffer.buffer[0]).toBe(undefined);
    });

    it('should resolve waiting readers on clear', async () => {
      const reader = buffer.reader();

      let resolved = false;
      const readPromise = reader.takeOrWait(1, undefined).then((data) => {
        resolved = true;
        return data;
      });

      await vi.advanceTimersByTimeAsync(10);
      expect(resolved).toBe(false);

      buffer.clear();

      const data = await readPromise;
      expect(data).toEqual([]);
      expect(resolved).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should throw for invalid timeout', async () => {
      const reader = buffer.reader();
      expect(() => reader.takeOrWait(5, -1)).toThrow(
        'Invalid timeout: -1ms. Must be non-negative or undefined.'
      );
    });
  });

  describe('reader coordination', () => {
    it('should demonstrate offset-based coordination', async () => {
      // Create multiple readers
      const reader1 = buffer.reader();
      const reader2 = buffer.reader();
      const reader3 = buffer.reader();

      // Write some data
      await buffer.write('item0');
      await buffer.write('item1');
      await buffer.write('item2');
      await buffer.write('item3');
      await buffer.write('item4');

      // Reader 1 processes batches of 2
      const batch1 = await reader1.take(2);

      // Reader 2 processes batches of 3
      const batch2 = await reader2.take(3);

      // Reader 3 processes single items
      const item1 = await reader3.take();

      expect(batch1).toEqual(['item0', 'item1']);
      expect(reader1.offset).toBe(1);
      expect(batch2).toEqual(['item0', 'item1', 'item2']);
      expect(reader2.offset).toBe(2);
      expect(item1).toEqual(['item0']);
      expect(reader3.offset).toBe(0);

      // Continue processing to show coordination
      const item2 = await reader3.take();
      expect(item2).toEqual(['item1']);
      expect(reader3.offset).toBe(1);
    });
  });

  describe('pause and backpressure', () => {
    it('should pause and unpause readers', () => {
      const reader = buffer.reader();

      expect(reader.paused).toBe(false);
      expect(reader.pause()).toBe(true);
      expect(reader.paused).toBe(true);
      expect(reader.pause()).toBe(false); // Already paused

      expect(reader.unpause()).toBe(true);
      expect(reader.paused).toBe(false);
      expect(reader.unpause()).toBe(false); // Already unpaused
    });

    it('should block writes when any reader would overflow', async () => {
      const reader = buffer.reader();

      // Fill buffer completely without reading (can write 10 items before overflow)
      for (let i = 0; i < 10; i++) {
        await buffer.write(`item${i}`);
      }

      // Next write should block automatically
      let blocked = true;
      const writePromise = buffer.write('blocked').then(() => {
        blocked = false;
      });

      await vi.advanceTimersByTimeAsync(10);
      expect(blocked).toBe(true);

      // Read some data to make room
      await reader.take(5);

      // Write should complete
      await writePromise;
      expect(blocked).toBe(false);
    });

    it('should block writes when paused reader would overflow', async () => {
      const reader = buffer.reader();

      // Reader starts at offset -1
      expect(reader.offset).toBe(-1);

      // Fill buffer partially
      for (let i = 0; i < 5; i++) {
        await buffer.write(`item${i}`);
      }

      // Pause reader while still at offset -1
      reader.pause();
      expect(reader.paused).toBe(true);

      // Continue writing - with reader at -1, we can write 10 items total before overflow
      // because 10 - (-1) = 11 which is > maxSize (10)
      for (let i = 5; i < 10; i++) {
        await buffer.write(`item${i}`);
      }

      // At this point: sequence = 10, reader offset = -1
      // Current: 10 - (-1) = 11, which exceeds maxSize
      expect(buffer.sequence).toBe(10);
      expect(reader.offset).toBe(-1);

      let writeBlocked = true;
      const writePromise = buffer
        .write('blocked')
        .then(() => {
          writeBlocked = false;
        })
        .catch((err) => {
          console.error('Write error:', err);
          throw err;
        });

      await vi.advanceTimersByTimeAsync(10);
      expect(writeBlocked).toBe(true);

      // Unpause reader - but write is still blocked because reader hasn't consumed
      reader.unpause();

      // Still blocked
      await vi.advanceTimersByTimeAsync(10);
      expect(writeBlocked).toBe(true);

      // Read some data to make room
      await reader.take(5);

      // Now write should complete
      await writePromise;
      expect(writeBlocked).toBe(false);
    });

    it('should handle mixed readers correctly', async () => {
      const reader1 = buffer.reader();
      const reader2 = buffer.reader();

      // Write some data
      for (let i = 0; i < 5; i++) {
        await buffer.write(`item${i}`);
      }

      // Reader1 reads some data, reader2 doesn't
      await reader1.take(3);
      expect(reader1.offset).toBe(2);
      expect(reader2.offset).toBe(-1);

      // Continue writing - will block when reader2 would overflow
      for (let i = 5; i < 10; i++) {
        await buffer.write(`item${i}`);
      }

      // Next write should block because reader2 (slowest) would overflow
      let blocked = true;
      const writePromise = buffer.write('blocked').then(() => {
        blocked = false;
      });

      await vi.advanceTimersByTimeAsync(10);
      expect(blocked).toBe(true);

      // Move reader2 forward
      await reader2.take(5);

      // Write should complete
      await writePromise;
      expect(blocked).toBe(false);
    });

    it('should block when readers would overflow', async () => {
      const reader1 = buffer.reader();
      const reader2 = buffer.reader();

      // Write to buffer limit
      for (let i = 0; i < 10; i++) {
        await buffer.write(`item${i}`);
      }

      expect(buffer.oldestReaderOffset).toBe(-1);

      // Next write should block since both readers are at -1
      let blocked = true;
      const writePromise = buffer
        .write('blocked')
        .then(() => {
          blocked = false;
        })
        .catch((err) => {
          console.error('Write error:', err);
          throw err;
        });

      await vi.advanceTimersByTimeAsync(10);
      expect(blocked).toBe(true);

      // Have one reader consume data
      await reader1.take(5);
      expect(reader1.offset).toBe(4);

      // Check if oldest was updated
      expect(buffer.oldestReaderOffset).toBe(-1); // reader2 is still at -1

      // Need to advance reader2 as well
      await reader2.take(1);
      expect(reader2.offset).toBe(0);
      expect(buffer.oldestReaderOffset).toBe(0);

      // Now write should complete
      await writePromise;
      expect(blocked).toBe(false);
    });

    it('should handle reader consumption after pause correctly', async () => {
      const reader = buffer.reader();

      // Write initial data
      for (let i = 0; i < 8; i++) {
        await buffer.write(`item${i}`);
      }

      // Pause reader
      reader.pause();

      // Write more data (will succeed because not at limit yet)
      await buffer.write('item8');
      await buffer.write('item9');

      // This write should block
      let blocked = true;
      const writePromise = buffer.write('item10').then(() => {
        blocked = false;
      });

      await vi.advanceTimersByTimeAsync(10);
      expect(blocked).toBe(true);

      // Unpause and consume some data
      reader.unpause();
      await reader.take(5); // Move reader forward

      // Write should complete now
      await writePromise;
      expect(blocked).toBe(false);

      // Should be able to write more now
      await buffer.write('item10');
    });

    it('should throw error with writeSync when reader would overflow', async () => {
      buffer.reader();

      // Fill buffer completely
      for (let i = 0; i < 10; i++) {
        await buffer.write(`item${i}`);
      }

      // Synchronous write should throw
      expect(() => buffer.writeSync('overflow')).toThrow(
        'Ring buffer overflow: reader is 11 messages behind (max: 10)'
      );
    });

    it('should allow force writes to bypass backpressure', async () => {
      const reader = buffer.reader();

      // Fill buffer completely
      for (let i = 0; i < 10; i++) {
        await buffer.write(`item${i}`);
      }

      // Normal write would block
      let blocked = true;
      const writePromise = buffer.write('blocked').then(() => {
        blocked = false;
      });

      await vi.advanceTimersByTimeAsync(10);
      expect(blocked).toBe(true);

      // Force write should succeed immediately
      const seq = await buffer.write('forced', { force: true });
      expect(seq).toBe(10);

      // Reader is now further behind
      expect(reader.lag()).toBe(11);

      // Original write is still blocked
      expect(blocked).toBe(true);

      // Clean up
      await reader.take(5);
      await writePromise;
    });

    it('should process waiting writers in order when readers resume', async () => {
      const reader = buffer.reader();

      // Fill to just before blocking
      for (let i = 0; i < 10; i++) {
        await buffer.write(`item${i}`);
      }

      // Queue up multiple blocked writes
      const writes = [];
      const results = [];

      for (let i = 0; i < 3; i++) {
        writes.push(
          buffer.write(`blocked${i}`).then((seq) => {
            results.push({ item: `blocked${i}`, seq });
            return seq;
          })
        );
      }

      // Verify writes are blocked
      await vi.advanceTimersByTimeAsync(10);
      expect(results).toHaveLength(0);

      // Read data to unblock writes
      await reader.take(3);
      await Promise.all(writes);

      // Verify writes completed in order
      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({ item: 'blocked0', seq: 10 });
      expect(results[1]).toEqual({ item: 'blocked1', seq: 11 });
      expect(results[2]).toEqual({ item: 'blocked2', seq: 12 });
    });
  });

  describe('fork functionality', () => {
    it('should fork reader at current position', async () => {
      const reader1 = buffer.reader();

      await buffer.write('item0');
      await buffer.write('item1');
      await buffer.write('item2');

      // Read one item
      await reader1.take();
      expect(reader1.offset).toBe(0);

      // Fork from current position
      const reader2 = reader1.fork();
      expect(reader2.offset).toBe(0); // Starts at same position

      // Both can read independently
      const data1 = await reader1.take();
      const data2 = await reader2.take();

      expect(data1).toEqual(['item1']);
      expect(data2).toEqual(['item1']);
    });

    it('should fork reader at specific offset', async () => {
      const reader1 = buffer.reader();

      await buffer.write('item0');
      await buffer.write('item1');
      await buffer.write('item2');

      // Fork at specific offset
      const reader2 = reader1.fork(2);
      expect(reader2.offset).toBe(1);

      const data = await reader2.take();
      expect(data).toEqual(['item2']);
    });
  });

  describe('lookback method', () => {
    beforeEach(async () => {
      // Add messages with known sequence numbers
      for (let i = 0; i < 5; i++) {
        await buffer.write(`item${i}`);
      }
    });

    it('should look back from a given offset', () => {
      // Looking back 2 items from offset 3 (item3)
      const result = buffer.lookback(3, 2);
      expect(result.data).toEqual(['item2', 'item3']);
      expect(result.startOffset).toBe(2);
      expect(result.endOffset).toBe(3);
    });

    it('should look back from the latest offset', () => {
      // Looking back 3 items from offset 4 (item4)
      const result = buffer.lookback(4, 3);
      expect(result.data).toEqual(['item2', 'item3', 'item4']);
      expect(result.startOffset).toBe(2);
      expect(result.endOffset).toBe(4);
    });

    it('should handle looking back more items than available', () => {
      // Looking back 10 items from offset 3, but only 4 items exist (0-3)
      const result = buffer.lookback(3, 10);
      expect(result.data).toEqual(['item0', 'item1', 'item2', 'item3']);
      expect(result.startOffset).toBe(0);
      expect(result.endOffset).toBe(3);
    });

    it('should return empty when count is 0 or negative', () => {
      const result1 = buffer.lookback(3, 0);
      expect(result1.data).toEqual([]);
      expect(result1.startOffset).toBe(-1);
      expect(result1.endOffset).toBe(-1);

      const result2 = buffer.lookback(3, -5);
      expect(result2.data).toEqual([]);
      expect(result2.startOffset).toBe(-1);
      expect(result2.endOffset).toBe(-1);
    });

    it('should return empty when offset is out of range', () => {
      // Negative offset
      const result1 = buffer.lookback(-1, 2);
      expect(result1.data).toEqual([]);
      expect(result1.startOffset).toBe(-1);
      expect(result1.endOffset).toBe(-1);

      // Offset beyond sequence
      const result2 = buffer.lookback(10, 2);
      expect(result2.data).toEqual([]);
      expect(result2.startOffset).toBe(-1);
      expect(result2.endOffset).toBe(-1);
    });

    it('should handle wraparound correctly when buffer is full', async () => {
      // Fill buffer beyond capacity to trigger wraparound
      for (let i = 5; i < 15; i++) {
        await buffer.write(`item${i}`);
      }

      // Buffer now contains item5 through item14 (item0-4 were overwritten)
      // Looking back 3 items from offset 12 (item12)
      const result = buffer.lookback(12, 3);
      expect(result.data).toEqual(['item10', 'item11', 'item12']);
      expect(result.startOffset).toBe(10);
      expect(result.endOffset).toBe(12);
    });

    it('should respect buffer size limits', async () => {
      // Fill buffer way beyond capacity
      for (let i = 5; i < 25; i++) {
        await buffer.write(`item${i}`);
      }

      // Buffer can only hold 10 items, so it contains item15-24
      // Try to look back 20 items from offset 24
      const result = buffer.lookback(24, 20);
      // Should only get the 10 available items
      expect(result.data.length).toBe(10);
      expect(result.data).toEqual([
        'item15',
        'item16',
        'item17',
        'item18',
        'item19',
        'item20',
        'item21',
        'item22',
        'item23',
        'item24',
      ]);
      expect(result.startOffset).toBe(15);
      expect(result.endOffset).toBe(24);
    });

    it('should allow examining data at specific offsets', () => {
      // Look back 1 item from offset 2 to get just item2
      const result1 = buffer.lookback(2, 1);
      expect(result1.data).toEqual(['item2']);
      expect(result1.startOffset).toBe(2);
      expect(result1.endOffset).toBe(2);

      // Look back 1 item from offset 0 to get just item0
      const result2 = buffer.lookback(0, 1);
      expect(result2.data).toEqual(['item0']);
      expect(result2.startOffset).toBe(0);
      expect(result2.endOffset).toBe(0);
    });
  });
});
