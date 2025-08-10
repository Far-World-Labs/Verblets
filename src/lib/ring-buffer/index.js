/**
 * Helper functions for ring buffer calculations
 */

// Calculate available items for a reader
const calculateAvailable = (sequence, lastReadSequence) =>
  Math.max(0, sequence - (lastReadSequence + 1));

// Check if reader would overflow with given sequence
const wouldOverflow = (sequence, lastReadSequence, maxSize) =>
  sequence - lastReadSequence > maxSize;

// Calculate buffer position for a sequence
const bufferPosition = (sequence, maxSize) => sequence % maxSize;

// Execute a write operation with sequence management
const executeWrite = (buffer, sequence, writeIndex, data, maxSize) => {
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

/**
 * Reader instance for reading from a RingBuffer.
 */
class Reader {
  constructor(ringBuffer, id, offset = -1) {
    this.ringBuffer = ringBuffer;
    this.id = id;
    this.offset = offset;
    this.paused = false;
  }

  /**
   * Take messages (non-blocking).
   * @param {number} [count=1] - Number of messages to take
   * @returns {Promise<Array>} Array of messages
   */
  take(count = 1) {
    return this.ringBuffer._take(this, count, { timeout: 0 });
  }

  /**
   * Take messages with timeout.
   * @param {number} count - Number of messages to take
   * @param {number} timeout - Timeout in ms (undefined = wait forever)
   * @returns {Promise<Array>} Array of messages
   */
  takeOrWait(count, timeout) {
    return this.ringBuffer._take(this, count, { timeout });
  }

  /**
   * Take messages with detailed offset information.
   * @param {number} [count=1] - Number of messages to take
   * @param {object} [options] - Options including timeout
   * @returns {Promise<{data: Array, startOffset: number, lastOffset: number}>}
   */
  read(count = 1, options = {}) {
    return this.ringBuffer._take(this, count, { ...options, details: true });
  }

  /**
   * Get current lag (messages behind).
   * @returns {number}
   */
  lag() {
    return calculateAvailable(this.ringBuffer.sequence, this.offset);
  }

  /**
   * Update position.
   * @param {number} newOffset - New offset
   * @returns {boolean} true if successful
   */
  ack(newOffset) {
    if (newOffset <= this.offset) return false;
    this.offset = newOffset;
    return true;
  }

  /**
   * Pause this reader.
   * @returns {boolean} true if paused
   */
  pause() {
    if (this.paused) return false;
    this.paused = true;
    return true;
  }

  /**
   * Unpause this reader.
   * @returns {boolean} true if unpaused
   */
  unpause() {
    if (!this.paused) return false;
    this.paused = false;
    this.ringBuffer._processWaitingWriters();
    return true;
  }

  /**
   * Fork this reader.
   * @param {number} [offset] - Starting offset (defaults to current position)
   * @returns {Reader} New reader
   */
  fork(offset) {
    const startOffset = offset !== undefined ? offset : this.offset + 1;
    if (startOffset < 0 || startOffset > this.ringBuffer.latest() + 1) {
      throw new Error(`Cannot fork at offset ${startOffset}: out of range`);
    }
    return this.ringBuffer.reader(startOffset);
  }

  /**
   * Look back at recent messages without consuming them.
   * @param {number} n - Number of messages to look back
   * @param {number} [fromOffset] - Offset to look back from (defaults to reader's current offset)
   * @returns {Array} Array of messages
   */
  lookback(n, fromOffset) {
    // If no fromOffset provided, use the reader's current offset
    if (fromOffset === undefined) {
      fromOffset = this.offset;
    }
    return this.ringBuffer.lookback(n, fromOffset);
  }

  /**
   * Close this reader.
   */
  close() {
    this.ringBuffer._removeReader(this);
  }
}

/**
 * High-performance ring buffer with single writer, multiple async readers.
 * Uses double-buffer technique to eliminate wraparound logic.
 * Reader-friendly API with object-oriented readers.
 */
export default class RingBuffer {
  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
    this.writeIndex = 0;
    this.sequence = 0;
    this.nextReaderId = 0;

    // Double buffer: second half mirrors first half for wraparound-free reads
    this.buffer = new Array(maxSize * 2);

    // Reader tracking
    this.readers = new Set();
    this.oldestReaderOffset = undefined; // Cache oldest reader offset

    // Notification system for blocking reads
    this.waitingReads = new Set(); // Set of { resolve, reader, count, options }

    // Notification system for blocking writes
    this.waitingWriters = []; // Array of { resolve, reject, data, options }
  }

  /**
   * Create a new reader.
   * @param {number} [startOffset] - Optional starting offset
   * @returns {Reader} Reader instance
   */
  reader(startOffset) {
    const id = `r${this.nextReaderId++}`;
    const offset = startOffset !== undefined ? startOffset - 1 : -1;
    const reader = new Reader(this, id, offset);
    this.readers.add(reader);
    this._updateOldestReaderOffset();
    return reader;
  }

  /**
   * Write data to buffer (async, blocks if paused readers would overflow).
   * @param {any} data
   * @param {object} [options]
   * @param {boolean} [options.force] - Skip overflow check
   * @returns {Promise<number>} Sequence number
   */
  write(data, options = {}) {
    // Force write bypasses all checks
    if (options.force) return Promise.resolve(this._writeSync(data));

    // Fast path: check cached oldest reader offset
    if (
      this.oldestReaderOffset !== undefined &&
      wouldOverflow(this.sequence, this.oldestReaderOffset, this.maxSize)
    ) {
      return new Promise((resolve, reject) => {
        this.waitingWriters.push({ resolve, reject, data, options });
      });
    }

    return Promise.resolve(this._writeSync(data));
  }

  /**
   * Write data to buffer synchronously (throws on overflow).
   * @param {any} data
   * @param {object} [options]
   * @param {boolean} [options.force] - Skip overflow check
   * @returns {number} Sequence number
   */
  writeSync(data, options = {}) {
    // Force write bypasses all checks
    if (options.force) return this._writeSync(data);

    // Check for overflow on any reader
    if (
      this.oldestReaderOffset !== undefined &&
      wouldOverflow(this.sequence, this.oldestReaderOffset, this.maxSize)
    ) {
      const lag = this.sequence - this.oldestReaderOffset;
      throw new Error(
        `Ring buffer overflow: reader is ${lag} messages behind (max: ${this.maxSize}). Consider increasing buffer size or consuming faster.`
      );
    }

    return this._writeSync(data);
  }

  /**
   * Look backwards from a given offset to retrieve messages.
   * @param {number} n - Number of messages to retrieve
   * @param {number} fromOffset - The offset to look backwards from (exclusive). If not provided, uses latest offset
   * @returns {Array} Array of messages
   */
  lookback(n, fromOffset) {
    // If no fromOffset provided, use the latest offset
    if (fromOffset === undefined) {
      fromOffset = this.sequence - 1;
    }

    // Validate inputs
    if (n <= 0) {
      return [];
    }

    // fromOffset must be within valid range
    const maxOffset = this.sequence - 1;
    if (fromOffset < 0 || fromOffset > maxOffset) {
      return [];
    }

    // Calculate the oldest sequence we can access
    const oldestAvailable = Math.max(0, this.sequence - this.maxSize);

    // Calculate actual start position (looking backwards from fromOffset)
    const endSeq = fromOffset;
    const startSeq = Math.max(oldestAvailable, fromOffset - n + 1);
    const actualCount = endSeq - startSeq + 1;

    if (actualCount <= 0) {
      return [];
    }

    // Get the data
    const startPos = bufferPosition(startSeq, this.maxSize);
    const data = this.buffer.slice(startPos, startPos + actualCount);

    return data;
  }

  /**
   * Get buffer statistics.
   * @returns {object}
   */
  stats() {
    return {
      maxSize: this.maxSize,
      writeIndex: this.writeIndex,
      sequence: this.sequence,
      readers: this.readers.size,
      waitingReads: this.waitingReads.size,
      waitingWriters: this.waitingWriters.length,
    };
  }

  /**
   * Get the latest sequence number.
   * @returns {number}
   */
  latest() {
    return this.sequence - 1;
  }

  /**
   * Clear buffer and reset state.
   */
  clear() {
    this.writeIndex = 0;
    this.sequence = 0;
    this.buffer.fill(undefined);

    // Reset reader offsets
    for (const reader of this.readers) {
      reader.offset = -1;
    }
    this._updateOldestReaderOffset();

    // Resolve all waiting reads with empty results
    for (const waiter of this.waitingReads) {
      const result = waiter.options.details ? { data: [], startOffset: 0, lastOffset: -1 } : [];
      waiter.resolve(result);
      if (waiter.timeoutId) clearTimeout(waiter.timeoutId);
    }
    this.waitingReads.clear();

    // Reject all waiting writers
    this.waitingWriters.forEach((waiter) => waiter.reject(new Error('Ring buffer cleared')));
    this.waitingWriters = [];
  }

  // Private methods

  /**
   * Write data synchronously (for internal use and force writes).
   * @private
   */
  _writeSync(data) {
    const { seq, newWriteIndex, newSequence } = executeWrite(
      this.buffer,
      this.sequence,
      this.writeIndex,
      data,
      this.maxSize
    );

    this.writeIndex = newWriteIndex;
    this.sequence = newSequence;

    // Notify waiting readers
    this._notifyWaiters(seq);

    return seq;
  }

  /**
   * Take messages for a reader.
   * @private
   */
  _take(reader, count = 1, options = {}) {
    if (count < 1) {
      return Promise.resolve(options.details ? { data: [], startOffset: 0, lastOffset: -1 } : []);
    }

    const { timeout, details } = options;
    if (timeout !== undefined && timeout < 0) {
      throw new Error(`Invalid timeout: ${timeout}ms. Must be non-negative or undefined.`);
    }

    const availableCount = calculateAvailable(this.sequence, reader.offset);

    // If we have enough messages, return immediately
    if (availableCount >= count) {
      return Promise.resolve(this._takeSync(reader, count, details));
    }

    // If timeout is 0 and we have some data, return partial batch immediately
    if (timeout === 0 && availableCount > 0) {
      return Promise.resolve(this._takeSync(reader, availableCount, details));
    }

    // If no timeout specified, wait for full batch
    if (timeout === undefined) {
      return new Promise((resolve) => {
        this.waitingReads.add({ resolve, reader, count, options });
      });
    }

    // Wait for full batch OR timeout
    return new Promise((resolve) => {
      const waiter = { resolve, reader, count, options };
      this.waitingReads.add(waiter);

      // Set timeout to return partial batch
      waiter.timeoutId = setTimeout(() => {
        this.waitingReads.delete(waiter);

        const currentAvailable = calculateAvailable(this.sequence, reader.offset);
        if (currentAvailable > 0) {
          resolve(this._takeSync(reader, Math.min(currentAvailable, count), details));
        } else {
          resolve(details ? { data: [], startOffset: 0, lastOffset: -1 } : []);
        }
      }, timeout);
    });
  }

  /**
   * Take messages synchronously when available.
   * @private
   */
  _takeSync(reader, count, details) {
    const startSeq = reader.offset + 1;
    const startPos = bufferPosition(startSeq, this.maxSize);

    // Use double buffer to avoid wraparound logic
    const data = this.buffer.slice(startPos, startPos + count);

    reader.offset += count;

    // Update cached oldest offset if this reader was the slowest
    if (this.oldestReaderOffset === reader.offset - count) {
      this._updateOldestReaderOffset();
    }

    if (details) {
      return { data, startOffset: startSeq, lastOffset: reader.offset };
    }
    return data;
  }

  /**
   * Remove a reader.
   * @private
   */
  _removeReader(reader) {
    this.readers.delete(reader);
    this._updateOldestReaderOffset();

    // Cancel any waiting operations
    for (const waiter of this.waitingReads) {
      if (waiter.reader !== reader) continue;

      const result = waiter.options.details ? { data: [], startOffset: 0, lastOffset: -1 } : [];
      waiter.resolve(result);
      if (waiter.timeoutId) clearTimeout(waiter.timeoutId);
      this.waitingReads.delete(waiter);
    }
  }

  /**
   * Notify waiting readers when new data arrives.
   * @private
   */
  _notifyWaiters(newSeq) {
    if (!this.waitingReads.size) return;

    const toRemove = [];

    for (const waiter of this.waitingReads) {
      const { resolve, reader, count, options } = waiter;

      // Check if reader was removed
      if (!this.readers.has(reader)) continue;

      // Check if we have enough data for this waiter
      const availableCount = newSeq - reader.offset;
      if (availableCount < count) continue;

      resolve(this._takeSync(reader, count, options.details));
      toRemove.push(waiter);
      if (waiter.timeoutId) clearTimeout(waiter.timeoutId);
    }

    // Remove resolved waiters
    toRemove.forEach((waiter) => this.waitingReads.delete(waiter));
  }

  /**
   * Update the cached oldest reader offset.
   * @private
   */
  _updateOldestReaderOffset() {
    if (!this.readers.size) {
      this.oldestReaderOffset = undefined;
      this._processWaitingWriters();
      return;
    }

    const newOldest = Math.min(...Array.from(this.readers).map((r) => r.offset));
    const changed = this.oldestReaderOffset !== newOldest;
    this.oldestReaderOffset = newOldest;

    // If oldest moved forward, check waiting writers
    if (changed) {
      this._processWaitingWriters();
    }
  }

  /**
   * Process waiting writers after a reader resumes.
   * @private
   */
  _processWaitingWriters() {
    if (!this.waitingWriters.length) return;

    this.waitingWriters = this.waitingWriters.filter((waiter) => {
      // Check if write would still overflow
      if (
        this.oldestReaderOffset !== undefined &&
        wouldOverflow(this.sequence, this.oldestReaderOffset, this.maxSize)
      ) {
        return true; // Keep in queue
      }

      try {
        const seq = this._writeSync(waiter.data);
        waiter.resolve(seq);
        return false; // Remove from queue
      } catch (error) {
        waiter.reject(error);
        return false; // Remove from queue
      }
    });
  }
}
