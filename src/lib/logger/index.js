/**
 * Logger module with bunyan-like streams
 *
 * Supports multiple output streams:
 * - Console stream
 * - RingBuffer stream
 * - No-op stream
 */

/**
 * Extract file context from stack trace
 * @param {number} stackOffset - Line number in stack (undefined = debug mode)
 */
export function extractFileContext(stackOffset) {
  const stack = new Error().stack;
  const stackLines = stack.split('\n');

  if (stackOffset === undefined) {
    //
    // Debug mode: show full stack trace to determine correct offset
    //
    console.error('\n=== Stack Trace for Debugging ===');
    for (let i = 0; i < stackLines.length; i++) {
      console.error(`[${i}] ${stackLines[i]}`);
    }
    console.error('===\n');
    return { file: 'debug-mode', line: 0 };
  }

  const targetLine = stackLines[stackOffset];
  return targetLine ? parseStackLine(targetLine) : { file: 'unknown', line: 0 };
}

function parseStackLine(stackLine) {
  if (!stackLine) return { file: 'unknown', line: 0 };

  // Try format: "at functionName (/path/to/file.js:10:20)"
  const parenMatch = stackLine.match(/\(([^)]+):(\d+):\d+\)$/);
  if (parenMatch) {
    return {
      file: parenMatch[1],
      line: parseInt(parenMatch[2], 10) || 0,
    };
  }

  // Try format: "at /path/to/file.js:10:20"
  const cleaned = stackLine.trim().replace(/^at\s+/, '');
  const directMatch = cleaned.match(/^([^\s]+):(\d+):\d+$/);
  if (directMatch) {
    return {
      file: directMatch[1],
      line: parseInt(directMatch[2], 10) || 0,
    };
  }

  return { file: 'unknown', line: 0 };
}

/**
 * Console stream - writes logs to console
 */
export const consoleStream = {
  name: 'console',
  write: (entry) => {
    const { level, message, ...data } = entry;
    const hasData = Object.keys(data).length > 0;

    if (level === 'error' || level === 'fatal') {
      if (hasData) {
        console.error(message, data);
      } else {
        console.error(message);
      }
    } else if (level === 'warn') {
      if (hasData) {
        console.warn(message, data);
      } else {
        console.warn(message);
      }
    } else if (level === 'debug' || level === 'trace') {
      if (hasData) {
        console.debug(message, data);
      } else {
        console.debug(message);
      }
    } else {
      if (hasData) {
        console.log(message, data);
      } else {
        console.log(message);
      }
    }
  },
  writeSync: (entry) => {
    const { level, message, ...data } = entry;
    const hasData = Object.keys(data).length > 0;

    if (level === 'error' || level === 'fatal') {
      if (hasData) {
        console.error(message, data);
      } else {
        console.error(message);
      }
    } else if (level === 'warn') {
      if (hasData) {
        console.warn(message, data);
      } else {
        console.warn(message);
      }
    } else if (level === 'debug' || level === 'trace') {
      if (hasData) {
        console.debug(message, data);
      } else {
        console.debug(message);
      }
    } else {
      if (hasData) {
        console.log(message, data);
      } else {
        console.log(message);
      }
    }
  },
};

/**
 * No-op stream - discards all logs
 */
export const noopStream = {
  name: 'noop',
  write: async () => {},
  writeSync: () => {},
};

/**
 * Create a RingBuffer stream
 * @param {RingBuffer} ringBuffer - The RingBuffer instance to write to
 * @param {Object} config - Configuration options
 * @param {Function} config.onError - Error callback function
 */
export function createRingBufferStream(ringBuffer, config = {}) {
  const { onError } = config;

  return {
    name: 'ringbuffer',
    write: async (entry) => {
      try {
        //
        // Write log entry to Redis ring buffer
        //
        await ringBuffer.write(entry);
      } catch (error) {
        if (onError) {
          onError(error);
        }
        throw error;
      }
    },
    writeSync: (entry) => {
      try {
        ringBuffer.writeSync(entry);
      } catch (error) {
        if (onError) {
          onError(error);
        }
        throw error;
      }
    },
  };
}

/**
 * Create a logger instance
 *
 * @param {Object} [options] - Logger options
 * @param {Array} [options.streams=[]] - Array of output streams
 * @param {boolean} [options.includeFileContext=true] - Whether to include file/line info
 * @returns {Object} Logger instance
 */
export function createLogger(options = {}) {
  const { streams = [], includeFileContext = true } = options;

  /**
   * Core async logging function
   */
  async function log(level, data, context) {
    const entry = {
      ts: new Date().toISOString(),
      level,
      ...data,
      ...context,
    };

    // Write to all streams
    const results = await Promise.all(streams.map((stream) => stream.write(entry)));
    return results.length > 0 ? results[0] : true;
  }

  /**
   * Core sync logging function
   */
  function logSync(level, data, { stackOffset } = {}) {
    const entry = {
      ts: new Date().toISOString(),
      level,
      ...data,
    };

    // Add file context if enabled
    if (includeFileContext && !entry.file) {
      const context = extractFileContext(stackOffset);
      entry.file = context.file;
      entry.line = context.line;
    }

    // Write to all streams synchronously
    streams.forEach((stream) => stream.writeSync(entry));
  }

  const createAsyncLogger =
    (level) =>
    (data, options = {}) => {
      const { lineOffset } = options;
      const context = includeFileContext && !data.file ? extractFileContext(lineOffset) : {};
      return log(level, data, context);
    };

  return {
    // Async logging methods - capture context before async boundary
    log: createAsyncLogger('log'),
    info: createAsyncLogger('info'),
    warn: createAsyncLogger('warn'),
    error: createAsyncLogger('error'),
    debug: createAsyncLogger('debug'),
    trace: createAsyncLogger('trace'),
    fatal: createAsyncLogger('fatal'),

    // Sync logging methods
    logSync: (data) => logSync('log', data),
    infoSync: (data, options) => logSync('info', data, options),
    warnSync: (data, options) => logSync('warn', data, options),
    errorSync: (data, options) => logSync('error', data, options),
    debugSync: (data, options) => logSync('debug', data, options),
    traceSync: (data, options) => logSync('trace', data, options),
    fatalSync: (data, options) => logSync('fatal', data, options),

    // Stream management
    streams,
    addStream: (stream) => streams.push(stream),
    removeStream: (name) => {
      const index = streams.findIndex((s) => s.name === name);
      if (index >= 0) streams.splice(index, 1);
    },
  };
}
