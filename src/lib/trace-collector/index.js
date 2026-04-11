/**
 * Trace Collector — collects decision traces from the telemetry event stream.
 *
 * Pure data structure backed by a ring buffer. No AI, no LLM calls.
 *
 * - `observe(event)` — onProgress consumer; filters for trace-worthy events
 * - `write(trace)` — manual trace insertion
 * - `reader()` — ring buffer reader for custom consumers
 * - `lookback(n)` — get the last n traces without consuming
 * - `stats()` / `clear()` — housekeeping
 */

import RingBuffer from '../ring-buffer/index.js';
import { TelemetryEvent, ModelSource } from '../progress/constants.js';

const DEFAULT_BUFFER_SIZE = 1000;

const TRACE_EVENTS = new Set([TelemetryEvent.optionResolve, TelemetryEvent.llmModel]);

/**
 * Convert a telemetry event into the trace shape the collector stores.
 * Returns undefined for events that aren't trace-worthy.
 */
export const eventToTrace = (event) => {
  if (event.event === TelemetryEvent.optionResolve) {
    return {
      option: event.step,
      operation: event.operation,
      source: event.source,
      value: event.value,
      policyReturned: event.policyReturned,
      error: event.error?.message,
    };
  }

  if (event.event === TelemetryEvent.llmModel) {
    return {
      option: 'llm',
      operation: event.operation,
      source: event.source === ModelSource.default ? 'fallback' : event.source,
      value: event.model,
      policyReturned: event.negotiation,
    };
  }

  return undefined;
};

/**
 * Create a trace collector.
 *
 * @param {object} [config={}]
 * @param {number} [config.bufferSize=1000] - Ring buffer capacity
 * @returns {{ observe, write, reader, lookback, stats, clear }}
 */
export default function createTraceCollector(config = {}) {
  const { bufferSize = DEFAULT_BUFFER_SIZE } = config;

  const buffer = new RingBuffer(bufferSize);
  let traceCount = 0;

  const write = (trace) => {
    buffer.writeSync(trace, { force: true });
    traceCount++;
  };

  const observe = (event) => {
    if (!event || !TRACE_EVENTS.has(event.event)) return;
    const trace = eventToTrace(event);
    if (trace) write(trace);
  };

  const lookback = (n) => {
    const window = Math.min(n, traceCount);
    return buffer.lookback(window);
  };

  const reader = (startOffset) => buffer.reader(startOffset);

  const stats = () => ({
    traceCount,
    ...buffer.stats(),
  });

  const clear = () => {
    buffer.clear();
    traceCount = 0;
  };

  return { observe, write, lookback, reader, stats, clear };
}
