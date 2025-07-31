/**
 * High-performance ring buffer with single writer, multiple async readers.
 * Uses double-buffer technique to eliminate wraparound logic.
 * Optimized for performance over safety - assumes buffer is sized appropriately.
 */
export default class RingBuffer {
  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
    this.writeIndex = 0;
    this.sequence = 0;
    this.nextReaderId = 0;

    // Double buffer: second half mirrors first half for wraparound-free reads
    this.buffer = new Array(maxSize * 2);

    // Reader tracking - Map for O(1) lookups
    this.readers = new Map(); // readerId -> lastReadSequence

    // Notification system for blocking reads
    this.waitingReaders = new Set(); // Set of { resolve, readerId, batchSize? }
  }

  /**
   * Register a new reader.
   * @returns {string} Reader ID
   */
  registerReader() {
    const readerId = `r${this.nextReaderId++}`;
    this.readers.set(readerId, -1);
    return readerId;
  }

  /**
   * Unregister a reader.
   * @param {string} readerId
   */
  unregisterReader(readerId) {
    this.readers.delete(readerId);
    // Remove any waiting operations for this reader
    for (const waiter of this.waitingReaders) {
      if (waiter.readerId === readerId) {
        if (waiter.batchSize) {
          waiter.resolve({ data: [], startOffset: 0, lastOffset: -1 });
        } else {
          waiter.resolve({ data: null, offset: -1 });
        }
        this.waitingReaders.delete(waiter);
      }
    }
  }

  /**
   * Write data to buffer (single writer only).
   * @param {any} data
   * @returns {number} Sequence number
   */
  write(data) {
    const seq = this.sequence++;
    const idx = this.writeIndex;

    // Write to both positions (main and mirror)
    this.buffer[idx] = data;
    this.buffer[idx + this.maxSize] = data;

    this.writeIndex = (this.writeIndex + 1) % this.maxSize;

    // Notify waiting readers
    this._notifyWaiters(seq);

    return seq;
  }

  /**
   * Read latest data for a reader (blocks until available).
   * @param {string} readerId
   * @returns {Promise<{data: any, offset: number}>}
   */
  read(readerId) {
    const lastSeq = this.readers.get(readerId);
    if (lastSeq === undefined) {
      throw new Error(`Reader ${readerId} not registered`);
    }

    // Check if new data is available
    if (this.sequence > lastSeq + 1) {
      const nextSeq = lastSeq + 1;
      const data = this._getDataAtSequence(nextSeq);
      this.readers.set(readerId, nextSeq);
      return Promise.resolve({ data, offset: nextSeq });
    }

    // No data available, wait for it
    return new Promise((resolve) => {
      this.waitingReaders.add({ resolve, readerId });
    });
  }

  /**
   * Read batch of data (blocks until batch is full or timeout).
   * @param {string} readerId
   * @param {number} batchSize - Maximum number of items to read
   * @param {number} [timeoutMs] - Optional timeout in ms to return partial batch
   * @returns {Promise<{data: any[], startOffset: number, lastOffset: number}>}
   */
  readBatch(readerId, batchSize, timeoutMs) {
    const lastSeq = this.readers.get(readerId);
    if (lastSeq === undefined) {
      throw new Error(`Reader ${readerId} not registered`);
    }

    const availableCount = this.sequence - (lastSeq + 1);

    // If we have enough for a full batch, return immediately
    if (availableCount >= batchSize) {
      const result = this._readBatchSync(readerId, batchSize);
      return Promise.resolve(result);
    }

    // If timeout is specified and we're waiting for more data
    if (timeoutMs !== undefined) {
      // If timeout is 0 and we have some data, return immediately
      if (timeoutMs === 0 && availableCount > 0) {
        const result = this._readBatchSync(readerId, availableCount);
        return Promise.resolve(result);
      }

      // Wait for full batch OR timeout
      return new Promise((resolve) => {
        const waiter = { resolve, readerId, batchSize };
        this.waitingReaders.add(waiter);

        // Set timeout to return partial batch
        const timeoutId = setTimeout(() => {
          this.waitingReaders.delete(waiter);
          const currentAvailable = this.sequence - (this.readers.get(readerId) + 1);
          if (currentAvailable > 0) {
            const result = this._readBatchSync(readerId, Math.min(currentAvailable, batchSize));
            resolve(result);
          } else {
            resolve({ data: [], startOffset: 0, lastOffset: -1 });
          }
        }, timeoutMs);

        waiter.timeoutId = timeoutId;
      });
    }

    // No timeout specified - wait for full batch
    return new Promise((resolve) => {
      this.waitingReaders.add({ resolve, readerId, batchSize });
    });
  }

  /**
   * Get data at specific sequence (uses double buffer for wraparound-free access).
   * @private
   */
  _getDataAtSequence(seq) {
    const bufferPos = seq % this.maxSize;
    return this.buffer[bufferPos];
  }

  /**
   * Read batch synchronously when data is available.
   * @private
   */
  _readBatchSync(readerId, batchSize) {
    const lastSeq = this.readers.get(readerId);
    const startSeq = lastSeq + 1;
    const startPos = startSeq % this.maxSize;

    // Use double buffer to avoid wraparound logic
    const batch = this.buffer.slice(startPos, startPos + batchSize);

    this.readers.set(readerId, lastSeq + batchSize);
    return { data: batch, startOffset: startSeq, lastOffset: lastSeq + batchSize };
  }

  /**
   * Notify waiting readers when new data arrives.
   * @private
   */
  _notifyWaiters(newSeq) {
    const toRemove = [];

    for (const waiter of this.waitingReaders) {
      const { resolve, readerId, batchSize } = waiter;
      const lastSeq = this.readers.get(readerId);

      if (lastSeq === undefined) continue; // Reader was unregistered

      if (batchSize) {
        // Batch reader
        const availableCount = newSeq - lastSeq;
        if (availableCount >= batchSize) {
          const result = this._readBatchSync(readerId, batchSize);
          resolve(result);
          toRemove.push(waiter);
          // Clear timeout if set
          if (waiter.timeoutId) {
            clearTimeout(waiter.timeoutId);
          }
        }
      } else {
        // Single reader
        if (newSeq > lastSeq) {
          const nextSeq = lastSeq + 1;
          const data = this._getDataAtSequence(nextSeq);
          this.readers.set(readerId, nextSeq);
          resolve({ data, offset: nextSeq });
          toRemove.push(waiter);
        }
      }
    }

    // Remove resolved waiters
    for (const waiter of toRemove) {
      this.waitingReaders.delete(waiter);
    }
  }

  /**
   * Get available data count for a reader.
   * @param {string} readerId
   * @returns {number}
   */
  getAvailableCount(readerId) {
    const lastSeq = this.readers.get(readerId);
    return lastSeq === undefined ? 0 : Math.max(0, this.sequence - (lastSeq + 1));
  }

  /**
   * Get buffer statistics.
   * @returns {object}
   */
  getStats() {
    return {
      maxSize: this.maxSize,
      writeIndex: this.writeIndex,
      sequence: this.sequence,
      registeredReaders: this.readers.size,
      waitingReaders: this.waitingReaders.size,
    };
  }

  /**
   * Clear buffer and reset state.
   */
  clear() {
    this.writeIndex = 0;
    this.sequence = 0;
    this.buffer.fill(undefined);

    // Reset reader sequences
    for (const readerId of this.readers.keys()) {
      this.readers.set(readerId, -1);
    }

    // Resolve all waiting readers with empty results
    for (const waiter of this.waitingReaders) {
      if (waiter.batchSize) {
        waiter.resolve({ data: [], startOffset: 0, lastOffset: -1 });
      } else {
        waiter.resolve({ data: null, offset: -1 });
      }
    }
    this.waitingReaders.clear();
  }
}
