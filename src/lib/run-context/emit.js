/**
 * Emit surface for automations — plain verblets progress emitter.
 *
 * ctx.lib.emit exposes exactly what createProgressEmitter provides:
 * start, emit, progress, metrics, measure, complete, error, batch.
 *
 * Automations that need activity query (ring buffer, stats, filtering)
 * create their own RingBuffer via ctx.lib.verblets.ringBuffer and wire
 * a tee callback. This is a documented recipe, not built-in infrastructure.
 */

import createProgressEmitter from '../progress/index.js';

export default function createEmit(name, options = {}) {
  const { onProgress, operation, now } = options;
  return createProgressEmitter(name, onProgress, { operation, now });
}
