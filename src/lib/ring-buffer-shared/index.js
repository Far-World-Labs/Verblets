/**
 * Shared utilities for ring buffer implementations
 * These pure functions can be used by both in-memory and Redis-backed ring buffers
 */

// Calculate available items for a reader
export const calculateAvailable = (sequence, lastReadSequence) =>
  Math.max(0, sequence - (lastReadSequence + 1));

// Check if reader would overflow with given sequence
export const wouldOverflow = (sequence, lastReadSequence, maxSize) =>
  sequence - lastReadSequence > maxSize;

// Calculate buffer position for a sequence
export const bufferPosition = (sequence, maxSize) => sequence % maxSize;

// Execute a write operation with sequence management for in-memory buffer
export const executeWrite = (buffer, sequence, writeIndex, data, maxSize) => {
  const seq = sequence;
  const idx = writeIndex;

  // Write to both positions (main and mirror)
  buffer[idx] = data;
  buffer[idx + maxSize] = data;

  return {
    seq,
    newWriteIndex: (writeIndex + 1) % maxSize,
    newSequence: sequence + 1,
  };
};

// Generate a unique reader ID
export const generateReaderId = (nextId) => `r${nextId}`;

// Validate timeout parameter
export const validateTimeout = (timeout) => {
  if (timeout !== undefined && timeout < 0) {
    throw new Error(`Invalid timeout: ${timeout}ms. Must be non-negative or undefined.`);
  }
};

// Calculate the oldest available sequence given current sequence and buffer size
export const calculateOldestAvailable = (sequence, maxSize) => Math.max(0, sequence - maxSize);

// Validate offset range for lookback operations
export const validateLookbackRange = (fromOffset, sequence) => {
  const maxOffset = sequence - 1;
  if (fromOffset < 0 || fromOffset > maxOffset) {
    return false;
  }
  return true;
};

// Calculate lookback range parameters
export const calculateLookbackRange = (fromOffset, count, sequence, maxSize) => {
  if (count <= 0) {
    return { data: [], startOffset: -1, endOffset: -1, actualCount: 0 };
  }

  const maxOffset = sequence - 1;
  if (fromOffset < 0 || fromOffset > maxOffset) {
    return { data: [], startOffset: -1, endOffset: -1, actualCount: 0 };
  }

  const oldestAvailable = calculateOldestAvailable(sequence, maxSize);
  const endSeq = fromOffset;
  const startSeq = Math.max(oldestAvailable, fromOffset - count + 1);
  const actualCount = endSeq - startSeq + 1;

  if (actualCount <= 0) {
    return { data: [], startOffset: -1, endOffset: -1, actualCount: 0 };
  }

  return {
    startSeq,
    endSeq,
    actualCount,
    startOffset: startSeq,
    endOffset: endSeq,
  };
};

// Create empty result for read operations with details
export const createEmptyReadResult = (details) =>
  details ? { data: [], startOffset: 0, lastOffset: -1 } : [];

// Create read result with data
export const createReadResult = (data, startSeq, lastOffset, details) => {
  if (details) {
    return { data, startOffset: startSeq, lastOffset };
  }
  return data;
};

// Check if fork offset is valid
export const validateForkOffset = (offset, latestSequence) => {
  if (offset < 0 || offset > latestSequence + 1) {
    return false;
  }
  return true;
};

// Redis key utilities
export const createRedisKey = (baseKey, suffix) => `${baseKey}:${suffix}`;

// Redis data structure keys
export const REDIS_KEYS = {
  BUFFER: 'buffer',
  SEQUENCE: 'sequence',
  WRITE_INDEX: 'writeIndex',
  READERS: 'readers',
  READER_OFFSETS: 'reader_offsets',
  WAITING_READS: 'waiting_reads',
  WAITING_WRITERS: 'waiting_writers',
};

// Create Redis keys for a ring buffer instance
export const createRedisKeys = (baseKey) => ({
  buffer: createRedisKey(baseKey, REDIS_KEYS.BUFFER),
  sequence: createRedisKey(baseKey, REDIS_KEYS.SEQUENCE),
  writeIndex: createRedisKey(baseKey, REDIS_KEYS.WRITE_INDEX),
  readers: createRedisKey(baseKey, REDIS_KEYS.READERS),
  readerOffsets: createRedisKey(baseKey, REDIS_KEYS.READER_OFFSETS),
  waitingReads: createRedisKey(baseKey, REDIS_KEYS.WAITING_READS),
  waitingWriters: createRedisKey(baseKey, REDIS_KEYS.WAITING_WRITERS),
});
