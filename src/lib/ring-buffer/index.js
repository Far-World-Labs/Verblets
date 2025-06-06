/**
 * Ring Buffer - Memory-efficient circular buffer for data ingestion and processing
 *
 * A generic ring buffer (circular buffer) that automatically evicts oldest entries when full.
 * Designed for high-throughput data ingestion, lane-based processing, and batch operations
 * where memory efficiency and fast access patterns are critical.
 *
 * Features:
 * - Automatic memory management with configurable size limits
 * - Multiple cursor support for concurrent processing
 * - Lane-based filtering and processing with independent flush loops
 * - Batch operations optimized for various workflows
 * - Slice operations with ID-based and index-based access
 * - Statistics and analysis helpers
 * - Iterator support for streaming operations
 * - Generic data support (not limited to logs)
 */

/**
 * @typedef {Object} RingBufferEntry
 * @property {number} id - Unique incrementing identifier
 * @property {Date} timestamp - When entry was added
 * @property {any} data - The actual data payload
 * @property {Map<string, any>} [meta] - Optional metadata
 */

/**
 * @typedef {Object} DataEntry
 * @property {number} id - Unique incrementing identifier
 * @property {Date} ts - When entry was created
 * @property {any} raw - The raw data payload
 * @property {Object} variables - Extracted/computed variables
 * @property {Object} context - Context information (file, line, etc.)
 * @property {string[]} tags - Classification tags/biomarkers
 * @property {Map<string, any>} meta - Additional metadata
 */

/**
 * @typedef {Object} ProcessingLane
 * @property {string} id - Lane identifier
 * @property {Function} [filter] - Filter function (entry) => boolean
 * @property {Function} writer - Output writer function (lines: string[]) => void
 * @property {Function} [batchHandler] - Batch processing function
 * @property {RingBufferEntry[]} buffer - Pending entries for this lane
 * @property {boolean} flushActive - Whether flush loop is active
 * @property {string} [cursorName] - Associated cursor name for tracking
 * @property {Object} [config] - Lane-specific configuration
 */

/**
 * @typedef {Object} RingBufferCursor
 * @property {string} name - Cursor identifier
 * @property {number} position - Current position (entry ID)
 * @property {Date} lastMoved - When cursor was last updated
 * @property {Map<string, any>} meta - Cursor-specific metadata
 */

/**
 * @typedef {Object} RingBufferStats
 * @property {number} size - Current number of entries
 * @property {number} capacity - Maximum capacity
 * @property {number} totalAdded - Total entries added (including evicted)
 * @property {number} totalEvicted - Total entries evicted
 * @property {number} oldestId - ID of oldest entry in buffer
 * @property {number} newestId - ID of newest entry in buffer
 * @property {Date} oldestTimestamp - Timestamp of oldest entry
 * @property {Date} newestTimestamp - Timestamp of newest entry
 * @property {number} cursors - Number of active cursors
 * @property {number} lanes - Number of active processing lanes
 */

/**
 * @typedef {Object} StableBatch
 * @property {string} batchId - Unique identifier for the batch
 * @property {number} batchIndex - Index of the batch in the sequence
 * @property {number} startId - Starting entry ID (inclusive)
 * @property {number} endId - Ending entry ID (exclusive)
 * @property {number} size - Number of entries in the batch
 * @property {Date} timestamp - When the batch definition was created
 */

/**
 * @typedef {Object} StableBatchResult
 * @property {string} batchId - Unique identifier for the batch
 * @property {StableBatch} batchDef - The batch definition
 * @property {any} result - Result from processing the batch
 * @property {boolean} skipped - Whether the batch was skipped
 * @property {number} entriesProcessed - Number of entries processed
 * @property {number} attempts - Number of processing attempts
 */

/**
 * @typedef {Object} BatchCursorResult
 * @property {boolean} done - Whether iteration is complete
 * @property {RingBufferEntry[]} entries - Entries in the current batch
 * @property {StableBatch|null} batchDef - Batch definition (null if done)
 * @property {boolean} [hasMore] - Whether more batches are available
 */

/**
 * @typedef {Object} BatchCursor
 * @property {string} cursorName - Name of the cursor
 * @property {number} batchSize - Size of each batch
 * @property {string} batchIdPrefix - Prefix for batch IDs
 * @property {Function} next - Get next batch: (moveCursor?: boolean) => BatchCursorResult
 * @property {Function} reset - Reset cursor: (position?: number) => void
 * @property {Function} getStatus - Get cursor status: () => Object
 */

/**
 * @typedef {Object} BatchHandler
 * @property {Function} process - Process batch: (params: {head: number, cursor: number, entries: RingBufferEntry[], batch: RingBufferEntry[]}) => Promise<string[][]> | undefined
 */

export default class RingBuffer {
  constructor(maxSize = 10000) {
    this.maxSize = maxSize;
    this.entries = [];
    this.nextId = 1;
    this.totalAdded = 0;
    this.totalEvicted = 0;
    this.cursors = new Map();
    this.lanes = new Map(); // Processing lanes
  }

  /**
   * Add entry to buffer
   * @param {any} data - Data to store
   * @param {Map<string, any>} [meta] - Entry metadata
   * @returns {RingBufferEntry} The created entry
   */
  push(data, meta = new Map()) {
    const entry = {
      id: this.nextId++,
      ts: new Date(),
      data,
      meta: new Map(meta),
    };

    // Handle eviction if buffer is full
    if (this.entries.length >= this.maxSize) {
      const evicted = this.entries.shift();
      this.totalEvicted++;

      // Update cursors that point to evicted entries
      for (const cursor of this.cursors.values()) {
        if (cursor.position <= evicted.id) {
          cursor.position = evicted.id + 1;
        }
      }
    }

    this.entries.push(entry);
    this.totalAdded++;

    // Process through lanes
    this._processLanes(entry);

    return entry;
  }

  /**
   * Ingest structured data entry (PEC-01 compatible)
   * @param {string} raw - Raw log data
   * @param {Object} [options] - Structured data options
   * @param {Object} [options.variables] - Variable data
   * @param {Object} [options.context] - Context information
   * @param {string[]} [options.tags] - Tags array
   * @param {Map} [options.meta] - Additional metadata
   * @returns {DataEntry} The created structured entry
   */
  ingest(raw, options = {}) {
    const entry = {
      id: this.nextId++,
      ts: new Date(),
      raw,
      variables: options.variables || {},
      context: options.context || { filePath: '', line: 0 },
      tags: options.tags || [],
      meta: options.meta || new Map(),
    };

    // Handle eviction if buffer is full
    if (this.entries.length >= this.maxSize) {
      const evicted = this.entries.shift();
      this.totalEvicted++;

      // Update cursors that point to evicted entries
      for (const cursor of this.cursors.values()) {
        if (cursor.position <= evicted.id) {
          cursor.position = evicted.id + 1;
        }
      }
    }

    this.entries.push(entry);
    this.totalAdded++;

    // Process through lanes
    this._processLanes(entry);

    return entry;
  }

  /**
   * Register a processing lane
   * @param {ProcessingLane} lane - Lane configuration
   * @returns {ProcessingLane} The registered lane
   */
  addLane(lane) {
    const laneConfig = {
      id: lane.id,
      filter: lane.filter,
      writer: lane.writer,
      batchHandler: lane.batchHandler,
      buffer: [],
      flushActive: false,
      cursorName: lane.cursorName || `lane-${lane.id}`,
      config: lane.config || {},
      ...lane,
    };

    this.lanes.set(lane.id, laneConfig);

    // Create cursor for this lane if specified
    if (laneConfig.cursorName) {
      this.setCursor(laneConfig.cursorName, this.nextId - 1);
    }

    return laneConfig;
  }

  /**
   * Remove a processing lane
   * @param {string} laneId - Lane identifier
   * @returns {boolean} True if lane was removed
   */
  removeLane(laneId) {
    const lane = this.lanes.get(laneId);
    if (lane && lane.cursorName) {
      this.removeCursor(lane.cursorName);
    }
    return this.lanes.delete(laneId);
  }

  /**
   * Get processing lane by ID
   * @param {string} laneId - Lane identifier
   * @returns {ProcessingLane|undefined} The lane configuration
   */
  getLane(laneId) {
    return this.lanes.get(laneId);
  }

  /**
   * Get all processing lanes
   * @returns {ProcessingLane[]} Array of all lanes
   */
  getAllLanes() {
    return Array.from(this.lanes.values());
  }

  /**
   * Process entry through all registered lanes
   * @private
   * @param {RingBufferEntry|DataEntry} entry - Entry to process
   */
  _processLanes(entry) {
    for (const lane of this.lanes.values()) {
      // Apply filter if specified
      if (!lane.filter || lane.filter(entry)) {
        lane.buffer.push(entry);

        // Check if we should trigger flush
        const batchSize = lane.config.batchSize || 10;
        if (lane.buffer.length >= batchSize && !lane.flushActive) {
          // Use setTimeout to avoid blocking
          setTimeout(() => this._flushLane(lane), 0);
        }
      }
    }
  }

  /**
   * Flush a processing lane
   * @private
   * @param {ProcessingLane} lane - Lane to flush
   */
  async _flushLane(lane) {
    if (lane.flushActive) return;

    lane.flushActive = true;

    try {
      while (lane.buffer.length > 0) {
        const batchSize = lane.config.batchSize || 10;
        const batch = lane.buffer.slice(0, Math.min(batchSize, lane.buffer.length));

        if (batch.length === 0) break;

        const cursor = batch[batch.length - 1].id;
        let result = batch; // Default to the batch itself

        // Use batch handler if available
        if (lane.batchHandler) {
          const params = {
            head: this.nextId - 1,
            cursor,
            entries: this.entries,
            batch,
          };

          try {
            result = await lane.batchHandler.process(params);
          } catch (error) {
            console.error(`Lane ${lane.id} batch handler error:`, error);
            // Skip this batch on error
            lane.buffer.splice(0, batch.length);
            continue;
          }
        }

        // Write results
        if (lane.writer && result) {
          const lines = Array.isArray(result) ? result.flat() : [String(result)];
          if (lines.length > 0) {
            try {
              await lane.writer(lines);
            } catch (error) {
              console.error(`Lane ${lane.id} writer error:`, error);
            }
          }
        }

        // Remove processed entries from buffer
        lane.buffer.splice(0, batch.length);

        // Update cursor if specified
        if (lane.cursorName) {
          this.moveCursor(lane.cursorName, cursor);
        }

        // If batch was smaller than requested size, we're done
        if (batch.length < batchSize) {
          break;
        }
      }
    } finally {
      lane.flushActive = false;
    }
  }

  /**
   * Manually trigger flush for a specific lane
   * @param {string} laneId - Lane identifier
   * @returns {Promise<void>}
   */
  async flushLane(laneId) {
    const lane = this.lanes.get(laneId);
    if (lane) {
      await this._flushLane(lane);
    }
  }

  /**
   * Manually trigger flush for all lanes
   * @returns {Promise<void>}
   */
  async flushAllLanes() {
    const flushPromises = Array.from(this.lanes.values()).map((lane) => this._flushLane(lane));
    await Promise.all(flushPromises);
  }

  /**
   * Add multiple entries in batch
   * @param {any[]} dataArray - Array of data to add
   * @param {Map<string, any>} [sharedMeta] - Metadata to apply to all entries
   * @returns {RingBufferEntry[]} Array of created entries
   */
  pushBatch(dataArray, sharedMeta = new Map()) {
    const entries = [];
    for (const data of dataArray) {
      entries.push(this.push(data, new Map(sharedMeta)));
    }
    return entries;
  }

  /**
   * Get all entries in buffer (oldest → newest)
   * @returns {RingBufferEntry[]} All entries
   */
  all() {
    return [...this.entries];
  }

  /**
   * Get entries within ID range
   * @param {number} startId - Starting ID (inclusive)
   * @param {number} [endId] - Ending ID (exclusive)
   * @returns {RingBufferEntry[]} Filtered entries
   */
  slice(startId, endId) {
    return this.entries.filter((entry) => {
      return entry.id >= startId && (endId === undefined || entry.id < endId);
    });
  }

  /**
   * Get entries within index range (like Array.slice)
   * @param {number} [start=0] - Start index
   * @param {number} [end] - End index
   * @returns {RingBufferEntry[]} Sliced entries
   */
  sliceByIndex(start = 0, end) {
    return this.entries.slice(start, end);
  }

  /**
   * Get entries within time range
   * @param {Date} startTime - Start time (inclusive)
   * @param {Date} [endTime] - End time (exclusive)
   * @returns {RingBufferEntry[]} Filtered entries
   */
  sliceByTime(startTime, endTime) {
    return this.entries.filter((entry) => {
      const timestamp = entry.timestamp || entry.ts;
      return timestamp >= startTime && (endTime === undefined || timestamp < endTime);
    });
  }

  /**
   * Get the most recent N entries
   * @param {number} count - Number of entries to retrieve
   * @returns {RingBufferEntry[]} Most recent entries (oldest → newest)
   */
  tail(count) {
    return this.entries.slice(-count);
  }

  /**
   * Get the oldest N entries
   * @param {number} count - Number of entries to retrieve
   * @returns {RingBufferEntry[]} Oldest entries
   */
  head(count) {
    return this.entries.slice(0, count);
  }

  /**
   * Find entries matching a predicate
   * @param {Function} predicate - Function to test entries (entry) => boolean
   * @returns {RingBufferEntry[]} Matching entries
   */
  filter(predicate) {
    return this.entries.filter(predicate);
  }

  /**
   * Find first entry matching predicate
   * @param {Function} predicate - Function to test entries
   * @returns {RingBufferEntry|undefined} First matching entry
   */
  find(predicate) {
    return this.entries.find(predicate);
  }

  /**
   * Transform entries using a mapping function
   * @param {Function} mapper - Function to transform entries (entry) => any
   * @returns {any[]} Transformed results
   */
  map(mapper) {
    return this.entries.map(mapper);
  }

  /**
   * Reduce entries to a single value
   * @param {Function} reducer - Reducer function (acc, entry, index) => any
   * @param {any} initialValue - Initial accumulator value
   * @returns {any} Reduced value
   */
  reduce(reducer, initialValue) {
    return this.entries.reduce(reducer, initialValue);
  }

  /**
   * Create or update a cursor for tracking position
   * @param {string} name - Cursor name
   * @param {number} [position] - Position to set (defaults to current newest)
   * @returns {RingBufferCursor} The cursor
   */
  setCursor(name, position) {
    const currentPosition =
      position !== undefined
        ? position
        : this.entries.length > 0
        ? this.entries[this.entries.length - 1].id
        : 0;

    const cursor = {
      name,
      position: currentPosition,
      lastMoved: new Date(),
      meta: new Map(),
    };

    this.cursors.set(name, cursor);
    return cursor;
  }

  /**
   * Get cursor by name
   * @param {string} name - Cursor name
   * @returns {RingBufferCursor|undefined} The cursor
   */
  getCursor(name) {
    return this.cursors.get(name);
  }

  /**
   * Move cursor to new position
   * @param {string} name - Cursor name
   * @param {number} position - New position
   * @returns {RingBufferCursor|undefined} Updated cursor
   */
  moveCursor(name, position) {
    const cursor = this.cursors.get(name);
    if (cursor) {
      cursor.position = position;
      cursor.lastMoved = new Date();
      return cursor;
    }
    return undefined;
  }

  /**
   * Get entries since cursor position
   * @param {string} cursorName - Cursor name
   * @param {boolean} [moveCursor=true] - Whether to move cursor to end
   * @returns {RingBufferEntry[]} Entries since cursor
   */
  getSinceCursor(cursorName, moveCursor = true) {
    const cursor = this.cursors.get(cursorName);
    if (!cursor) {
      return [];
    }

    const entries = this.entries.filter((entry) => entry.id > cursor.position);

    if (moveCursor && entries.length > 0) {
      cursor.position = entries[entries.length - 1].id;
      cursor.lastMoved = new Date();
    }

    return entries;
  }

  /**
   * Process entries in batches with a callback
   * @param {number} batchSize - Size of each batch
   * @param {Function} processor - Function to process each batch (batch, batchIndex) => Promise|any
   * @param {Object} [options] - Processing options
   * @param {number} [options.startIndex=0] - Index to start from
   * @param {number} [options.endIndex] - Index to end at
   * @param {boolean} [options.parallel=false] - Process batches in parallel
   * @returns {Promise<any[]>} Results from each batch
   */
  async processBatches(batchSize, processor, options = {}) {
    const { startIndex = 0, endIndex = this.entries.length, parallel = false } = options;
    const results = [];
    const batches = [];

    // Create batches
    for (let i = startIndex; i < endIndex; i += batchSize) {
      const batch = this.entries.slice(i, Math.min(i + batchSize, endIndex));
      batches.push({ batch, batchIndex: Math.floor(i / batchSize) });
    }

    if (parallel) {
      // Process all batches in parallel
      const promises = batches.map(({ batch, batchIndex }) => processor(batch, batchIndex));
      results.push(...(await Promise.all(promises)));
    } else {
      // Process batches sequentially
      for (const { batch, batchIndex } of batches) {
        const result = await processor(batch, batchIndex);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Create stable batch definitions based on entry IDs (not indices)
   * These batches remain consistent even if the ring buffer window changes
   * @param {number} batchSize - Size of each batch
   * @param {Object} [options] - Batch creation options
   * @param {number} [options.startId] - Starting entry ID (defaults to oldest)
   * @param {number} [options.endId] - Ending entry ID (defaults to newest)
   * @param {string} [options.batchIdPrefix='batch'] - Prefix for batch IDs
   * @returns {StableBatch[]} Array of stable batch definitions
   */
  createStableBatches(batchSize, options = {}) {
    const {
      startId = this.entries.length > 0 ? this.entries[0].id : 0,
      endId = this.entries.length > 0 ? this.entries[this.entries.length - 1].id + 1 : 0,
      batchIdPrefix = 'batch',
    } = options;

    const batches = [];
    let currentId = startId;
    let batchIndex = 0;

    while (currentId < endId) {
      const batchEndId = Math.min(currentId + batchSize, endId);
      batches.push({
        batchId: `${batchIdPrefix}_${batchIndex}`,
        batchIndex,
        startId: currentId,
        endId: batchEndId,
        size: batchEndId - currentId,
        timestamp: new Date(),
      });

      currentId = batchEndId;
      batchIndex++;
    }

    return batches;
  }

  /**
   * Get entries for a stable batch definition
   * @param {StableBatch} batchDef - Stable batch definition
   * @returns {RingBufferEntry[]} Entries in the batch (may be empty if evicted)
   */
  getBatchEntries(batchDef) {
    return this.slice(batchDef.startId, batchDef.endId);
  }

  /**
   * Process stable batches with retry support and cursor tracking
   * @param {number} batchSize - Size of each batch
   * @param {Function} processor - Function to process each batch (entries, batchDef, context) => Promise|any
   * @param {Object} [options] - Processing options
   * @param {string} [options.cursorName] - Cursor name for tracking progress
   * @param {number} [options.startId] - Starting entry ID
   * @param {number} [options.endId] - Ending entry ID
   * @param {boolean} [options.parallel=false] - Process batches in parallel
   * @param {number} [options.maxRetries=3] - Maximum retry attempts per batch
   * @param {number} [options.retryDelay] - Function to calculate retry delay (attempt) => ms
   * @param {Function} [options.onBatchStart] - Callback when batch starts (batchDef) => void
   * @param {Function} [options.onBatchComplete] - Callback when batch completes (batchDef, result) => void
   * @param {Function} [options.onBatchError] - Callback when batch fails (batchDef, error, attempt) => void
   * @param {boolean} [options.skipMissingEntries=false] - Skip batches with no available entries
   * @returns {Promise<StableBatchResult[]>} Results from each batch
   */
  async processStableBatches(batchSize, processor, options = {}) {
    const {
      startId = this.entries.length > 0 ? this.entries[0].id : 1,
      endId = this.nextId,
      cursorName,
      parallel = false,
      maxRetries = 0,
      retryDelay = 100,
      skipMissingEntries = false,
      batchIdPrefix = 'batch',
    } = options;

    // Create stable batch definitions
    const batches = this.createStableBatches(batchSize, {
      startId,
      endId,
      batchIdPrefix,
    });

    // Filter batches based on cursor position if provided
    let batchesToProcess = batches;
    if (cursorName) {
      let cursor = this.getCursor(cursorName);
      if (!cursor) {
        // Create cursor if it doesn't exist
        cursor = this.setCursor(cursorName, startId - 1);
      }
      batchesToProcess = batches.filter((batch) => batch.startId > cursor.position);
    }

    const processBatchWithRetry = async (batchDef) => {
      let attempts = 0;
      let lastError;

      // maxRetries means: 1 initial attempt + maxRetries additional attempts
      const maxAttempts = maxRetries + 1;

      while (attempts < maxAttempts) {
        attempts++;
        try {
          const entries = this.getBatchEntries(batchDef);

          // Skip if no entries and skipMissingEntries is true
          if (entries.length === 0 && skipMissingEntries) {
            return {
              batchId: batchDef.batchId,
              batchDef,
              result: null,
              skipped: true,
              entriesProcessed: 0,
              attempts,
            };
          }

          const result = await processor(entries, batchDef, {
            head: this.nextId - 1,
            cursor: batchDef.endId - 1,
            entries: this.entries,
          });

          // Update cursor if provided
          if (cursorName) {
            this.moveCursor(cursorName, batchDef.endId - 1);
          }

          return {
            batchId: batchDef.batchId,
            batchDef,
            result,
            skipped: false,
            entriesProcessed: entries.length,
            attempts,
          };
        } catch (error) {
          lastError = error;
          // Only delay if we have more attempts left
          if (attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, retryDelay * attempts));
          }
        }
      }

      // If we get here, all retries failed
      return {
        batchId: batchDef.batchId,
        batchDef,
        result: null,
        skipped: false,
        entriesProcessed: 0,
        attempts,
        error: lastError,
      };
    };

    // Process batches
    if (parallel) {
      return await Promise.all(batchesToProcess.map(processBatchWithRetry));
    } else {
      const results = [];
      for (const batchDef of batchesToProcess) {
        results.push(await processBatchWithRetry(batchDef));
      }
      return results;
    }
  }

  /**
   * Create a batch cursor for iterating over stable batches
   * @param {string} cursorName - Name for the batch cursor
   * @param {number} batchSize - Size of each batch
   * @param {Object} [options] - Cursor options
   * @param {number} [options.startId] - Starting entry ID
   * @param {string} [options.batchIdPrefix] - Prefix for batch IDs
   * @returns {BatchCursor} Batch cursor for iteration
   */
  createBatchCursor(cursorName, batchSize, options = {}) {
    const { startId, batchIdPrefix = 'batch' } = options;

    // Set initial cursor position
    const initialPosition =
      startId !== undefined ? startId : this.entries.length > 0 ? this.entries[0].id : 0;

    this.setCursor(cursorName, initialPosition);

    return {
      cursorName,
      batchSize,
      batchIdPrefix,

      /**
       * Get the next batch of entries
       * @param {boolean} [moveCursor=true] - Whether to advance the cursor
       * @returns {BatchCursorResult} Next batch result
       */
      next: (moveCursor = true) => {
        const cursor = this.getCursor(cursorName);
        if (!cursor) {
          return { done: true, entries: [], batchDef: null };
        }

        const startId = cursor.position;
        const endId = startId + batchSize;
        const entries = this.slice(startId, endId);

        if (entries.length === 0) {
          return { done: true, entries: [], batchDef: null };
        }

        const batchDef = {
          batchId: `${batchIdPrefix}_${Math.floor(startId / batchSize)}`,
          startId,
          endId: startId + entries.length,
          size: entries.length,
          timestamp: new Date(),
        };

        if (moveCursor) {
          this.moveCursor(cursorName, batchDef.endId);
        }

        return {
          done: false,
          entries,
          batchDef,
          hasMore: this.entries.some((entry) => entry.id >= batchDef.endId),
        };
      },

      /**
       * Reset cursor to beginning or specific position
       * @param {number} [position] - Position to reset to
       */
      reset: (position) => {
        const resetPos =
          position !== undefined ? position : this.entries.length > 0 ? this.entries[0].id : 0;
        this.moveCursor(cursorName, resetPos);
      },

      /**
       * Get cursor status
       * @returns {Object} Cursor status information
       */
      getStatus: () => {
        const cursor = this.getCursor(cursorName);
        const stats = this.getStats();
        return {
          cursorName,
          position: cursor?.position || 0,
          lastMoved: cursor?.lastMoved,
          batchSize,
          remainingEntries: Math.max(0, stats.newestId - (cursor?.position || 0)),
          bufferSize: stats.size,
        };
      },
    };
  }

  /**
   * Create multiple synchronized batch cursors that iterate over the same batches
   * Useful for parallel processing where different workers need identical batch boundaries
   * @param {string[]} cursorNames - Names for the batch cursors
   * @param {number} batchSize - Size of each batch
   * @param {Object} [options] - Cursor options
   * @returns {Object} Map of cursor names to BatchCursor objects
   */
  createSynchronizedBatchCursors(cursorNames, batchSize, options = {}) {
    const cursors = {};

    // Create stable batch definitions first
    const batchDefs = this.createStableBatches(batchSize, options);

    // Create cursors with identical starting positions
    const startPosition =
      options.startId !== undefined
        ? options.startId
        : this.entries.length > 0
        ? this.entries[0].id
        : 0;

    for (const cursorName of cursorNames) {
      this.setCursor(cursorName, startPosition);

      cursors[cursorName] = {
        cursorName,
        batchSize,
        batchDefs,
        currentBatchIndex: 0,

        /**
         * Get the next batch using stable batch definitions
         * @param {boolean} [moveCursor=true] - Whether to advance the cursor
         * @returns {BatchCursorResult} Next batch result
         */
        next: (moveCursor = true) => {
          const cursor = this.getCursor(cursorName);
          if (!cursor || cursors[cursorName].currentBatchIndex >= batchDefs.length) {
            return { done: true, entries: [], batchDef: null };
          }

          const batchDef = batchDefs[cursors[cursorName].currentBatchIndex];
          const entries = this.getBatchEntries(batchDef);

          if (moveCursor) {
            this.moveCursor(cursorName, batchDef.endId - 1);
            cursors[cursorName].currentBatchIndex++;
          }

          return {
            done: false,
            entries,
            batchDef,
            hasMore: cursors[cursorName].currentBatchIndex < batchDefs.length - 1,
          };
        },

        /**
         * Reset cursor to beginning or specific batch
         * @param {number} [batchIndex=0] - Batch index to reset to
         */
        reset: (batchIndex = 0) => {
          cursors[cursorName].currentBatchIndex = Math.max(
            0,
            Math.min(batchIndex, batchDefs.length - 1)
          );
          const batchDef = batchDefs[cursors[cursorName].currentBatchIndex];
          if (batchDef) {
            this.moveCursor(cursorName, batchDef.startId);
          }
        },

        /**
         * Get cursor status
         * @returns {Object} Cursor status information
         */
        getStatus: () => {
          const cursor = this.getCursor(cursorName);
          return {
            cursorName,
            position: cursor?.position || 0,
            lastMoved: cursor?.lastMoved,
            batchSize,
            currentBatchIndex: cursors[cursorName].currentBatchIndex,
            totalBatches: batchDefs.length,
            remainingBatches: batchDefs.length - cursors[cursorName].currentBatchIndex,
          };
        },
      };
    }

    return cursors;
  }

  /**
   * Get buffer statistics
   * @returns {RingBufferStats} Current statistics
   */
  getStats() {
    const size = this.entries.length;
    const oldest = size > 0 ? this.entries[0] : null;
    const newest = size > 0 ? this.entries[size - 1] : null;

    return {
      size,
      capacity: this.maxSize,
      totalAdded: this.totalAdded,
      totalEvicted: this.totalEvicted,
      oldestId: oldest?.id || 0,
      newestId: newest?.id || 0,
      oldestTimestamp: oldest?.timestamp || oldest?.ts || null,
      newestTimestamp: newest?.timestamp || newest?.ts || null,
      cursors: this.cursors.size,
      lanes: this.lanes.size,
    };
  }

  /**
   * Clear all entries and reset counters
   * @param {boolean} [keepCursors=false] - Whether to keep cursor positions
   * @param {boolean} [keepLanes=false] - Whether to keep processing lanes
   */
  clear(keepCursors = false, keepLanes = false) {
    this.entries = [];
    this.totalAdded = 0;
    this.totalEvicted = 0;

    if (!keepCursors) {
      this.cursors.clear();
    }

    if (!keepLanes) {
      this.lanes.clear();
    } else {
      // Clear lane buffers but keep lane configurations
      for (const lane of this.lanes.values()) {
        lane.buffer = [];
        lane.flushActive = false;
      }
    }
  }

  /**
   * Remove cursor
   * @param {string} name - Cursor name to remove
   * @returns {boolean} True if cursor was removed
   */
  removeCursor(name) {
    return this.cursors.delete(name);
  }

  /**
   * Get all cursor names
   * @returns {string[]} Array of cursor names
   */
  getCursorNames() {
    return Array.from(this.cursors.keys());
  }

  /**
   * Check if buffer is full
   * @returns {boolean} True if at capacity
   */
  isFull() {
    return this.entries.length >= this.maxSize;
  }

  /**
   * Check if buffer is empty
   * @returns {boolean} True if empty
   */
  isEmpty() {
    return this.entries.length === 0;
  }

  /**
   * Get current size
   * @returns {number} Number of entries
   */
  size() {
    return this.entries.length;
  }

  /**
   * Get capacity
   * @returns {number} Maximum capacity
   */
  capacity() {
    return this.maxSize;
  }

  /**
   * Iterator support - allows for...of loops
   * @returns {Iterator<RingBufferEntry>} Iterator over entries
   */
  *[Symbol.iterator]() {
    for (const entry of this.entries) {
      yield entry;
    }
  }

  /**
   * Create a new ring buffer from this one with filtered entries
   * @param {Function} predicate - Filter function
   * @param {number} [maxSize] - Size of new buffer (defaults to same)
   * @returns {RingBuffer} New filtered ring buffer
   */
  createFiltered(predicate, maxSize = this.maxSize) {
    const newBuffer = new RingBuffer(maxSize);
    const filtered = this.entries.filter(predicate);

    for (const entry of filtered) {
      newBuffer.push(entry.data, entry.meta);
    }

    return newBuffer;
  }
}
