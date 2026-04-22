import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { DomainEvent, OpEvent, Outcome, ErrorPosture } from '../../lib/progress/constants.js';
import { createBatches, parallel, retry } from '../../lib/index.js';
import { nameStep, getOptions, withPolicy } from '../../lib/context/option.js';
import { resolveArgs, resolveTexts } from '../../lib/instruction/index.js';
import resultSchema from './score-matrix-result.json' with { type: 'json' };

const name = 'score-matrix';
const DEFAULT_SCALE = { min: 0, max: 10 };

export const mapAnchoring = (value) => {
  if (value === undefined) return 'default';
  return { low: 'none', med: 'default', high: 'rich' }[value] ?? 'default';
};

export function normalizeRubric(rubric) {
  if (typeof rubric === 'string') {
    if (!rubric.trim()) throw new Error('score-matrix: rubric string must not be empty');
    return [{ dimension: 'overall', description: rubric }];
  }
  if (!Array.isArray(rubric) || rubric.length === 0) {
    throw new Error(
      'score-matrix: rubric must be a non-empty string or array of { dimension, description? }'
    );
  }
  const badIndex = rubric.findIndex((d) => !d?.dimension);
  if (badIndex !== -1) {
    throw new Error(`score-matrix: rubric[${badIndex}] is missing required "dimension" field`);
  }
  return rubric;
}

function buildDynamicSchema(numItems, numDimensions) {
  return {
    ...resultSchema,
    properties: {
      ...resultSchema.properties,
      matrix: {
        ...resultSchema.properties.matrix,
        minItems: numItems,
        maxItems: numItems,
        items: {
          ...resultSchema.properties.matrix.items,
          minItems: numDimensions,
          maxItems: numDimensions,
        },
      },
    },
  };
}

function buildPrompt(items, dimensions, instruction, scale) {
  const itemsList = items.map((item, i) => `${i + 1}. ${item}`).join('\n');
  const dimensionsList = dimensions
    .map((d, i) => `${i + 1}. ${d.dimension}${d.description ? `: ${d.description}` : ''}`)
    .join('\n');

  const parts = [
    'Score each item against each rubric dimension independently.',
    asXML(itemsList, { tag: 'items' }),
    asXML(dimensionsList, { tag: 'rubric-dimensions' }),
  ];

  if (instruction) parts.push(asXML(instruction, { tag: 'instruction' }));

  parts.push(`SCORING RULES:
- Use a numeric scale from ${scale.min} to ${scale.max}.
- Score each dimension in complete isolation. A score on one dimension must NOT influence the score on another.
- Provide a concise, specific rationale for every score.

Return a matrix with exactly ${items.length} row(s) (one per item, in order) and ${dimensions.length} column(s) (one per dimension, in order).
Also return a scale object with the min and max values you used.`);

  return parts.filter(Boolean).join('\n\n');
}

function buildAnchors(batchItems, matrix, dimensions, anchoring) {
  if (anchoring === 'none') return '';

  const paired = batchItems
    .map((item, i) => ({
      item: String(item),
      row: matrix[i],
      avg: matrix[i]
        ? matrix[i].reduce((sum, cell) => sum + (cell?.score ?? 0), 0) / matrix[i].length
        : 0,
    }))
    .filter((p) => p.row && p.row.every((cell) => Number.isFinite(cell?.score)))
    .toSorted((a, b) => a.avg - b.avg);

  if (paired.length < 2) return '';

  let anchors;
  if (anchoring === 'rich') {
    const count = Math.min(3, Math.ceil(paired.length / 4));
    const mid = Math.floor(paired.length / 2);
    const medianItems = paired.slice(Math.max(0, mid - 1), mid + 1);
    const combined = [...paired.slice(0, count), ...medianItems, ...paired.slice(-count)];
    const seen = new Set();
    anchors = combined.filter((a) => {
      if (seen.has(a.item)) return false;
      seen.add(a.item);
      return true;
    });
  } else {
    const count = Math.min(2, Math.ceil(paired.length / 3));
    anchors = [...paired.slice(0, count), ...paired.slice(-count)];
  }

  const dimNames = dimensions.map((d) => d.dimension);
  const formatRow = (row) => dimNames.map((n, i) => `${n}: ${row[i]?.score}`).join(', ');

  return `\nUse these scored examples as calibration anchors:\n${asXML(
    anchors.map((a) => `[${formatRow(a.row)}] ${a.item}`).join('\n'),
    { tag: 'scoring-anchors' }
  )}`;
}

function alignMatrix(matrix, expectedRows, expectedCols) {
  const arr = Array.isArray(matrix) ? matrix : [];
  const isValidCell = (c) =>
    c && typeof c === 'object' && Number.isFinite(c.score) && typeof c.rationale === 'string';
  const isValidRow = (r) => Array.isArray(r) && r.length === expectedCols && r.every(isValidCell);

  if (arr.length === expectedRows && arr.every(isValidRow)) return arr;

  return Array.from({ length: expectedRows }, (_, i) =>
    i < arr.length && isValidRow(arr[i]) ? arr[i] : undefined
  );
}

async function scoreBatch(batchItems, dimensions, instruction, scale, anchorBlock, batchConfig) {
  const prompt = anchorBlock
    ? `${buildPrompt(batchItems, dimensions, instruction, scale)}\n${anchorBlock}`
    : buildPrompt(batchItems, dimensions, instruction, scale);

  const dynamicSchema = buildDynamicSchema(batchItems.length, dimensions.length);
  const responseFormat = jsonSchema('score_matrix_result', dynamicSchema);

  const response = await callLlm(prompt, { ...batchConfig, responseFormat });
  return alignMatrix(response?.matrix, batchItems.length, dimensions.length);
}

async function matrixOnce(list, dimensions, instruction, scale, batchConfig, opts) {
  const { maxParallel, errorPosture, onProgress, anchoring, _providedAnchors } = opts;

  const batches = await createBatches(list, { ...batchConfig, outputRatio: 4 });
  const results = Array.from({ length: list.length });

  const emitter = createProgressEmitter('score-matrix', onProgress, opts);
  const batchDone = emitter.batch(list.length);
  emitter.progress({
    event: OpEvent.start,
    totalItems: list.length,
    totalBatches: batches.length,
    maxParallel,
  });

  let anchorBlock = _providedAnchors || '';
  let parallelStart = 0;

  if (!_providedAnchors && batches.length > 0) {
    const first = batches[0];
    try {
      const rows = await retry(
        () => scoreBatch(first.items, dimensions, instruction, scale, '', batchConfig),
        { label: 'score-matrix:batch', config: opts, onProgress: scopePhase(onProgress, 'batch') }
      );
      rows.forEach((row, j) => {
        results[first.startIndex + j] = row;
      });
      anchorBlock = buildAnchors(first.items, rows, dimensions, anchoring);
      emitter.emit({ event: DomainEvent.phase, phase: 'anchors-established' });
    } catch (error) {
      emitter.error(error, { batchIndex: 0, itemCount: first.items.length });
      if (errorPosture === ErrorPosture.strict) throw error;
    }
    batchDone(first.items.length);
    parallelStart = 1;
  }

  if (parallelStart < batches.length) {
    await parallel(
      batches.slice(parallelStart),
      async ({ items, startIndex }) => {
        try {
          const rows = await retry(
            () => scoreBatch(items, dimensions, instruction, scale, anchorBlock, batchConfig),
            {
              label: 'score-matrix:batch',
              config: opts,
              onProgress: scopePhase(onProgress, 'batch'),
            }
          );
          rows.forEach((row, j) => {
            results[startIndex + j] = row;
          });
        } catch (error) {
          emitter.error(error, { itemCount: items.length });
          if (errorPosture === ErrorPosture.strict) throw error;
        }
        batchDone(items.length);
      },
      { maxParallel, errorPosture, label: 'score-matrix batches', abortSignal: opts.abortSignal }
    );
  }

  emitter.progress({
    event: OpEvent.complete,
    totalItems: list.length,
    processedItems: batchDone.count,
  });

  return results;
}

export function scoreMatrixInstructions({ rubric, text, anchors, ...context }) {
  return {
    text: text ?? 'Evaluate each item against all rubric dimensions',
    rubric,
    ...(anchors ? { anchors } : {}),
    ...context,
  };
}

export default async function scoreMatrix(items, rubric, instructions, config) {
  [instructions, config] = resolveArgs(instructions, config, ['anchors']);
  const { text, known, context } = resolveTexts(instructions, ['anchors']);
  const effectiveInstruction = context ? `${text}\n\n${context}` : text;

  const dimensions = normalizeRubric(rubric);
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start({ dimensions: dimensions.length });
  emitter.emit({ event: DomainEvent.input, value: items });

  if (items.length === 0) {
    emitter.complete({ rows: 0, columns: dimensions.length, outcome: Outcome.success });
    return { matrix: [], dimensions: dimensions.map((d) => d.dimension), scale: DEFAULT_SCALE };
  }

  const { maxParallel, maxAttempts, temperature, errorPosture, anchoring } = await getOptions(
    runConfig,
    {
      maxParallel: 3,
      maxAttempts: 2,
      temperature: 0,
      errorPosture: ErrorPosture.resilient,
      anchoring: withPolicy(mapAnchoring),
    }
  );

  const batchConfig = { ...runConfig, temperature };
  const passOptions = {
    ...runConfig,
    maxParallel,
    maxAttempts,
    errorPosture,
    anchoring,
    _providedAnchors: known.anchors,
  };

  emitter.emit({ event: DomainEvent.phase, phase: 'scoring-matrix' });

  const results = await matrixOnce(
    items,
    dimensions,
    effectiveInstruction,
    DEFAULT_SCALE,
    batchConfig,
    passOptions
  );

  for (let attempt = 1; attempt < maxAttempts; attempt += 1) {
    const missingIdx = [];
    const missingItems = [];
    results.forEach((val, idx) => {
      if (val == null) {
        missingIdx.push(idx);
        missingItems.push(items[idx]);
      }
    });
    if (missingItems.length === 0) break;

    emitter.emit({
      event: DomainEvent.phase,
      phase: 'retrying-missing',
      count: missingItems.length,
      attempt,
    });

    const retryResults = await matrixOnce(
      missingItems,
      dimensions,
      effectiveInstruction,
      DEFAULT_SCALE,
      batchConfig,
      { ...passOptions, now: new Date() }
    );
    retryResults.forEach((val, i) => {
      if (val !== undefined) results[missingIdx[i]] = val;
    });
  }

  const matrix = results.map(
    (row) =>
      row ?? dimensions.map(() => ({ score: DEFAULT_SCALE.min, rationale: 'scoring failed' }))
  );
  const successCount = results.filter((r) => r !== undefined).length;
  const failedItems = results.length - successCount;
  const outcome = failedItems > 0 ? Outcome.partial : Outcome.success;

  emitter.emit({
    event: DomainEvent.output,
    value: { rows: matrix.length, columns: dimensions.length },
  });
  emitter.complete({ totalItems: items.length, successCount, failedItems, outcome });

  return {
    matrix,
    dimensions: dimensions.map((d) => d.dimension),
    scale: DEFAULT_SCALE,
  };
}

scoreMatrix.knownTexts = ['anchors'];
