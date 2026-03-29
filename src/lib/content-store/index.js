/**
 * Content Store — injectable KV interface for large payloads.
 *
 * Events reference stored content via { $ref: key } objects instead of
 * inlining large strings. Consumers inject a content store via
 * config.contentStore; the library ships this in-memory implementation.
 *
 * Interface contract (any implementation must provide):
 *   get(key) → Promise<string|undefined>
 *   set(key, value) → Promise<void>
 *   has(key) → Promise<boolean>
 *   delete(key) → Promise<boolean>
 *   size() → number
 *   clear() → void
 */

export default function createContentStore() {
  const store = new Map();

  return {
    get(key) {
      return Promise.resolve(store.get(key));
    },
    set(key, value) {
      store.set(key, value);
      return Promise.resolve();
    },
    has(key) {
      return Promise.resolve(store.has(key));
    },
    delete(key) {
      return Promise.resolve(store.delete(key));
    },
    size() {
      return store.size;
    },
    clear() {
      store.clear();
    },
  };
}
