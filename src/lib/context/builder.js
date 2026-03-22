/**
 * Context Builder
 *
 * Accumulates context kinds with different lifetimes into immutable snapshots.
 * Long-lived kinds (application, providers) are set via mutating methods.
 * Short-lived kinds (request, content) are set via withX() which returns new builders.
 */

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

function builderFrom(state) {
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
      return builderFrom({
        ...state,
        request: { key: 'default', ...attrs },
      });
    },

    withContent(attrs) {
      return builderFrom({
        ...state,
        content: { key: 'default', ...attrs },
      });
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
      return freezeDeep(snapshot);
    },
  };
}

export function createContextBuilder() {
  return builderFrom({
    application: undefined,
    providers: undefined,
    request: undefined,
    content: undefined,
  });
}
