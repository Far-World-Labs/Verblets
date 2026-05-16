// Embed chunks and discover topic structure via agglomerative clustering.
// Thresholds derived from pairwise distance percentiles — model-agnostic.
// Zero LLM calls. ~300ms total (dominated by embedding).

import { cosineSimilarity } from '../pure/index.js';
import { CONTENT_TYPES } from '../segment/index.js';

// ONNX runtime's arena allocator never returns native memory to the OS.
// Each batch larger than any prior batch permanently grows the arena.
// Capping at 64 texts bounds the arena to ~50-80MB of activations.
const EMBED_BATCH_SIZE = 64;

export const CLUSTER_DEFAULTS = Object.freeze({
  // Distance threshold derived from pairwise percentile — model-agnostic.
  // p30 empirically produces 1-2 real clusters for most documents after runt
  // merger; lower values (p20-25) over-fragment into budget-wasting singletons.
  coarsePercentile: 30,
  geometrySkipRatio: 0.15,
  // Non-heading word count below which a cluster is structural debris
  minClusterContent: 20,
});

function samplePairwiseDistances(vectors, maxSamples = 500) {
  const n = vectors.length;
  const distances = [];

  if (n <= maxSamples) {
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        distances.push(1 - cosineSimilarity(vectors[i], vectors[j]));
      }
    }
  } else {
    const sampleCount = Math.min(maxSamples, (n * (n - 1)) / 2);
    for (let s = 0; s < sampleCount; s++) {
      const i = Math.floor(Math.random() * n);
      let j = Math.floor(Math.random() * (n - 1));
      if (j >= i) j++;
      distances.push(1 - cosineSimilarity(vectors[i], vectors[j]));
    }
  }

  return distances;
}

function deriveThreshold(sortedDistances, percentile) {
  if (sortedDistances.length === 0) return 0;
  const idx = Math.floor(sortedDistances.length * (percentile / 100));
  return sortedDistances[Math.min(idx, sortedDistances.length - 1)];
}

// Low IQR/median means all chunks are roughly equidistant — clustering would
// produce arbitrary groupings rather than meaningful topics.
function shouldSkipClustering(sortedDistances, skipRatio) {
  if (sortedDistances.length === 0) return true;
  const median = sortedDistances[Math.floor(sortedDistances.length / 2)];
  if (median === 0) return true;
  const q25 = sortedDistances[Math.floor(sortedDistances.length * 0.25)];
  const q75 = sortedDistances[Math.floor(sortedDistances.length * 0.75)];
  const iqr = q75 - q25;
  return iqr / median < skipRatio;
}

// --- Agglomerative clustering ---

function computeCentroid(vectors) {
  if (vectors.length === 0) return null;
  if (vectors.length === 1) return vectors[0];

  const dim = vectors[0].length;
  const centroid = new Float32Array(dim);
  for (const vec of vectors) {
    for (let i = 0; i < dim; i++) centroid[i] += vec[i];
  }
  let norm = 0;
  for (let i = 0; i < dim; i++) norm += centroid[i] * centroid[i];
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dim; i++) centroid[i] /= norm;
  }
  return centroid;
}

function agglomerativeClusters(items, distanceThreshold) {
  let clusters = items.map((item, i) => ({
    members: [i],
    centroid: item.vector,
  }));

  while (clusters.length > 1) {
    let minDist = Infinity;
    let mergeA = -1;
    let mergeB = -1;

    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const dist = 1 - cosineSimilarity(clusters[i].centroid, clusters[j].centroid);
        if (dist < minDist) {
          minDist = dist;
          mergeA = i;
          mergeB = j;
        }
      }
    }

    if (minDist > distanceThreshold) break;

    const merged = {
      members: [...clusters[mergeA].members, ...clusters[mergeB].members],
      centroid: computeCentroid([
        ...clusters[mergeA].members.map((i) => items[i].vector),
        ...clusters[mergeB].members.map((i) => items[i].vector),
      ]),
    };

    clusters = clusters.filter((_, i) => i !== mergeA && i !== mergeB);
    clusters.push(merged);
  }

  return clusters;
}

// --- Main inventory function ---

export default async function inventory(chunks, embeddingService, tuning = {}) {
  const t = { ...CLUSTER_DEFAULTS, ...tuning };
  if (chunks.length === 0) {
    return {
      chunks: [],
      clusters: [],
      headings: [],
      singleCluster: true,
    };
  }

  const texts = chunks.map((c) => c.proxy);
  const model = embeddingService.negotiate({ good: true });
  const loader = await embeddingService.getLoader(model.name);
  const vectors = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBED_BATCH_SIZE);
    vectors.push(...(await loader.embedTexts(batch)));
  }

  const embedded = chunks.map((c, i) => ({ ...c, vector: vectors[i] }));
  const headings = embedded.filter((c) => c.type === CONTENT_TYPES.heading);

  const distances = samplePairwiseDistances(vectors);
  const sorted = distances.toSorted((a, b) => a - b);

  const distanceStats = {
    mean: sorted.reduce((s, d) => s + d, 0) / (sorted.length || 1),
    median: sorted[Math.floor(sorted.length / 2)] ?? 0,
    q25: sorted[Math.floor(sorted.length * 0.25)] ?? 0,
    q75: sorted[Math.floor(sorted.length * 0.75)] ?? 0,
    iqr:
      (sorted[Math.floor(sorted.length * 0.75)] ?? 0) -
      (sorted[Math.floor(sorted.length * 0.25)] ?? 0),
  };

  if (shouldSkipClustering(sorted, t.geometrySkipRatio) || embedded.length <= 3) {
    const singleCluster = buildCluster(embedded, 0);
    return {
      chunks: embedded,
      clusters: [singleCluster],
      headings,
      singleCluster: true,
      distanceStats,
      derivedThreshold: undefined,
    };
  }

  const threshold = deriveThreshold(sorted, t.coarsePercentile);
  const rawClusters = agglomerativeClusters(embedded, threshold);

  const initialClusters = rawClusters.map((raw, i) => {
    const clusterChunks = raw.members.map((idx) => embedded[idx]);
    return buildCluster(clusterChunks, i);
  });

  const { clusters, excludedHeadingPositions } = mergeRunts(initialClusters, t.minClusterContent);
  const filteredHeadings = headings.filter((h) => !excludedHeadingPositions.has(h.position));

  return {
    chunks: embedded,
    clusters,
    headings: filteredHeadings,
    singleCluster: clusters.length <= 1,
    distanceStats,
    derivedThreshold: threshold,
  };
}

function contentWordCount(cluster) {
  return cluster.chunks
    .filter(({ chunk }) => chunk.type !== CONTENT_TYPES.heading)
    .reduce((s, { chunk }) => s + chunk.wordCount, 0);
}

// Heading-only fragments and tiny code snippets form singleton clusters that
// waste budget (minClusterBudget allocated to ≤15 words of content) and inflate
// topic bonus from fake cluster count. Absorb them into nearest real cluster.
function mergeRunts(clusters, minContent) {
  const viable = [];
  const runts = [];

  for (const cluster of clusters) {
    if (contentWordCount(cluster) >= minContent) {
      viable.push(cluster);
    } else {
      runts.push(cluster);
    }
  }

  if (viable.length === 0 && clusters.length > 0) {
    const largest = clusters.toSorted((a, b) => b.wordCount - a.wordCount)[0];
    viable.push(largest);
    for (const c of clusters) {
      if (c !== largest) runts.push(c);
    }
  }

  const excludedHeadingPositions = new Set();

  for (const runt of runts) {
    let bestIdx = 0;
    let bestSim = -Infinity;
    for (let i = 0; i < viable.length; i++) {
      const sim = cosineSimilarity(runt.centroid, viable[i].centroid);
      if (sim > bestSim) {
        bestSim = sim;
        bestIdx = i;
      }
    }

    const target = viable[bestIdx];

    for (const { chunk } of runt.chunks) {
      if (chunk.type === CONTENT_TYPES.heading && target.headingPaths.includes(chunk.headingPath)) {
        excludedHeadingPositions.add(chunk.position);
      }
    }

    target.chunks = [...target.chunks, ...runt.chunks];
    target.wordCount += runt.wordCount;
    target.headingPaths = [
      ...new Set([
        ...target.headingPaths,
        ...runt.chunks.map(({ chunk }) => chunk.headingPath).filter(Boolean),
      ]),
    ];
    target.centroid = computeCentroid(target.chunks.map(({ chunk }) => chunk.vector));
  }

  const merged = viable.map((c, i) => ({ ...c, id: i }));
  return { clusters: merged, excludedHeadingPositions };
}

function buildCluster(clusterChunks, id) {
  const vectors = clusterChunks.map((c) => c.vector);
  const typeCounts = {};
  for (const c of clusterChunks) typeCounts[c.type] = (typeCounts[c.type] || 0) + 1;
  const dominantType =
    Object.entries(typeCounts).toSorted((a, b) => b[1] - a[1])[0]?.[0] || CONTENT_TYPES.prose;

  return {
    id,
    centroid: computeCentroid(vectors),
    chunks: clusterChunks.map((c) => ({ chunk: c, weight: 1 })),
    wordCount: clusterChunks.reduce((s, c) => s + c.wordCount, 0),
    dominantType,
    headingPaths: [...new Set(clusterChunks.map((c) => c.headingPath).filter(Boolean))],
  };
}

export { computeCentroid, agglomerativeClusters, samplePairwiseDistances, deriveThreshold };
