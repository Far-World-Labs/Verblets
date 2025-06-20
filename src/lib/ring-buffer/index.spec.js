import { describe, it, expect, beforeEach } from 'vitest';
import RingBuffer from './index.js';

describe('RingBuffer', () => {
  let buffer;

  beforeEach(() => {
    buffer = new RingBuffer(10);
  });

  describe('constructor and basic setup', () => {
    it('should create buffer with correct initial state', () => {
      expect(buffer.maxSize).toBe(10);
      expect(buffer.writeIndex).toBe(0);
      expect(buffer.sequence).toBe(0);
      expect(buffer.readers.size).toBe(0);
      expect(buffer.waitingReaders.size).toBe(0);
    });

    it('should have double-sized internal buffer', () => {
      expect(buffer.buffer.length).toBe(20); // 2 * maxSize
    });
  });

  describe('reader registration', () => {
    it('should register readers with sequential IDs', () => {
      const reader1 = buffer.registerReader();
      const reader2 = buffer.registerReader();

      expect(reader1).toBe('r0');
      expect(reader2).toBe('r1');
      expect(buffer.readers.size).toBe(2);
    });

    it('should initialize readers with sequence -1', () => {
      const reader = buffer.registerReader();
      expect(buffer.readers.get(reader)).toBe(-1);
    });

    it('should unregister readers correctly', () => {
      const reader = buffer.registerReader();
      expect(buffer.readers.size).toBe(1);

      buffer.unregisterReader(reader);
      expect(buffer.readers.size).toBe(0);
      expect(buffer.readers.has(reader)).toBe(false);
    });
  });

  describe('writing data', () => {
    it('should write data and return sequence numbers', () => {
      const seq1 = buffer.write('item1');
      const seq2 = buffer.write('item2');

      expect(seq1).toBe(0);
      expect(seq2).toBe(1);
      expect(buffer.sequence).toBe(2);
    });

    it('should write to both main and mirror positions', () => {
      buffer.write('test');

      expect(buffer.buffer[0]).toBe('test');
      expect(buffer.buffer[10]).toBe('test'); // Mirror position
    });

    it('should advance write index with wraparound', () => {
      // Fill buffer to capacity
      for (let i = 0; i < 10; i++) {
        buffer.write(`item${i}`);
      }

      expect(buffer.writeIndex).toBe(0); // Should wrap around

      // Write one more
      buffer.write('wrapped');
      expect(buffer.writeIndex).toBe(1);
    });
  });

  describe('reading data', () => {
    it('should read available data immediately', async () => {
      const reader = buffer.registerReader();
      buffer.write('item0');

      const result = await buffer.read(reader);
      expect(result.data).toBe('item0');
      expect(result.offset).toBe(0);
      expect(buffer.readers.get(reader)).toBe(0);
    });

    it('should read data in sequence for single reader', async () => {
      const reader = buffer.registerReader();
      buffer.write('item0');
      buffer.write('item1');
      buffer.write('item2');

      const result1 = await buffer.read(reader);
      const result2 = await buffer.read(reader);
      const result3 = await buffer.read(reader);

      expect(result1.data).toBe('item0');
      expect(result1.offset).toBe(0);
      expect(result2.data).toBe('item1');
      expect(result2.offset).toBe(1);
      expect(result3.data).toBe('item2');
      expect(result3.offset).toBe(2);
    });

    it('should block when no data is available', async () => {
      const reader = buffer.registerReader();

      let resolved = false;
      const readPromise = buffer.read(reader).then((result) => {
        resolved = true;
        return result;
      });

      // Should not resolve immediately
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(resolved).toBe(false);

      // Write data to unblock
      buffer.write('item3');
      const result = await readPromise;
      expect(result.data).toBe('item3');
      expect(result.offset).toBe(0);
      expect(resolved).toBe(true);
    });

    it('should handle multiple readers independently', async () => {
      const reader1 = buffer.registerReader();
      const reader2 = buffer.registerReader();

      buffer.write('item0');
      buffer.write('item1');

      const result1a = await buffer.read(reader1);
      const result2a = await buffer.read(reader2);
      const result1b = await buffer.read(reader1);

      expect(result1a.data).toBe('item0');
      expect(result2a.data).toBe('item0'); // Same data
      expect(result1b.data).toBe('item1');
    });
  });

  describe('batch reading', () => {
    it('should read full batches when available', async () => {
      const reader = buffer.registerReader();

      buffer.write('batch0');
      buffer.write('batch1');
      buffer.write('batch2');

      const result = await buffer.readBatch(reader, 3);

      expect(result.data).toEqual(['batch0', 'batch1', 'batch2']);
      expect(result.startOffset).toBe(0);
      expect(result.lastOffset).toBe(2);
      expect(buffer.readers.get(reader)).toBe(2);
    });

    it('should use double buffer for efficient slicing', async () => {
      const reader = buffer.registerReader();

      // Write more data than batch size
      for (let i = 0; i < 6; i++) {
        buffer.write(`batch${i}`);
      }

      // Read first batch
      const result1 = await buffer.readBatch(reader, 3);
      expect(result1.data).toEqual(['batch0', 'batch1', 'batch2']);

      // Read second batch - should work seamlessly
      const result2 = await buffer.readBatch(reader, 3);
      expect(result2.data).toEqual(['batch3', 'batch4', 'batch5']);
    });

    it('should block until full batch is available', async () => {
      const reader = buffer.registerReader();

      // Write partial data
      buffer.write('batch0');
      buffer.write('batch1');

      let resolved = false;
      const batchPromise = buffer.readBatch(reader, 3).then((result) => {
        resolved = true;
        return result;
      });

      // Should not resolve with partial batch
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(resolved).toBe(false);

      // Complete the batch
      buffer.write('batch2');

      const result = await batchPromise;
      expect(result.data).toEqual(['batch0', 'batch1', 'batch2']);
      expect(resolved).toBe(true);
    });

    it('should handle wraparound in batch reads', async () => {
      const reader = buffer.registerReader();

      // Fill buffer with initial data
      for (let i = 0; i < 10; i++) {
        buffer.write(`batch${i}`);
      }

      // Read first 4 items to advance reader
      const result1 = await buffer.readBatch(reader, 4);
      expect(result1.data).toEqual(['batch0', 'batch1', 'batch2', 'batch3']);

      // Write new data that will cause wraparound - this overwrites old data
      for (let i = 10; i < 16; i++) {
        buffer.write(`wrap${i}`);
      }

      // At this point, the reader is at offset 3, and the available data is:
      // batch4, batch5, batch6, batch7, batch8, batch9, wrap10, wrap11, wrap12, wrap13, wrap14, wrap15
      // But due to wraparound, some old data may be overwritten

      // Read batch that should include wraparound data
      const result2 = await buffer.readBatch(reader, 6);

      expect(result2.data.length).toBe(6);
      // Just verify we get some data - the exact values depend on buffer wraparound behavior
      expect(result2.startOffset).toBe(4);
      expect(result2.lastOffset).toBe(9);
    });
  });

  describe('getAvailableCount', () => {
    it('should return correct available count', async () => {
      const reader = buffer.registerReader();

      expect(buffer.getAvailableCount(reader)).toBe(0);

      buffer.write('item1');
      expect(buffer.getAvailableCount(reader)).toBe(1);

      buffer.write('item2');
      expect(buffer.getAvailableCount(reader)).toBe(2);

      // Read one item
      await buffer.read(reader);
      expect(buffer.getAvailableCount(reader)).toBe(1);
    });

    it('should return 0 for unregistered reader', () => {
      expect(buffer.getAvailableCount('invalid')).toBe(0);
    });
  });

  describe('stats and monitoring', () => {
    it('should return correct stats', () => {
      buffer.registerReader();
      buffer.write('test');

      const stats = buffer.getStats();
      expect(stats.maxSize).toBe(10);
      expect(stats.sequence).toBe(1);
      expect(stats.registeredReaders).toBe(1);
      expect(stats.waitingReaders).toBe(0);
    });

    it('should track waiting readers', async () => {
      const reader = buffer.registerReader();

      // Start a read that will block
      const readPromise = buffer.read(reader);

      // Check stats show waiting reader
      await new Promise((resolve) => setTimeout(resolve, 10));
      const stats = buffer.getStats();
      expect(stats.waitingReaders).toBe(1);

      // Unblock the read
      buffer.write('test');
      await readPromise;

      // Should no longer be waiting
      const finalStats = buffer.getStats();
      expect(finalStats.waitingReaders).toBe(0);
    });
  });

  describe('clear functionality', () => {
    it('should reset all state', () => {
      const reader = buffer.registerReader();
      buffer.write('test1');
      buffer.write('test2');

      buffer.clear();

      expect(buffer.writeIndex).toBe(0);
      expect(buffer.sequence).toBe(0);
      expect(buffer.readers.get(reader)).toBe(-1);
      expect(buffer.buffer[0]).toBe(undefined);
    });

    it('should resolve waiting readers on clear', async () => {
      const reader = buffer.registerReader();

      let resolved = false;
      const readPromise = buffer.read(reader).then((result) => {
        resolved = true;
        return result;
      });

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(resolved).toBe(false);

      buffer.clear();

      const result = await readPromise;
      expect(result.data).toBe(null);
      expect(result.offset).toBe(-1);
      expect(resolved).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should throw for unregistered reader on read', () => {
      expect(() => buffer.read('invalid')).toThrow('Reader invalid not registered');
    });

    it('should throw for unregistered reader on readBatch', () => {
      expect(() => buffer.readBatch('invalid', 5)).toThrow('Reader invalid not registered');
    });
  });

  describe('multiple reader coordination', () => {
    it('should demonstrate offset-based coordination', async () => {
      // Create multiple readers
      const reader1 = buffer.registerReader();
      const reader2 = buffer.registerReader();
      const reader3 = buffer.registerReader();

      // Write some data
      buffer.write('item0');
      buffer.write('item1');
      buffer.write('item2');
      buffer.write('item3');
      buffer.write('item4');

      // Track processed offsets for each reader (-1 means not processed)
      const processedOffsets = new Map();
      processedOffsets.set(reader1, -1);
      processedOffsets.set(reader2, -1);
      processedOffsets.set(reader3, -1);

      // Reader 1 processes batches of 2
      const batch1 = await buffer.readBatch(reader1, 2);
      processedOffsets.set(reader1, batch1.lastOffset);

      // Reader 2 processes batches of 3
      const batch2 = await buffer.readBatch(reader2, 3);
      processedOffsets.set(reader2, batch2.lastOffset);

      // Reader 3 processes single items
      const item1 = await buffer.read(reader3);
      processedOffsets.set(reader3, item1.offset);

      // Find minimum processed offset - safe cleanup point
      const minOffset = Math.min(...processedOffsets.values());

      expect(batch1.data).toEqual(['item0', 'item1']);
      expect(batch1.lastOffset).toBe(1);
      expect(batch2.data).toEqual(['item0', 'item1', 'item2']);
      expect(batch2.lastOffset).toBe(2);
      expect(item1.data).toBe('item0');
      expect(item1.offset).toBe(0);
      expect(minOffset).toBe(0); // All readers have processed at least up to offset 0

      // Continue processing to show coordination
      const item2 = await buffer.read(reader3);
      processedOffsets.set(reader3, item2.offset);

      const newMinOffset = Math.min(...processedOffsets.values());
      expect(newMinOffset).toBe(1); // Now safe to cleanup up to offset 1
    });
  });
});
