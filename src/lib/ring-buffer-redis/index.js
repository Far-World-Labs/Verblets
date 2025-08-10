import {
  calculateAvailable,
  wouldOverflow,
  bufferPosition,
  validateTimeout,
  calculateLookbackRange,
  createRedisKeys,
} from '../ring-buffer-shared/index.js';

// Redis operations as pure functions
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

const getOldestReaderOffset = async (redis, key) => {
  const offsets = await getAllReaderOffsets(redis, key);
  return offsets.length === 0 ? undefined : Math.min(...offsets);
};

// Generate fallback reader ID if none provided
const generateReaderId = () => `reader-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Polling abstraction
const createPoller = (interval = 10) => {
  let timeout = undefined;
  let isRunning = false;

  const start = (fn) => {
    if (isRunning) return;
    isRunning = true;

    const poll = async () => {
      try {
        const shouldContinue = await fn();
        if (shouldContinue && isRunning) {
          timeout = setTimeout(poll, interval);
        } else {
          isRunning = false;
        }
      } catch {
        isRunning = false;
        // Polling error - silently stop to avoid noise
      }
    };

    poll();
  };

  const stop = () => {
    isRunning = false;
    if (timeout) {
      clearTimeout(timeout);
      timeout = undefined;
    }
  };

  return { start, stop, isRunning: () => isRunning };
};

// Redis Reader class
class RedisReader {
  constructor(buffer, id, offset = -1) {
    this.buffer = buffer;
    this.id = id;
    this.offset = offset;
    this.paused = false;
    this.source = 'local';
    this.createdAt = new Date().toISOString();
  }

  // Non-blocking read - returns immediately with available data
  async consume(count = 1) {
    if (count < 1) return [];

    const sequence = await getInt(this.buffer.redis, this.buffer.keys.sequence, 0);
    const available = calculateAvailable(sequence, this.offset);
    const actualCount = Math.min(available, count);

    if (actualCount === 0) return [];

    return this.readMessages(actualCount);
  }

  // Blocking read - waits until count messages are available or timeout
  async await(count, timeoutMs) {
    validateTimeout(timeoutMs);

    const available = await this.getAvailableCount();
    if (available >= count) {
      return this.readMessages(count);
    }

    if (timeoutMs === 0) {
      return available > 0 ? this.readMessages(available) : [];
    }

    return this.waitForMessages(count, timeoutMs);
  }

  async readMessages(count) {
    const startSeq = this.offset + 1;
    const startPos = bufferPosition(startSeq, this.buffer.maxSize);

    // Get data from Redis list
    const endPos = startPos + count - 1;
    const rawData = await this.buffer.redis.lrange(this.buffer.keys.buffer, startPos, endPos);
    const data = rawData.map((item) => JSON.parse(item));

    // Update offset atomically
    this.offset += count;
    await this.buffer.redis.hset(this.buffer.keys.readerOffsets, this.id, this.offset.toString());

    return data;
  }

  waitForMessages(count, timeoutMs) {
    return new Promise((resolve) => {
      const waiter = { resolve, reader: this, count, timeoutMs };
      this.buffer.pendingReads.add(waiter);

      if (timeoutMs) {
        waiter.timeoutId = setTimeout(async () => {
          this.buffer.pendingReads.delete(waiter);
          const available = await this.getAvailableCount();
          resolve(available > 0 ? await this.readMessages(Math.min(available, count)) : []);
        }, timeoutMs);
      }

      this.buffer.readerPoller.start(() => this.buffer.processReaders());
    });
  }

  async getAvailableCount() {
    const sequence = await getInt(this.buffer.redis, this.buffer.keys.sequence, 0);
    return calculateAvailable(sequence, this.offset);
  }

  lag() {
    return this.getAvailableCount();
  }

  async acknowledge(newOffset) {
    if (newOffset <= this.offset) return false;
    this.offset = newOffset;
    await this.buffer.redis.hset(this.buffer.keys.readerOffsets, this.id, newOffset.toString());
    return true;
  }

  pause() {
    if (this.paused) return false;
    this.paused = true;
    return true;
  }

  resume() {
    if (!this.paused) return false;
    this.paused = false;
    this.buffer.writerPoller.start(() => this.buffer.processWriters());
    return true;
  }

  async branch(readerId, offset) {
    const latest = await this.buffer.getLatestSequence();
    const startOffset = offset !== undefined ? offset : this.offset + 1;

    if (startOffset < 0 || startOffset > latest + 1) {
      throw new Error(`Cannot branch at offset ${startOffset}: out of range`);
    }

    return this.buffer.createReader(readerId, startOffset);
  }

  async close() {
    this.buffer.localReaders.delete(this.id);
    await this.buffer.redis.hdel(this.buffer.keys.readerOffsets, this.id);

    // Cancel pending reads for this reader
    for (const waiter of this.buffer.pendingReads) {
      if (waiter.reader !== this) continue;

      waiter.resolve([]);
      if (waiter.timeoutId) clearTimeout(waiter.timeoutId);
      this.buffer.pendingReads.delete(waiter);
    }
  }

  lookback(n, fromOffset) {
    // If no fromOffset provided, use the reader's current offset
    if (fromOffset === undefined) {
      fromOffset = this.offset;
    }
    return this.buffer.lookback(n, fromOffset);
  }

  toJSON() {
    return {
      id: this.id,
      offset: this.offset,
      paused: this.paused,
      source: this.source,
      createdAt: this.createdAt,
      lag: undefined, // Will be populated by getReaders methods
    };
  }
}

// Main Redis Ring Buffer
export default class RedisRingBuffer {
  constructor({ key, redisClient, maxSize = 1000, pollInterval = 10 }) {
    if (!key || !redisClient) {
      throw new Error('Both key and redisClient are required');
    }

    this.key = key;
    this.redis = redisClient;
    this.maxSize = maxSize;
    this.keys = createRedisKeys(key);

    // Local state tracking
    this.localReaders = new Map(); // id -> RedisReader instance
    this.pendingReads = new Set();
    this.pendingWrites = [];

    // Pollers for async coordination
    this.readerPoller = createPoller(pollInterval);
    this.writerPoller = createPoller(pollInterval);
  }

  async initialize() {
    const sequence = await this.redis.get(this.keys.sequence);
    if (sequence !== null && sequence !== undefined) return;

    // Initialize sequence to 0 so first incr() gives us 1, making first write at position 0
    await Promise.all([
      this.redis.set(this.keys.sequence, '0'),
      this.redis.set(this.keys.writeIndex, '0'),
    ]);
  }

  async createReader(readerId, startOffset) {
    await this.initialize();

    // Use provided ID or generate one
    const id = readerId || generateReaderId();

    // Check for collision using Redis atomic operation
    const wasSet = await this.redis.hsetnx(this.keys.readerOffsets, id, '-1');
    if (!wasSet) {
      throw new Error(`Reader ID '${id}' already exists. Choose a different ID.`);
    }

    // Set actual starting offset
    const offset = startOffset !== undefined ? startOffset - 1 : -1;
    const reader = new RedisReader(this, id, offset);

    this.localReaders.set(id, reader);
    await this.redis.hset(this.keys.readerOffsets, id, offset.toString());

    return reader;
  }

  // Get readers (local only by default, or include remote with options)
  async getReaders(options = {}) {
    const { includeRemote = false } = options;
    const sequence = await getInt(this.redis, this.keys.sequence, 0);
    const readers = [];

    // Get local readers
    for (const [, reader] of this.localReaders) {
      const readerInfo = reader.toJSON();
      readerInfo.lag = calculateAvailable(sequence, reader.offset);
      readers.push(readerInfo);
    }

    if (!includeRemote) {
      return readers;
    }

    // Get remote readers (exist in Redis but not locally)
    const allRemoteOffsets = await this.redis.hgetall(this.keys.readerOffsets);
    const localIds = new Set(this.localReaders.keys());

    for (const [id, offsetStr] of Object.entries(allRemoteOffsets)) {
      if (localIds.has(id)) continue; // Skip local readers

      const offset = parseInt(offsetStr);
      readers.push({
        id,
        offset,
        paused: undefined, // Unknown for remote readers
        source: 'remote',
        createdAt: undefined, // Unknown for remote readers
        lag: calculateAvailable(sequence, offset),
      });
    }

    return readers;
  }

  // Get only local readers (alias for clarity)
  getLocalReaders() {
    return this.getReaders({ includeRemote: false });
  }

  // Get all readers (local + remote)
  getAllReaders() {
    return this.getReaders({ includeRemote: true });
  }

  // Non-blocking write - fails immediately if would cause overflow
  async push(data, options = {}) {
    await this.initialize();

    if (options.force) {
      return this.writeData(data);
    }

    const canWrite = await this.checkWriteCapacity();
    if (!canWrite) {
      throw new Error('Write would cause reader overflow');
    }

    return this.writeData(data);
  }

  // Blocking write - waits until space is available
  async publish(data, timeoutMs) {
    await this.initialize();

    const canWrite = await this.checkWriteCapacity();
    if (canWrite) {
      return this.writeData(data);
    }

    if (timeoutMs === 0) {
      throw new Error('Write would cause reader overflow');
    }

    return new Promise((resolve, reject) => {
      this.pendingWrites.push({ resolve, reject, data, timeoutMs });

      if (timeoutMs) {
        setTimeout(() => {
          const index = this.pendingWrites.findIndex((w) => w.data === data);
          if (index >= 0) {
            this.pendingWrites.splice(index, 1);
            reject(new Error('Write timeout'));
          }
        }, timeoutMs);
      }

      this.writerPoller.start(() => this.processWriters());
    });
  }

  async checkWriteCapacity() {
    const [sequence, oldestOffset] = await Promise.all([
      getInt(this.redis, this.keys.sequence, 0),
      getOldestReaderOffset(this.redis, this.keys.readerOffsets),
    ]);

    if (oldestOffset === undefined) return true;
    return !wouldOverflow(sequence, oldestOffset, this.maxSize);
  }

  async writeData(data) {
    // Ensure initialization before writing
    await this.initialize();

    // Atomically increment sequence FIRST to reserve our write position
    const newSequence = await this.redis.incr(this.keys.sequence);
    const currentSequence = newSequence - 1; // Our actual sequence number

    // Calculate write position based on our reserved sequence
    const writeIndex = currentSequence % this.maxSize;
    const newWriteIndex = (writeIndex + 1) % this.maxSize;

    const serializedData = JSON.stringify(data);

    // Ensure buffer list exists and is properly sized
    const bufferLength = await this.redis.llen(this.keys.buffer);
    if (bufferLength < this.maxSize) {
      // Extend buffer to max size using multi for efficiency
      const multi = this.redis.multi();
      for (let i = bufferLength; i < this.maxSize; i++) {
        multi.rpush(this.keys.buffer, '""'); // Empty JSON string placeholder
      }
      await multi.exec();
    }

    // Write data to our reserved position
    await Promise.all([
      this.redis.lset(this.keys.buffer, writeIndex, serializedData),
      this.redis.set(this.keys.writeIndex, newWriteIndex.toString()),
    ]);

    // Notify waiting readers
    this.readerPoller.start(() => this.processReaders());

    return currentSequence;
  }

  async processReaders() {
    if (this.pendingReads.size === 0) return false;

    const sequence = await getInt(this.redis, this.keys.sequence, 0);
    const resolved = [];

    for (const waiter of this.pendingReads) {
      const { reader, count } = waiter;

      if (!this.localReaders.has(reader.id)) {
        waiter.resolve([]);
        resolved.push(waiter);
        continue;
      }

      const available = calculateAvailable(sequence, reader.offset);
      if (available >= count) {
        waiter.resolve(await reader.readMessages(count));
        if (waiter.timeoutId) clearTimeout(waiter.timeoutId);
        resolved.push(waiter);
      }
    }

    resolved.forEach((waiter) => this.pendingReads.delete(waiter));
    return this.pendingReads.size > 0;
  }

  async processWriters() {
    if (this.pendingWrites.length === 0) return false;

    const canWrite = await this.checkWriteCapacity();
    if (!canWrite) return true;

    const processed = [];

    for (const waiter of this.pendingWrites) {
      try {
        const sequence = await this.writeData(waiter.data);
        waiter.resolve(sequence);
        processed.push(waiter);
      } catch (error) {
        waiter.reject(error);
        processed.push(waiter);
      }

      // Check capacity after each write
      if (!(await this.checkWriteCapacity())) break;
    }

    this.pendingWrites = this.pendingWrites.filter((w) => !processed.includes(w));
    return this.pendingWrites.length > 0;
  }

  async lookback(n, fromOffset) {
    await this.initialize();

    const sequence = await getInt(this.redis, this.keys.sequence, 0);

    // If no fromOffset provided, use the latest offset (sequence - 1)
    if (fromOffset === undefined) {
      fromOffset = sequence - 1;
    }

    // Sequence represents the next position to write, so current count is sequence
    const range = calculateLookbackRange(fromOffset, n, sequence, this.maxSize);

    if (range.actualCount === 0) {
      return [];
    }

    const startPos = bufferPosition(range.startSeq, this.maxSize);
    const endPos = startPos + range.actualCount - 1;
    const rawData = await this.redis.lrange(this.keys.buffer, startPos, endPos);
    const data = rawData.map((item) => JSON.parse(item));

    return data;
  }

  async getLatestSequence() {
    const sequence = await getInt(this.redis, this.keys.sequence, 0);
    return sequence - 1; // Return the last written position
  }

  async getStats() {
    await this.initialize();

    const [sequence, writeIndex, allReaders] = await Promise.all([
      getInt(this.redis, this.keys.sequence, 0),
      getInt(this.redis, this.keys.writeIndex),
      this.getAllReaders(),
    ]);

    const localCount = allReaders.filter((r) => r.source === 'local').length;
    const remoteCount = allReaders.filter((r) => r.source === 'remote').length;

    return {
      maxSize: this.maxSize,
      writeIndex,
      sequence,
      readers: {
        total: allReaders.length,
        local: localCount,
        remote: remoteCount,
      },
      pendingReads: this.pendingReads.size,
      pendingWrites: this.pendingWrites.length,
    };
  }

  async clear() {
    // Stop pollers
    this.readerPoller.stop();
    this.writerPoller.stop();

    // Clear Redis data but keep structure
    await Promise.all([
      this.redis.del(this.keys.buffer),
      this.redis.set(this.keys.sequence, '0'),
      this.redis.set(this.keys.writeIndex, '0'),
      this.redis.del(this.keys.readerOffsets),
    ]);

    // Reset local reader offsets
    for (const reader of this.localReaders.values()) {
      reader.offset = -1;
      await this.redis.hset(this.keys.readerOffsets, reader.id, '-1');
    }

    // Resolve pending operations
    for (const waiter of this.pendingReads) {
      waiter.resolve([]);
      if (waiter.timeoutId) clearTimeout(waiter.timeoutId);
    }
    this.pendingReads.clear();

    this.pendingWrites.forEach((waiter) => waiter.reject(new Error('Ring buffer cleared')));
    this.pendingWrites = [];
  }

  async close() {
    // Stop pollers
    this.readerPoller.stop();
    this.writerPoller.stop();

    // Completely remove all Redis keys for this ring buffer instance
    await this.redis.del([
      this.keys.buffer,
      this.keys.sequence,
      this.keys.writeIndex,
      this.keys.readerOffsets,
      this.keys.waitingReads,
      this.keys.waitingWriters,
    ]);

    // Clear local state
    this.localReaders.clear();

    // Resolve pending operations
    for (const waiter of this.pendingReads) {
      waiter.resolve([]);
      if (waiter.timeoutId) clearTimeout(waiter.timeoutId);
    }
    this.pendingReads.clear();

    this.pendingWrites.forEach((waiter) => waiter.reject(new Error('Ring buffer closed')));
    this.pendingWrites = [];
  }

  // Aliases for compatibility and natural API
  reader(readerId, startOffset) {
    return this.createReader(readerId, startOffset);
  }
  write(data, options) {
    return this.push(data, options);
  }
  stats() {
    return this.getStats();
  }
  latest() {
    return this.getLatestSequence();
  }
}
