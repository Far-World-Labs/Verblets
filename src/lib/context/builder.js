/**
 * Context Builder
 *
 * Accumulates context kinds with different lifetimes into immutable snapshots.
 * Long-lived kinds (application, providers) are set via mutating methods.
 * Short-lived kinds (request, content) are set via withX() which returns new builders.
 */

import createProgressEmitter from '../progress/index.js';
import { DomainEvent } from '../progress/constants.js';

function freezeDeep(obj) {
  if (obj == null || typeof obj !== 'object') return obj;
  Object.freeze(obj);
  for (const val of Object.values(obj)) {
    if (typeof val === 'object' && val !== null && !Object.isFrozen(val)) {
      freezeDeep(val);
    }
  }
  return obj;
}

function builderFrom(state, onProgress, traceContext) {
  return {
    setApplication(attrs) {
      state.application = { key: 'default', ...attrs };
      return this;
    },

    setProviders(attrs) {
      state.providers = { key: 'default', ...attrs };
      return this;
    },

    withRequest(attrs) {
      return builderFrom(
        { ...state, request: { key: 'default', ...attrs } },
        onProgress,
        traceContext
      );
    },

    withContent(attrs) {
      return builderFrom(
        { ...state, content: { key: 'default', ...attrs } },
        onProgress,
        traceContext
      );
    },

    build() {
      const snapshot = {};
      for (const [kind, value] of Object.entries(state)) {
        if (value === undefined) continue;
        const copy = {};
        for (const [k, v] of Object.entries(value)) {
          copy[k] = Array.isArray(v) ? [...v] : v;
        }
        snapshot[kind] = copy;
      }
      const emitter = createProgressEmitter('context-builder', onProgress, traceContext);
      emitter.emit({ event: DomainEvent.output, kinds: Object.keys(snapshot) });
      return freezeDeep(snapshot);
    },
  };
}

export function createContextBuilder({
  onProgress,
  operation,
  traceId,
  spanId,
  parentSpanId,
  now,
} = {}) {
  return builderFrom(
    { application: undefined, providers: undefined, request: undefined, content: undefined },
    onProgress,
    { operation, traceId, spanId, parentSpanId, now }
  );
}
