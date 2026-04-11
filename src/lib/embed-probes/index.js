import { embedBatch } from '../embed-local/index.js';

let cache = new WeakMap();

/**
 * Embed a set of probe definitions for use with probeScan.
 *
 * Accepts any `[{ category, label, queries }]` array, embeds the first query
 * per probe, and returns `[{ category, label, vector }]`. Results are cached
 * by reference — the same input array returns the same promise.
 *
 * @param {Array<{ category: string, label: string, queries: string[] }>} probes
 * @returns {Promise<Array<{ category: string, label: string, vector: Float32Array }>>}
 */
export default function embedProbes(probes) {
  if (!cache.has(probes)) {
    cache.set(
      probes,
      embedBatch(probes.map((p) => p.queries[0])).then((vectors) =>
        probes.map((probe, i) => ({
          category: probe.category,
          label: probe.label,
          vector: vectors[i],
        }))
      )
    );
  }
  return cache.get(probes);
}

export function clearProbeCache() {
  cache = new WeakMap();
}
