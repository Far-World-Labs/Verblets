/**
 * Progress event system for chains and verblets.
 *
 * Single export:
 *   createProgressEmitter(name, callback, options) — lifecycle emitter for operations
 *
 * Chain usage:
 *   const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
 *   emitter.emit({ event: 'step', stepName: 'sorting' });
 *   emitter.result({ totalItems: 10 });
 *
 * Infrastructure usage:
 *   const emitter = createProgressEmitter('llm', onProgress);
 *   emitter.emit({ event: 'llm:call', kind: 'telemetry' });
 */

/**
 * Create a progress emitter bound to a named operation.
 * Emits chain:start immediately through the callback.
 *
 * @param {string} name - Operation name (used as event.step)
 * @param {Function} [callback] - Progress callback to dispatch events through
 * @param {Object} [options]
 * @param {string} [options.operation] - Composed operation path (from nameStep)
 * @param {Date} [options.now] - Start timestamp for duration calculation
 * @returns {{ emit, result, error }}
 */
export default function createProgressEmitter(name, callback, { operation, now } = {}) {
  const startTime = now;

  dispatch(callback, { kind: 'telemetry', step: name, event: 'chain:start', operation });

  return {
    emit(data = {}) {
      dispatch(callback, { step: name, operation, ...data });
    },

    result(meta = {}) {
      const { duration: explicit, ...rest } = meta;
      const duration = explicit ?? (startTime ? Date.now() - startTime.getTime() : undefined);
      dispatch(callback, {
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
      dispatch(callback, {
        kind: 'telemetry',
        step: name,
        event: 'chain:error',
        operation,
        ...(duration !== undefined && { duration }),
        error: { message: err.message },
        ...rest,
      });
    },
  };
}

/**
 * Safe event dispatch with defaults.
 * Enriches with kind, timestamp, and progress ratio. Swallows callback errors.
 */
function dispatch(callback, data) {
  if (!callback || typeof callback !== 'function') return;

  const event = {
    kind: data.kind || 'operation',
    timestamp: new Date().toISOString(),
    ...data,
  };

  if (event.totalItems > 0 && event.processedItems !== undefined) {
    event.progress = event.processedItems / event.totalItems;
  }

  try {
    callback(event);
  } catch {
    // Progress callbacks must not crash callers.
  }
}
