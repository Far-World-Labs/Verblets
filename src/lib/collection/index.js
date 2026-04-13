/**
 * Generic collection utilities — parallel and sequential.
 *
 * Parallel (p-prefixed on import): batched concurrent execution with
 * controlled concurrency, progress emissions, error posture.
 *
 * Sequential (each-suffixed on import): one-at-a-time execution with
 * per-item callback, progress emissions, early termination on find.
 *
 * Both tiers are function-first: fn comes before items.
 * Neither tier is LLM-specific — they work with any async function.
 */

export {
  map as pMap,
  filter as pFilter,
  find as pFind,
  reduce as pReduce,
  group as pGroup,
} from './parallel.js';

export {
  map as mapEach,
  filter as filterEach,
  find as findEach,
  reduce as reduceEach,
  group as groupEach,
} from './sequential.js';
