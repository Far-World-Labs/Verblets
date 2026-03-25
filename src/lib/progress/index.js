/**
 * Progress event system for chains and verblets.
 *
 * Default export:
 *   createProgressEmitter(name, callback, options) → { start, emit, metrics, complete, error, batch }
 *
 * Named export:
 *   scopePhase(callback, phase) — compose phase paths for sub-chain delegation
 *
 * Chain usage:
 *   const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
 *   emitter.start();
 *   emitter.emit({ event: 'step', stepName: 'sorting' });
 *   emitter.complete({ totalItems: 10 });
 *
 * Infrastructure usage:
 *   const emitter = createProgressEmitter('llm', onProgress);
 *   emitter.metrics({ event: 'llm:call', status: 'success', tokens });
 */

/**
 * Safe event dispatch. Enriches with timestamp and progress ratio.
 * Spreads into a new object — never mutates the input.
 * No implicit kind — callers provide it.
 */
function send(callback, data) {
  if (!callback || typeof callback !== 'function') return;

  const event = { timestamp: new Date().toISOString(), ...data };

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
 * @returns {{ start, emit, metrics, complete, error, batch }}
 */
export default function createProgressEmitter(name, callback, { operation, now } = {}) {
  const startTime = now;

  const emitter = {
    start() {
      send(callback, { kind: 'telemetry', step: name, event: 'chain:start', operation });
    },

    emit(data = {}) {
      send(callback, { kind: 'operation', step: name, operation, ...data });
    },

    metrics(data = {}) {
      send(callback, { kind: 'telemetry', step: name, operation, ...data });
    },

    complete(meta = {}) {
      const { duration: explicit, ...rest } = meta;
      const duration = explicit ?? (startTime ? Date.now() - startTime.getTime() : undefined);
      send(callback, {
        kind: 'telemetry',
        step: name,
        event: 'chain:complete',
        operation,
        ...(duration !== undefined && { duration }),
        ...rest,
      });
    },

    error(err, meta = {}) {
      const { duration: explicit, ...rest } = meta;
      const duration = explicit ?? (startTime ? Date.now() - startTime.getTime() : undefined);
      send(callback, {
        kind: 'telemetry',
        step: name,
        event: 'chain:error',
        operation,
        ...(duration !== undefined && { duration }),
        error: { message: err.message },
        ...rest,
      });
    },

    batch(totalItems) {
      let processedItems = 0;
      function done(count) {
        processedItems += count;
        done.count = processedItems;
        emitter.emit({ event: 'batch:complete', totalItems, processedItems, batchSize: count });
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
