/**
 * Progress event system for chains and verblets.
 *
 * Three event kinds:
 *   kind: 'event'     — meaningful moments (start, complete, error, emit)
 *                        lifecycle, decisions, phase transitions, traces
 *   kind: 'operation' — mechanical progress (progress)
 *                        batch tracking, retry mechanics
 *   kind: 'telemetry' — dimensional metrics (metrics, measure)
 *                        token counts, durations, delays
 *
 * Log-like events (kind: 'event') carry level, message, and at when
 * appropriate. Operation and telemetry events carry structured data
 * without log properties unless the caller explicitly adds them
 * (e.g., retry operation events carry level/message for narrative value).
 *
 * Anchor events (start, complete, error) carry an `id` field equal to
 * the emitter's spanId. Child events reference anchors via the existing
 * spanId/parentSpanId trace tree.
 *
 * Trace context (OTel-aligned):
 *   traceId    — correlates all events from one top-level chain call
 *   spanId     — identifies this emitter's lifecycle
 *   parentSpanId — the spanId of the calling chain
 *
 * Default export:
 *   createProgressEmitter(name, callback, options)
 *     → { start, emit, progress, metrics, complete, error, batch, measure }
 *
 * Named exports:
 *   scopePhase(callback, phase) — compose phase paths for sub-chain delegation
 *   storeContent(contentStore, key, value) — store large content, return $ref
 *   traceId() — generate 32-hex-char trace ID
 *   spanId() — generate 16-hex-char span ID
 */

import libraryVersion from '../version/index.js';
import { Kind, Level, StatusCode, ChainEvent, OpEvent } from './constants.js';

/**
 * Patterns that identify stack frames internal to the progress/logger modules.
 * Walking skips these to land on the first external caller.
 */
const INTERNAL_PATTERNS = [
  'progress/index.js',
  'logger/index.js',
];

/**
 * Parse a single stack line into { file, line }.
 * Handles V8 ("at fn (/path:L:C)", "at /path:L:C") and
 * JSC/Safari ("fn@/path:L:C") formats for isomorphic support.
 */
function parseStackLine(line) {
  // V8: "at fn (/path/file.js:10:20)"
  const parenMatch = line.match(/\(([^)]+):(\d+):\d+\)$/);
  if (parenMatch) return { file: parenMatch[1], line: parseInt(parenMatch[2], 10) || 0 };
  // V8: "at /path/file.js:10:20"
  const cleaned = line.trim().replace(/^at\s+/, '');
  const directMatch = cleaned.match(/^([^\s]+):(\d+):\d+$/);
  if (directMatch) return { file: directMatch[1], line: parseInt(directMatch[2], 10) || 0 };
  // JSC/Safari: "functionName@/path/file.js:10:20" or "@/path/file.js:10:20"
  const jscMatch = line.match(/@([^@]+):(\d+):\d+$/);
  if (jscMatch) return { file: jscMatch[1], line: parseInt(jscMatch[2], 10) || 0 };
  return undefined;
}

/**
 * Walk a pre-captured stack string to find the first frame outside internal modules.
 * Falls back to the first parseable frame if nothing external is found.
 * @param {string} stack - Pre-captured Error().stack string
 */
function resolveCallerFromStack(stack) {
  const lines = stack?.split('\n') ?? [];
  let firstParsed;
  // Start at 1 to skip the "Error" line itself
  for (let i = 1; i < lines.length; i++) {
    const parsed = parseStackLine(lines[i]);
    if (!parsed) continue;
    if (!firstParsed) firstParsed = parsed;
    const isInternal = INTERNAL_PATTERNS.some((p) => parsed.file.endsWith(p));
    if (!isInternal) return parsed;
  }
  return firstParsed ?? { file: 'unknown', line: 0 };
}

/** Generate a random hex ID. 16 chars for spanId, 32 for traceId. */
function hexId(bytes) {
  const arr = new Uint8Array(bytes);
  (globalThis.crypto ?? {}).getRandomValues?.(arr);
  if (!arr.some(Boolean)) {
    for (let i = 0; i < bytes; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** 32-hex-char trace ID (OTel convention: 16 bytes). */
export function traceId() {
  return hexId(16);
}

/** 16-hex-char span ID (OTel convention: 8 bytes). */
export function spanId() {
  return hexId(8);
}

/**
 * Store large content in a content store, returning a $ref object.
 * Falls back to truncation when no store is available.
 *
 * @param {Object} [contentStore] - KV store with async set(key, value)
 * @param {string} key - Storage key
 * @param {*} value - Content to store
 * @returns {Promise<Object|*>} { $ref: key } if stored, truncated preview if large, or value as-is
 */
export async function storeContent(contentStore, key, value) {
  if (contentStore && typeof contentStore.set === 'function') {
    await contentStore.set(key, value);
    return { $ref: key };
  }
  if (typeof value === 'string' && value.length > 500) {
    return { truncated: true, preview: value.slice(0, 500), length: value.length };
  }
  return value;
}

/**
 * Safe event dispatch. Enriches with timestamp and progress ratio.
 * Spreads into a new object — never mutates the input.
 */
function send(callback, data, { defaultLevel, includeAt } = {}) {
  if (!callback || typeof callback !== 'function') return;

  const event = { timestamp: new Date().toISOString(), ...data };

  if (defaultLevel && !event.level) {
    event.level = defaultLevel;
  }

  if (includeAt && !event.at) {
    // Lazy: stack trace is only captured if a consumer reads `at`.
    // Avoids the cost of Error().stack on high-frequency events that nobody inspects.
    const stack = new Error().stack;
    Object.defineProperty(event, 'at', {
      get() {
        const resolved = resolveCallerFromStack(stack);
        Object.defineProperty(this, 'at', { value: resolved, enumerable: true });
        return resolved;
      },
      configurable: true,
      enumerable: true,
    });
  }

  if (event.totalItems > 0 && event.processedItems !== undefined) {
    event.progress = event.processedItems / event.totalItems;
  }

  try {
    callback(event);
  } catch {
    // Progress callbacks must not crash callers.
  }
}

/**
 * Create a progress emitter bound to a named operation.
 * Does not emit on construction — call start() explicitly.
 *
 * @param {string} name - Operation name (used as event.step)
 * @param {Function} [callback] - Progress callback
 * @param {Object} [options]
 * @param {string} [options.operation] - Composed operation path (from nameStep)
 * @param {Date} [options.now] - Start timestamp for duration calculation
 * @param {string} [options.traceId] - Trace correlation ID
 * @param {string} [options.spanId] - Span ID for this emitter's lifecycle
 * @param {string} [options.parentSpanId] - Span ID of the calling chain
 * @returns {{ start, emit, progress, metrics, measure, complete, error, batch }}
 */
export default function createProgressEmitter(
  name,
  callback,
  { operation, now, traceId: tid, spanId: sid, parentSpanId: psid } = {}
) {
  const startTime = now;

  // Trace context — present on every event when available
  const trace = {};
  if (tid) trace.traceId = tid;
  if (sid) trace.spanId = sid;
  if (psid) trace.parentSpanId = psid;

  // Resource identity
  const resource = { libraryName: 'verblets', libraryVersion };

  const base = { step: name, operation, ...trace, ...resource };

  const emitter = {
    start(context = {}) {
      send(
        callback,
        {
          kind: Kind.event,
          ...base,
          event: ChainEvent.start,
          id: sid,
          ...context,
        },
        { defaultLevel: Level.info, includeAt: true }
      );
    },

    emit(data = {}) {
      send(callback, { kind: Kind.event, ...base, ...data }, { includeAt: true });
    },

    progress(data = {}) {
      send(callback, { kind: Kind.operation, ...base, ...data });
    },

    metrics(data = {}) {
      send(callback, { kind: Kind.telemetry, ...base, ...data });
    },

    /**
     * Emit a flat dimensional metric (OTel-style).
     * @param {{ metric: string, value: number, [key: string]: * }} data
     */
    measure(data = {}) {
      send(callback, { kind: Kind.telemetry, ...base, ...data });
    },

    complete(meta = {}) {
      const { durationMs: explicit, ...rest } = meta;
      const durationMs = explicit ?? (startTime ? Date.now() - startTime.getTime() : undefined);
      send(
        callback,
        {
          kind: Kind.event,
          ...base,
          event: ChainEvent.complete,
          statusCode: StatusCode.ok,
          id: sid,
          ...(durationMs !== undefined && { durationMs }),
          ...rest,
        },
        { defaultLevel: Level.info, includeAt: true }
      );
    },

    error(err, meta = {}) {
      const { durationMs: explicit, ...rest } = meta;
      const durationMs = explicit ?? (startTime ? Date.now() - startTime.getTime() : undefined);
      send(
        callback,
        {
          kind: Kind.event,
          ...base,
          event: ChainEvent.error,
          statusCode: StatusCode.error,
          id: sid,
          ...(durationMs !== undefined && { durationMs }),
          error: { message: err.message, type: err.constructor?.name, stack: err.stack },
          ...rest,
        },
        { defaultLevel: Level.error, includeAt: true }
      );
    },

    batch(totalItems) {
      let processedItems = 0;
      function done(count) {
        processedItems += count;
        done.count = processedItems;
        emitter.progress({
          event: OpEvent.batchComplete,
          totalItems,
          processedItems,
          batchSize: count,
        });
        return processedItems;
      }
      done.count = 0;
      return done;
    },
  };

  return emitter;
}

/**
 * Wrap a progress callback to compose phase paths for sub-chain delegation.
 * Returns undefined when callback is absent, preserving the null-callback convention.
 *
 * @param {Function} [callback] - Progress callback
 * @param {string} phase - Phase identifier (e.g. 'group:extraction')
 * @returns {Function|undefined}
 */
export function scopePhase(callback, phase) {
  if (!callback || typeof callback !== 'function') return undefined;
  return (event) => callback({ ...event, phase: event.phase ? `${phase}/${event.phase}` : phase });
}
