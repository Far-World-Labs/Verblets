/**
 * Logger module with bunyan-like streams
 *
 * Supports multiple output streams:
 * - Console stream
 * - RingBuffer stream
 * - No-op stream
 */

/**
 * Extract file context information from the call stack
 * @param {number} stackOffset - Additional stack frames to skip
 */
function extractFileContext(stackOffset = 0) {
  const stack = new Error().stack;
  const lines = stack.split('\n');

  // Stack frames to skip:
  // [0] "Error"
  // [1] at extractFileContext
  // [2] at log method (which calls extractFileContext)
  // [3+stackOffset] at the actual caller
  const skipFrames = 3 + stackOffset;

  for (let i = skipFrames; i < lines.length; i++) {
    const line = lines[i];
    // Match both "at functionName (file:line:col)" and "at file:line:col"
    const match = line.match(/at .* \((.+):(\d+):\d+\)/) || line.match(/at (.+):(\d+):\d+/);
    if (match) {
      return {
        file: match[1],
        line: parseInt(match[2], 10),
      };
    }
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
 */
export function createRingBufferStream(ringBuffer) {
  return {
    name: 'ringbuffer',
    write: async (entry) => {
      try {
        await ringBuffer.write(entry);
      } catch (error) {
        console.error('RingBufferStream write error:', error);
        throw error;
      }
    },
    writeSync: (entry) => {
      try {
        ringBuffer.writeSync(entry);
      } catch (error) {
        console.error('RingBufferStream writeSync error:', error);
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
    await Promise.all(streams.map((stream) => stream.write(entry)));
  }

  /**
   * Core sync logging function
   */
  function logSync(level, data, { stackOffset = 0 } = {}) {
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

  return {
    // Async logging methods - capture context before async boundary
    log: (data) => {
      const context = includeFileContext && !data.file ? extractFileContext(0) : {};
      return log('log', data, context);
    },
    info: (data) => {
      const context = includeFileContext && !data.file ? extractFileContext(0) : {};
      return log('info', data, context);
    },
    warn: (data) => {
      const context = includeFileContext && !data.file ? extractFileContext(0) : {};
      return log('warn', data, context);
    },
    error: (data) => {
      const context = includeFileContext && !data.file ? extractFileContext(0) : {};
      return log('error', data, context);
    },
    debug: (data) => {
      const context = includeFileContext && !data.file ? extractFileContext(0) : {};
      return log('debug', data, context);
    },
    trace: (data) => {
      const context = includeFileContext && !data.file ? extractFileContext(0) : {};
      return log('trace', data, context);
    },
    fatal: (data) => {
      const context = includeFileContext && !data.file ? extractFileContext(0) : {};
      return log('fatal', data, context);
    },

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
