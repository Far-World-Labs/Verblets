// Coverage-preserving document compression.
// Discovers topic structure via local embeddings + clustering, then allocates
// budget proportionally so multi-topic documents retain all subjects.

import { embed, embedBatch } from '../../embed/local.js';
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { DomainEvent, Outcome, ErrorPosture } from '../../lib/progress/constants.js';
import { nameStep, getOptions, withPolicy } from '../../lib/context/option.js';
import { cosineSimilarity } from '../../lib/pure/index.js';
import { parallelBatch } from '../../lib/parallel-batch/index.js';
import llm, { jsonSchema } from '../../lib/llm/index.js';
import segment, { CONTENT_TYPES } from '../../lib/segment/index.js';
import inventory from '../../lib/cluster-chunks/index.js';

const name = 'document-shrink';

// --- Tuning defaults (all injectable via config.tuning) ---

export const TUNING_DEFAULTS = Object.freeze({
  // --- Units ---
  charsPerWord: 8,
  maxTargetWords: 2000,

  // --- Budget allocation ---
  // Clusters below this budget get a mention line instead of a reduce call
  mentionThreshold: 30,
  minClusterBudget: 20,
  topicBonusPerTopic: 200,
  topicBonusStart: 3,
  // Sublinear: prevents large clusters from dominating budget proportionally.
  // 0.6 means a cluster 10x larger gets ~4x budget, not 10x.
  allocationExponent: 0.6,

  // --- Mode multipliers ---
  densityHigh: 1.3,
  densityMedium: 1.0,
  densityLow: 0.7,
  coreMultiplier: 1.0,
  peripheralMultiplier: 0.6,
  querySharpening: 2,
  previewCoreWeight: 1.2,
  previewPeripheralWeight: 0.8,

  // --- Chunk selection scoring (must sum to 1.0) ---
  weightLabel: 0.2,
  weightCentroid: 0.2,
  weightCoverage: 0.4,
  weightType: 0.1,
  weightPosition: 0.1,
  // Minimum word length for label matching (skip "of", "the", etc.)
  labelMinWordLength: 3,
  // Type preference scores by content type
  typeProse: 0.8,
  typeProseUnderPressure: 1.0,
  typeCode: 0.6,
  typeHeading: 0.9,
  typeOther: 0.5,
  // Budget ratio above which prose gets full preference
  typePressureThreshold: 0.7,
  // Position decay: front-of-document gets up to this much bonus
  positionDecay: 0.3,

  // --- Coverage and validation ---
  headingCoverageThreshold: 0.75,
  // Below this budget, use reconstruction-loss selection instead of greedy scoring
  reconstructionLossThreshold: 25,
  coverageDriftThreshold: 0.7,
  autoRetryBudgetMultiplier: 1.5,
  autoRetryCoverageThreshold: 0.8,
  validatePreviewChars: 800,

  // --- Reduce batching ---
  reduceBatchMinChunks: 3,
  reduceBatchSize: 3,
  reduceMaxParallel: 3,

  // --- Characterize ---
  representativesPerCluster: 3,
  excerptMaxChars: 200,
});

// --- Prompt defaults (all injectable via config.prompts) ---

export const PROMPT_DEFAULTS = Object.freeze({
  characterize: (clusterCount) =>
    `Here are representative excerpts from ${clusterCount} topic groups found in a document.\n\n` +
    'For each group, output: label (3-8 words), contentKind, density (high/medium/low), isCore (main topic or peripheral).\n',

  reduce: (clusterLabel, budgetWords) =>
    `Reduce the following excerpts about "${clusterLabel}" to ${budgetWords} words.\n\n` +
    'Rules:\n' +
    '- Keep every specific name, tool, command, or pattern mentioned\n' +
    '- Drop examples, elaboration, and hedging\n' +
    '- Drop generic statements that could apply to any topic\n' +
    '- Use dense clause-chaining (semicolons), not bullet lists\n' +
    '- Preserve the heading structure markers\n\n' +
    'Excerpts:',

  assembly:
    'Assemble these topic summaries into a coherent compressed document.\n' +
    'Smooth transitions between topics. Do not add content. Do not remove content. ' +
    'Keep the same total length. Preserve heading structure.',

  validate: (clusterLabels, preview) =>
    `Inventory of topics in the original: ${clusterLabels}\n` +
    `First 200 words of compressed version: ${preview}\n\n` +
    'Which topics from the inventory are NOT represented? List them, or say "none".',

  overview:
    'Write a 100-150 word overview of this document that names every topic. ' +
    'Do not elaborate on any topic. Just name and contextualize each one.',
});

// --- Option mappers ---

const DEFAULT_TARGET_SIZE = 5000;

const MODES = Object.freeze({
  landscape: 'landscape',
  query: 'query',
  context: 'context',
  preview: 'preview',
  differential: 'differential',
});

export const mapMode = (value) => {
  if (value === undefined) return MODES.landscape;
  return MODES[value] ?? MODES.landscape;
};

const DETAIL_LEVELS = { low: 0.5, high: 2.0 };

export const mapDetail = (value) => {
  if (value === undefined) return 1.0;
  if (typeof value === 'number') return value;
  return DETAIL_LEVELS[value] ?? 1.0;
};

// --- Phase 3: Characterize ---

const characterizeSchema = {
  type: 'object',
  properties: {
    groups: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          groupIndex: { type: 'integer' },
          label: { type: 'string' },
          contentKind: {
            type: 'string',
            enum: [
              'explanation',
              'reference',
              'tutorial',
              'opinion',
              'catalog',
              'code-patterns',
              'mixed',
            ],
          },
          density: { type: 'string', enum: ['high', 'medium', 'low'] },
          isCore: { type: 'boolean' },
        },
        required: ['groupIndex', 'label', 'contentKind', 'density', 'isCore'],
        additionalProperties: false,
      },
    },
  },
  required: ['groups'],
  additionalProperties: false,
};

function buildCharacterizePrompt(inv, t, p) {
  const parts = [];
  parts.push(p.characterize(inv.clusters.length));

  for (let ci = 0; ci < inv.clusters.length; ci++) {
    const cluster = inv.clusters[ci];
    const reps = pickRepresentatives(cluster, t.representativesPerCluster);
    parts.push(`\nGroup ${ci}:`);
    if (cluster.headingPaths.length > 0) {
      parts.push(`  Headings: ${cluster.headingPaths.join(', ')}`);
    }
    parts.push(
      `  Excerpts:\n${reps.map((r) => `    ${r.slice(0, t.excerptMaxChars)}`).join('\n')}`
    );
  }

  return parts.join('\n');
}

function pickRepresentatives(cluster, n) {
  const scored = cluster.chunks
    .map(({ chunk }) => ({
      text: chunk.proxy,
      dist: 1 - cosineSimilarity(chunk.vector, cluster.centroid),
    }))
    .toSorted((a, b) => a.dist - b.dist);
  return scored.slice(0, n).map((s) => s.text);
}

async function characterize(inv, config, t, p) {
  if (inv.clusters.length <= 1) {
    const cluster = inv.clusters[0];
    cluster.label = cluster.headingPaths[0] || 'Main content';
    cluster.contentKind = 'mixed';
    cluster.density = 'medium';
    cluster.isCore = true;
    return inv;
  }

  const prompt = buildCharacterizePrompt(inv, t, p);
  const result = await llm(prompt, {
    ...config,
    fast: true,
    cheap: true,
    responseFormat: jsonSchema('characterize_topics', characterizeSchema),
    onProgress: scopePhase(config.onProgress, 'characterize'),
  });

  const groups = result.groups || [];
  for (const group of groups) {
    const cluster = inv.clusters[group.groupIndex];
    if (!cluster) continue;
    cluster.label = group.label;
    cluster.contentKind = group.contentKind;
    cluster.density = group.density;
    cluster.isCore = group.isCore;
  }

  for (const cc of inv.clusters) {
    cc.label = cc.label || cc.headingPaths[0] || 'Unlabeled';
    cc.contentKind = cc.contentKind || 'mixed';
    cc.density = cc.density || 'medium';
    cc.isCore = cc.isCore ?? true;
  }

  return inv;
}

// --- Phase 4: Allocate budget ---

// Heading words reserved first (guaranteed inclusion), then remaining budget
// distributed across clusters via sublinear scaling × mode-specific multipliers.
function allocate(inv, targetWords, headingWords, mode, queryEmbedding, backgroundEmbeddings, t) {
  const allocatable = Math.max(targetWords - headingWords, t.minClusterBudget);
  const topicCount = inv.clusters.length;
  const topicBonus = Math.max(0, topicCount - t.topicBonusStart) * t.topicBonusPerTopic;
  const effectiveTarget = Math.min(allocatable + topicBonus, t.maxTargetWords);

  const densityMultiplier = { high: t.densityHigh, medium: t.densityMedium, low: t.densityLow };

  const rawBudgets = inv.clusters.map((cc) => {
    const base = cc.wordCount ** t.allocationExponent;
    switch (mode) {
      case MODES.landscape: {
        const dm = densityMultiplier[cc.density] || t.densityMedium;
        const cm = cc.isCore ? t.coreMultiplier : t.peripheralMultiplier;
        return base * dm * cm;
      }
      case MODES.query: {
        if (!queryEmbedding) return base;
        const relevance = cosineSimilarity(cc.centroid, queryEmbedding);
        return base * Math.max(relevance, 0) ** t.querySharpening;
      }
      case MODES.preview: {
        return base * (cc.isCore ? t.previewCoreWeight : t.previewPeripheralWeight);
      }
      case MODES.differential: {
        if (!backgroundEmbeddings || backgroundEmbeddings.length === 0) return base;
        const maxSim = Math.max(
          ...backgroundEmbeddings.map((bg) => cosineSimilarity(cc.centroid, bg))
        );
        return base * Math.max(0, 1 - maxSim);
      }
      default:
        return base;
    }
  });

  const rawSum = rawBudgets.reduce((s, b) => s + b, 0) || 1;
  const budgets = rawBudgets.map((b) => {
    const normalized = (b / rawSum) * effectiveTarget;
    return Math.max(normalized, t.minClusterBudget);
  });

  const budgetSum = budgets.reduce((s, b) => s + b, 0);
  const scale = effectiveTarget / budgetSum;
  const finalBudgets = budgets.map((b) => Math.round(b * scale));

  for (let ci = 0; ci < inv.clusters.length; ci++) {
    inv.clusters[ci].budget = finalBudgets[ci];
  }
}

// --- Phase 5: Select (coarse pool, blended diversity) ---

function buildLabelMatcher(clusterLabel, minWordLength) {
  const labelWords = new Set(
    clusterLabel
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length >= minWordLength)
  );
  if (labelWords.size === 0) return () => 0;
  return (chunkProxy) => {
    const proxyWords = chunkProxy.toLowerCase().split(/\s+/);
    let matches = 0;
    for (const w of proxyWords) {
      if (labelWords.has(w)) matches++;
    }
    return matches / labelWords.size;
  };
}

function typePreference(type, budgetPressure, t) {
  if (budgetPressure > t.typePressureThreshold && type === CONTENT_TYPES.prose)
    return t.typeProseUnderPressure;
  if (type === CONTENT_TYPES.prose) return t.typeProse;
  if (type === CONTENT_TYPES.code) return t.typeCode;
  if (type === CONTENT_TYPES.heading) return t.typeHeading;
  return t.typeOther;
}

function positionScore(position, docLength, decay) {
  if (docLength === 0) return 1 - decay / 2;
  const normalized = position / docLength;
  return 1 - normalized * decay;
}

// Smoothly transitions from heading-oriented to inter-chunk diversity as headings
// get covered. Avoids dead-zone where all headings are covered but scoring gives 0.
function blendedCoverage(vector, clusterHeadings, coveredHeadings, selected) {
  const diversity =
    selected.length === 0
      ? 1.0
      : 1 - Math.max(...selected.map((s) => cosineSimilarity(vector, s.vector)));

  if (clusterHeadings.length === 0) return diversity;

  const uncovered = clusterHeadings.filter((h) => !coveredHeadings.has(h.position));
  if (uncovered.length === 0) return diversity;

  let bestSim = 0;
  for (const h of uncovered) {
    const sim = cosineSimilarity(vector, h.vector);
    if (sim > bestSim) bestSim = sim;
  }

  const headingWeight = uncovered.length / clusterHeadings.length;
  return headingWeight * bestSim + (1 - headingWeight) * diversity;
}

function selectForCluster(cluster, allHeadings, docLength, t) {
  const budget = cluster.budget;
  if (!budget || budget <= 0) return { selected: [], coveredHeadings: new Set() };

  const candidates = cluster.chunks
    .map(({ chunk }) => chunk)
    .filter((c) => c.type !== CONTENT_TYPES.heading);

  if (candidates.length === 0) return { selected: [], coveredHeadings: new Set() };

  if (budget < t.reconstructionLossThreshold && candidates.length > 2) {
    return {
      selected: selectByReconstructionLoss(candidates, budget),
      coveredHeadings: new Set(),
    };
  }

  const clusterHeadings = allHeadings.filter(
    (h) => cosineSimilarity(h.vector, cluster.centroid) >= t.headingCoverageThreshold
  );

  const scoreLabel = buildLabelMatcher(cluster.label || '', t.labelMinWordLength);
  const selected = [];
  const coveredHeadings = new Set();
  let wordsUsed = 0;
  const remaining = [...candidates];
  const budgetPressure = budget / cluster.wordCount;

  while (remaining.length > 0 && wordsUsed < budget) {
    let bestIdx = -1;
    let bestScore = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const chunk = remaining[i];
      const label = scoreLabel(chunk.proxy);
      const centroid = cosineSimilarity(chunk.vector, cluster.centroid);
      const coverage = blendedCoverage(chunk.vector, clusterHeadings, coveredHeadings, selected);
      const tp = typePreference(chunk.type, budgetPressure, t);
      const ps = positionScore(chunk.position, docLength, t.positionDecay);

      const score =
        label * t.weightLabel +
        centroid * t.weightCentroid +
        coverage * t.weightCoverage +
        tp * t.weightType +
        ps * t.weightPosition;

      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    if (bestIdx < 0) break;

    const pick = remaining[bestIdx];
    selected.push(pick);
    wordsUsed += pick.wordCount;
    remaining.splice(bestIdx, 1);

    for (const h of clusterHeadings) {
      if (cosineSimilarity(pick.vector, h.vector) >= t.headingCoverageThreshold) {
        coveredHeadings.add(h.position);
      }
    }
  }

  return { selected, coveredHeadings };
}

// For tiny budgets (< reconstructionLossThreshold), greedy scoring is unreliable
// because each pick dominates. Instead, iteratively drop the chunk whose removal
// shifts the mean embedding least — preserves maximum semantic coverage.
function selectByReconstructionLoss(candidates, budget) {
  let remaining = [...candidates];
  let totalWords = remaining.reduce((s, c) => s + c.wordCount, 0);

  while (remaining.length > 1 && totalWords > budget) {
    const currentMean = computeMeanVector(remaining.map((c) => c.vector));
    let worstIdx = -1;
    let minLoss = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const without = remaining.filter((_, j) => j !== i);
      const newMean = computeMeanVector(without.map((c) => c.vector));
      const loss = 1 - cosineSimilarity(currentMean, newMean);
      if (loss < minLoss) {
        minLoss = loss;
        worstIdx = i;
      }
    }

    totalWords -= remaining[worstIdx].wordCount;
    remaining.splice(worstIdx, 1);
  }

  return remaining;
}

function computeMeanVector(vectors) {
  if (vectors.length === 0) return null;
  const dim = vectors[0].length;
  const mean = new Float32Array(dim);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) mean[i] += v[i];
  }
  let norm = 0;
  for (let i = 0; i < dim; i++) norm += mean[i] * mean[i];
  norm = Math.sqrt(norm);
  if (norm > 0) for (let i = 0; i < dim; i++) mean[i] /= norm;
  return mean;
}

function select(inv, t) {
  const docLength =
    inv.chunks.length > 0
      ? inv.chunks[inv.chunks.length - 1].position + inv.chunks[inv.chunks.length - 1].text.length
      : 0;

  const selectedByCluster = new Map();
  const allCoveredHeadings = new Set();

  for (const cluster of inv.clusters) {
    const { selected, coveredHeadings } = selectForCluster(cluster, inv.headings, docLength, t);
    for (const pos of coveredHeadings) allCoveredHeadings.add(pos);
    selectedByCluster.set(cluster.id, selected);
  }

  const coveredClusters = inv.clusters.filter(
    (c) => (selectedByCluster.get(c.id) || []).length > 0
  ).length;
  const coverageScore = inv.clusters.length > 0 ? coveredClusters / inv.clusters.length : 1;

  const clusterDetails = inv.clusters.map((cluster) => {
    const selected = selectedByCluster.get(cluster.id) || [];
    const clusterHeadings = inv.headings.filter(
      (h) => cosineSimilarity(h.vector, cluster.centroid) >= t.headingCoverageThreshold
    );
    const uncoveredCount = clusterHeadings.filter(
      (h) => !allCoveredHeadings.has(h.position)
    ).length;
    return {
      id: cluster.id,
      label: cluster.label,
      wordCount: cluster.wordCount,
      budget: cluster.budget,
      selectedWords: selected.reduce((s, c) => s + c.wordCount, 0),
      chunkCount: cluster.chunks.length,
      selectedCount: selected.length,
      headingTargets: clusterHeadings.length,
      headingsUncovered: uncoveredCount,
    };
  });

  return {
    selectedByCluster,
    headings: inv.headings,
    coverageScore,
    coveredHeadings: allCoveredHeadings,
    clusterDetails,
  };
}

// --- Phase 6: Reduce and assemble ---

async function reduce(selection, inv, config, t, p) {
  const { mode, structured } = config;

  const clusterGroups = inv.clusters.map((cc) => ({
    cluster: cc,
    chunks: selection.selectedByCluster.get(cc.id) || [],
  }));

  const fullGroups = clusterGroups.filter((g) => g.cluster.budget >= t.mentionThreshold);
  const mentionGroups = clusterGroups.filter((g) => g.cluster.budget < t.mentionThreshold);

  const reductionInputs = fullGroups
    .filter((g) => g.chunks.length > 0)
    .map((g) => ({ group: g, texts: g.chunks.map((c) => c.text) }));

  const batched = batchSmallReductions(reductionInputs, t);

  const reduced = await parallelBatch(
    batched,
    async (batch) => {
      const concatenated = batch.texts.join('\n\n---\n\n');
      const reducePrompt = p.reduce(batch.label, batch.budgetWords);
      const reducedText = await llm(`${reducePrompt}\n\n${concatenated}`, {
        ...config,
        fast: true,
        cheap: true,
        onProgress: scopePhase(config.onProgress, `reduce:${batch.label}`),
      });
      return { group: batch.group, text: reducedText };
    },
    { maxParallel: t.reduceMaxParallel, errorPosture: ErrorPosture.resilient }
  );

  const sections = (reduced || []).filter(Boolean).toSorted((a, b) => {
    const posA = a.group?.chunks[0]?.position ?? 0;
    const posB = b.group?.chunks[0]?.position ?? 0;
    return posA - posB;
  });

  // Inject orphan headings not covered by any selected chunk
  const selectedPositions = new Set();
  for (const [, chunks] of selection.selectedByCluster) {
    for (const c of chunks) selectedPositions.add(c.position);
  }
  const orphanHeadings = selection.headings
    .filter((h) => !selectedPositions.has(h.position) && !selection.coveredHeadings.has(h.position))
    .map((h) => ({
      group: { chunks: [h], cluster: { label: h.text.trim() } },
      text: h.text.trim(),
    }));
  if (orphanHeadings.length > 0) {
    sections.push(...orphanHeadings);
    sections.sort((a, b) => {
      const posA = a.group?.chunks[0]?.position ?? 0;
      const posB = b.group?.chunks[0]?.position ?? 0;
      return posA - posB;
    });
  }

  const mentions = mentionGroups.map((g) => g.cluster.label).filter(Boolean);
  const mentionsFooter = mentions.length > 0 ? `\n---\nAlso covers: ${mentions.join(', ')}` : '';

  let content;
  if (mode === MODES.context && sections.length > 1) {
    const rawAssembly = sections.map((s) => s.text).join('\n\n---\n\n');
    const polished = await llm(`${p.assembly}\n\n${rawAssembly}`, {
      ...config,
      fast: false,
      good: true,
      onProgress: scopePhase(config.onProgress, 'assembly'),
    });
    content = polished + mentionsFooter;
  } else {
    content = sections.map((s) => s.text).join('\n\n---\n\n') + mentionsFooter;
  }

  if (structured) {
    const totalWords = inv.chunks.reduce((sum, c) => sum + c.wordCount, 0);
    const overview = await llm(`${p.overview}\n\n${content}`, {
      ...config,
      fast: true,
      cheap: true,
      onProgress: scopePhase(config.onProgress, 'overview'),
    });

    return {
      content,
      structured: {
        overview,
        sections: sections.map((s) => ({
          label: s.group.cluster.label,
          weight: s.group.cluster.budget / totalWords,
          text: s.text,
          representative: s.group.chunks[0]?.text?.slice(0, t.excerptMaxChars),
        })),
        mentions,
        metadata: {
          topicCount: inv.clusters.length,
          coverageScore: selection.coverageScore,
          compressionRatio: content.length / inv.chunks.reduce((s, c) => s + c.text.length, 0),
        },
      },
    };
  }

  return { content, mentions };
}

function batchSmallReductions(inputs, t) {
  const result = [];
  let pending = [];

  for (const input of inputs) {
    if (input.texts.length <= t.reduceBatchMinChunks) {
      pending.push(input);
      if (pending.length >= t.reduceBatchSize) {
        result.push(mergeReductions(pending));
        pending = [];
      }
    } else {
      result.push({
        group: input.group,
        texts: input.texts,
        label: input.group.cluster.label,
        budgetWords: input.group.cluster.budget,
      });
    }
  }

  if (pending.length > 0) {
    result.push(mergeReductions(pending));
  }

  return result;
}

function mergeReductions(inputs) {
  return {
    group: inputs[0].group,
    texts: inputs.flatMap((i) => i.texts),
    label: inputs.map((i) => i.group.cluster.label).join(' + '),
    budgetWords: inputs.reduce((s, i) => s + i.group.cluster.budget, 0),
  };
}

// --- Phase 7: Validate ---

async function validate(result, inv, config, t, p) {
  const originalMean = computeMeanVector(inv.chunks.map((c) => c.vector));
  if (!originalMean) return { ...result, validation: { coverageScore: 1, driftWarning: false } };

  const [outputVector] = await embedBatch([result.content], {
    ...config,
    embedding: { good: true },
  });
  const similarity = cosineSimilarity(outputVector, originalMean);
  const driftWarning = similarity < t.coverageDriftThreshold;

  const clusterLabels = inv.clusters.map((cc) => cc.label).join(', ');
  const preview = result.content.slice(0, t.validatePreviewChars);

  const missingCheck = await llm(p.validate(clusterLabels, preview), {
    ...config,
    fast: true,
    cheap: true,
    onProgress: scopePhase(config.onProgress, 'validate'),
  });

  const missingTopics = missingCheck.toLowerCase().includes('none')
    ? []
    : missingCheck
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean);

  return {
    ...result,
    validation: {
      embeddingSimilarity: similarity,
      driftWarning,
      missingTopics,
      coverageScore:
        missingTopics.length === 0 ? 1 : 1 - missingTopics.length / inv.clusters.length,
    },
  };
}

// --- Top-level orchestrator ---

export default async function documentShrink(document, config = {}) {
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();

  const { mode, detail, targetSize, structured, shouldValidate, autoRetry, diagnostics } =
    await getOptions(runConfig, {
      mode: withPolicy(mapMode),
      detail: withPolicy(mapDetail),
      targetSize: DEFAULT_TARGET_SIZE,
      structured: false,
      shouldValidate: true,
      autoRetry: false,
      diagnostics: false,
    });

  const t = { ...TUNING_DEFAULTS, ...runConfig.tuning };
  const p = { ...PROMPT_DEFAULTS, ...runConfig.prompts };

  if (!document || document.length === 0) {
    emitter.complete({ outcome: Outcome.success });
    return {
      content: '',
      metadata: { originalSize: 0, finalSize: 0, topicCount: 0 },
    };
  }

  // targetSize is in chars; convert to words once and carry words throughout
  const targetWords = Math.round((targetSize * detail) / t.charsPerWord);

  try {
    emitter.emit({ event: DomainEvent.phase, phase: 'segment' });
    const chunks = segment(document, { headingDetectors: runConfig.headingDetectors });

    if (chunks.length === 0) {
      emitter.complete({ outcome: Outcome.success });
      const charTarget = targetWords * t.charsPerWord;
      return {
        content: document.slice(0, charTarget),
        metadata: {
          originalSize: document.length,
          finalSize: Math.min(document.length, charTarget),
          topicCount: 0,
        },
      };
    }

    const totalDocWords = chunks.reduce((s, c) => s + c.wordCount, 0);
    if (totalDocWords <= targetWords) {
      emitter.complete({ outcome: Outcome.success });
      return {
        content: document,
        metadata: { originalSize: document.length, finalSize: document.length, topicCount: 1 },
      };
    }

    emitter.emit({ event: DomainEvent.phase, phase: 'inventory' });
    const embeddingService = runConfig.embeddingService;
    if (!embeddingService) {
      throw new Error('document-shrink requires embeddingService. Call init({ embed: true }).');
    }
    const inv = await inventory(chunks, embeddingService, runConfig.clusterTuning);

    emitter.emit({ event: DomainEvent.phase, phase: 'characterize' });
    await characterize(inv, runConfig, t, p);

    // Reserve heading words before allocation
    const headingWords = inv.headings.reduce((s, h) => s + h.wordCount, 0);

    emitter.emit({ event: DomainEvent.phase, phase: 'allocate' });
    const queryEmbedding =
      mode === MODES.query && runConfig.query ? await embed(runConfig.query, runConfig) : undefined;
    const backgroundEmbeddings =
      mode === MODES.differential ? runConfig.backgroundEmbeddings : undefined;
    allocate(inv, targetWords, headingWords, mode, queryEmbedding, backgroundEmbeddings, t);

    emitter.emit({ event: DomainEvent.phase, phase: 'select' });
    const selection = select(inv, t);

    emitter.emit({ event: DomainEvent.phase, phase: 'reduce' });
    let result = await reduce(selection, inv, { ...runConfig, mode, structured }, t, p);

    if (shouldValidate) {
      emitter.emit({ event: DomainEvent.phase, phase: 'validate' });
      result = await validate(result, inv, runConfig, t, p);

      if (autoRetry && result.validation?.coverageScore < t.autoRetryCoverageThreshold) {
        emitter.emit({ event: DomainEvent.phase, phase: 'retry' });
        allocate(
          inv,
          Math.round(targetWords * t.autoRetryBudgetMultiplier),
          headingWords,
          mode,
          queryEmbedding,
          backgroundEmbeddings,
          t
        );
        const retrySelection = select(inv, t);
        result = await reduce(retrySelection, inv, { ...runConfig, mode, structured }, t, p);
        result = await validate(result, inv, runConfig, t, p);
      }
    }

    const metadata = {
      originalSize: document.length,
      finalSize: result.content.length,
      compressionRatio: (1 - result.content.length / document.length).toFixed(2),
      topicCount: inv.clusters.length,
      coverageScore: selection.coverageScore,
      clusterLabels: inv.clusters.map((cc) => cc.label),
      ...(result.validation || {}),
      ...(result.structured ? { structured: result.structured } : {}),
    };

    if (diagnostics) {
      metadata.internals = {
        targetWords,
        headingWords,
        totalDocWords,
        distanceStats: inv.distanceStats,
        derivedThreshold: inv.derivedThreshold,
        singleCluster: inv.singleCluster,
        clusters: selection.clusterDetails,
      };
    }

    emitter.complete({ outcome: Outcome.success, ...metadata });

    return { content: result.content, metadata };
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}
