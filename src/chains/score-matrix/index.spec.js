import { beforeEach, vi, expect } from 'vitest';
import scoreMatrix, { normalizeRubric, mapAnchoring, scoreMatrixInstructions } from './index.js';
import llm from '../../lib/llm/index.js';
import createBatches from '../../lib/text-batch/index.js';
import { ChainEvent, DomainEvent, OpEvent } from '../../lib/progress/constants.js';
import { runTable, equals, partial, throws } from '../../lib/examples-runner/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
}));

vi.mock('../../lib/text-batch/index.js', () => ({ default: vi.fn() }));

vi.mock('../../lib/parallel-batch/index.js', () => ({
  default: vi.fn(async (items, processor) => {
    for (let i = 0; i < items.length; i++) await processor(items[i], i);
  }),
  parallelBatch: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  createBatches.mockReset();
  llm.mockReset();
});

const cell = (score, rationale = 'reason') => ({ score, rationale });
const row2 = (s1, s2) => [cell(s1), cell(s2)];
const rubric2 = [
  { dimension: 'clarity', description: 'How clear' },
  { dimension: 'depth', description: 'How deep' },
];

const llmMatrixResponse = (matrix, scale = { min: 0, max: 10 }) => ({ matrix, scale });

// ─── normalizeRubric ──────────────────────────────────────────────────────

runTable({
  describe: 'normalizeRubric',
  examples: [
    {
      name: 'converts string to single-dimension array',
      inputs: { rubric: 'How persuasive?' },
      check: equals([{ dimension: 'overall', description: 'How persuasive?' }]),
    },
    {
      name: 'passes through valid dimension array',
      inputs: { rubric: [{ dimension: 'a' }, { dimension: 'b', description: 'desc' }] },
      check: ({ result, inputs }) => expect(result).toBe(inputs.rubric),
    },
    {
      name: 'rejects empty string',
      inputs: { rubric: '' },
      check: throws(/rubric string must not be empty/),
    },
    {
      name: 'rejects whitespace string',
      inputs: { rubric: '  ' },
      check: throws(/rubric string must not be empty/),
    },
    {
      name: 'rejects empty array',
      inputs: { rubric: [] },
      check: throws(/non-empty string or array/),
    },
    {
      name: 'rejects non-array non-string number',
      inputs: { rubric: 42 },
      check: throws(/non-empty string or array/),
    },
    {
      name: 'rejects undefined',
      inputs: { rubric: undefined },
      check: throws(/non-empty string or array/),
    },
    {
      name: 'rejects dimension objects missing the dimension field',
      inputs: { rubric: [{ description: 'no dim' }] },
      check: throws(/rubric\[0\] is missing required "dimension"/),
    },
    {
      name: 'reports the index of the bad element',
      inputs: { rubric: [{ dimension: 'ok' }, { name: 'bad' }] },
      check: throws(/rubric\[1\]/),
    },
  ],
  process: ({ rubric }) => normalizeRubric(rubric),
});

// ─── mapAnchoring ─────────────────────────────────────────────────────────

runTable({
  describe: 'mapAnchoring',
  examples: [
    { name: 'low', inputs: { v: 'low' }, check: equals('none') },
    { name: 'high', inputs: { v: 'high' }, check: equals('rich') },
    { name: 'undefined', inputs: { v: undefined }, check: equals('default') },
    { name: 'unknown', inputs: { v: 'banana' }, check: equals('default') },
  ],
  process: ({ v }) => mapAnchoring(v),
});

// ─── scoreMatrixInstructions ──────────────────────────────────────────────

runTable({
  describe: 'scoreMatrixInstructions',
  examples: [
    {
      name: 'returns instruction bundle with rubric and default text',
      inputs: { rubric: rubric2 },
      check: ({ result }) => {
        expect(result.text).toContain('Evaluate');
        expect(result.rubric).toBe(rubric2);
      },
    },
    {
      name: 'allows text override',
      inputs: { rubric: rubric2, text: 'Custom instruction' },
      check: partial({ text: 'Custom instruction' }),
    },
    {
      name: 'includes anchors when provided',
      inputs: { rubric: rubric2, anchors: 'anchor data' },
      check: partial({ anchors: 'anchor data' }),
    },
    {
      name: 'omits anchors key when not provided',
      inputs: { rubric: rubric2 },
      check: ({ result }) => expect('anchors' in result).toBe(false),
    },
    {
      name: 'passes through additional context keys',
      inputs: { rubric: rubric2, domain: 'medicine' },
      check: partial({ domain: 'medicine' }),
    },
  ],
  process: (params) => scoreMatrixInstructions(params),
});

// ─── default export (scoreMatrix) ─────────────────────────────────────────

runTable({
  describe: 'scoreMatrix (default export)',
  examples: [
    {
      name: 'scores items against a multi-dimension rubric',
      inputs: {
        items: ['a', 'b'],
        rubric: rubric2,
        instructions: 'Score carefully',
        preMock: () => {
          createBatches.mockReturnValueOnce([{ items: ['a', 'b'], startIndex: 0 }]);
          llm.mockResolvedValueOnce(llmMatrixResponse([row2(7, 3), row2(5, 9)]));
        },
      },
      check: ({ result }) => {
        expect(llm).toHaveBeenCalledWith(
          expect.stringContaining('rubric-dimensions'),
          expect.objectContaining({
            responseFormat: expect.objectContaining({
              type: 'json_schema',
              json_schema: expect.objectContaining({ name: 'score_matrix_result' }),
            }),
          })
        );
        expect(result.matrix).toEqual([row2(7, 3), row2(5, 9)]);
        expect(result.dimensions).toEqual(['clarity', 'depth']);
        expect(result.scale).toEqual({ min: 0, max: 10 });
      },
    },
    {
      name: 'includes instruction in prompt when provided',
      inputs: {
        items: ['x'],
        rubric: [{ dimension: 'd1' }],
        instructions: 'Be harsh',
        preMock: () => {
          createBatches.mockReturnValueOnce([{ items: ['x'], startIndex: 0 }]);
          llm.mockResolvedValueOnce(llmMatrixResponse([[cell(8)]]));
        },
      },
      check: () => {
        const prompt = llm.mock.calls[0][0];
        expect(prompt).toContain('Be harsh');
        expect(prompt).toContain('<instruction>');
      },
    },
    {
      name: 'works without instruction (config-only second arg)',
      inputs: {
        items: ['x'],
        rubric: [{ dimension: 'd1' }],
        instructions: { temperature: 0.5 },
        preMock: () => {
          createBatches.mockReturnValueOnce([{ items: ['x'], startIndex: 0 }]);
          llm.mockResolvedValueOnce(llmMatrixResponse([[cell(5)]]));
        },
      },
      check: ({ result }) => expect(result.matrix).toEqual([[cell(5)]]),
    },
    {
      name: 'normalizes string rubric to single dimension',
      inputs: {
        items: ['x'],
        rubric: 'How clear?',
        preMock: () => {
          createBatches.mockReturnValueOnce([{ items: ['x'], startIndex: 0 }]);
          llm.mockResolvedValueOnce(llmMatrixResponse([[cell(6)]]));
        },
      },
      check: ({ result }) => {
        expect(result.dimensions).toEqual(['overall']);
        expect(result.matrix[0]).toHaveLength(1);
      },
    },
    {
      name: 'returns empty matrix for empty items without LLM call',
      inputs: { items: [], rubric: rubric2 },
      check: ({ result }) => {
        expect(llm).not.toHaveBeenCalled();
        expect(createBatches).not.toHaveBeenCalled();
        expect(result.matrix).toEqual([]);
        expect(result.dimensions).toEqual(['clarity', 'depth']);
        expect(result.scale).toEqual({ min: 0, max: 10 });
      },
    },
    {
      name: 'bakes row and column cardinality into the dynamic schema',
      inputs: {
        items: ['a', 'b', 'c'],
        rubric: rubric2,
        preMock: () => {
          createBatches.mockReturnValueOnce([{ items: ['a', 'b', 'c'], startIndex: 0 }]);
          llm.mockResolvedValueOnce(llmMatrixResponse([row2(1, 2), row2(3, 4), row2(5, 6)]));
        },
      },
      check: () => {
        const schema = llm.mock.calls[0][1].responseFormat.json_schema.schema;
        expect(schema.properties.matrix.minItems).toBe(3);
        expect(schema.properties.matrix.maxItems).toBe(3);
        expect(schema.properties.matrix.items.minItems).toBe(2);
        expect(schema.properties.matrix.items.maxItems).toBe(2);
      },
    },
  ],
  process: async ({ items, rubric, instructions, preMock }) => {
    if (preMock) preMock();
    return scoreMatrix(items, rubric, instructions);
  },
});

// ─── multi-batch anchoring ────────────────────────────────────────────────

runTable({
  describe: 'multi-batch anchoring',
  examples: [
    {
      name: 'uses first batch scores as anchors for subsequent batches',
      inputs: {
        items: ['a', 'b', 'c', 'd'],
        rubric: rubric2,
        preMock: () => {
          createBatches.mockReturnValueOnce([
            { items: ['a', 'b'], startIndex: 0 },
            { items: ['c', 'd'], startIndex: 2 },
          ]);
          llm
            .mockResolvedValueOnce(llmMatrixResponse([row2(2, 8), row2(9, 1)]))
            .mockResolvedValueOnce(llmMatrixResponse([row2(5, 5), row2(4, 6)]));
        },
      },
      check: ({ result }) => {
        expect(llm).toHaveBeenCalledTimes(2);
        expect(llm.mock.calls[1][0]).toContain('scoring-anchors');
        expect(result.matrix).toHaveLength(4);
      },
    },
    {
      name: 'omits anchors when anchoring is low',
      inputs: {
        items: ['a', 'b', 'c'],
        rubric: rubric2,
        instructions: { anchoring: 'low' },
        preMock: () => {
          createBatches.mockReturnValueOnce([
            { items: ['a', 'b'], startIndex: 0 },
            { items: ['c'], startIndex: 2 },
          ]);
          llm
            .mockResolvedValueOnce(llmMatrixResponse([row2(3, 7), row2(8, 2)]))
            .mockResolvedValueOnce(llmMatrixResponse([row2(5, 5)]));
        },
      },
      check: () => expect(llm.mock.calls[1][0]).not.toContain('scoring-anchors'),
    },
    {
      name: 'uses provided anchors and skips first-batch anchor generation',
      inputs: {
        items: ['a', 'b'],
        rubric: [{ dimension: 'd1' }],
        instructions: { text: 'score', anchors: 'pre-built anchor text' },
        preMock: () => {
          createBatches.mockReturnValueOnce([
            { items: ['a'], startIndex: 0 },
            { items: ['b'], startIndex: 1 },
          ]);
          llm
            .mockResolvedValueOnce(llmMatrixResponse([[cell(5)]]))
            .mockResolvedValueOnce(llmMatrixResponse([[cell(7)]]));
        },
      },
      check: () => {
        expect(llm.mock.calls[0][0]).toContain('pre-built anchor text');
        expect(llm.mock.calls[1][0]).toContain('pre-built anchor text');
      },
    },
  ],
  process: async ({ items, rubric, instructions, preMock }) => {
    if (preMock) preMock();
    return scoreMatrix(items, rubric, instructions);
  },
});

// ─── retry / error handling ───────────────────────────────────────────────

runTable({
  describe: 'scoreMatrix — retry and error handling',
  examples: [
    {
      name: 'retries rows when LLM returns malformed matrix',
      inputs: {
        items: ['a', 'b', 'c'],
        rubric: rubric2,
        preMock: () => {
          createBatches
            .mockReturnValueOnce([{ items: ['a', 'b', 'c'], startIndex: 0 }])
            .mockReturnValueOnce([{ items: ['b'], startIndex: 0 }]);
          llm
            .mockResolvedValueOnce(
              llmMatrixResponse([
                row2(5, 5),
                [{ score: 'not-a-number', rationale: 'bad' }],
                row2(7, 7),
              ])
            )
            .mockResolvedValueOnce(llmMatrixResponse([row2(6, 6)]));
        },
      },
      check: ({ result }) => {
        expect(result.matrix[0]).toEqual(row2(5, 5));
        expect(result.matrix[1]).toEqual(row2(6, 6));
        expect(result.matrix[2]).toEqual(row2(7, 7));
      },
    },
    {
      name: 'returns undefined for failed rows after retries exhaust',
      inputs: {
        items: ['a', 'b'],
        rubric: rubric2,
        instructions: { maxAttempts: 1 },
        preMock: () => {
          createBatches.mockReturnValueOnce([{ items: ['a', 'b'], startIndex: 0 }]);
          llm.mockResolvedValueOnce(llmMatrixResponse([row2(5, 5), undefined]));
        },
      },
      check: ({ result }) => {
        expect(result.matrix[0]).toEqual(row2(5, 5));
        expect(result.matrix[1]).toBeUndefined();
      },
    },
    {
      name: 'contains batch errors without throwing in resilient mode',
      inputs: {
        items: ['a', 'b'],
        rubric: [{ dimension: 'd1' }],
        instructions: { maxAttempts: 2 },
        preMock: () => {
          createBatches.mockReturnValueOnce([
            { items: ['a'], startIndex: 0 },
            { items: ['b'], startIndex: 1 },
          ]);
          llm
            .mockResolvedValueOnce(llmMatrixResponse([[cell(8)]]))
            .mockRejectedValueOnce(new Error('500'));
          createBatches.mockReturnValueOnce([{ items: ['b'], startIndex: 0 }]);
          llm.mockRejectedValueOnce(new Error('500'));
        },
      },
      check: ({ result }) => {
        expect(result.matrix[0]).toEqual([cell(8)]);
        expect(result.matrix[1]).toBeUndefined();
      },
    },
    {
      name: 'throws when every row fails',
      inputs: {
        items: ['a', 'b'],
        rubric: [{ dimension: 'd1' }],
        instructions: { maxAttempts: 1 },
        preMock: () => {
          createBatches.mockReturnValueOnce([{ items: ['a', 'b'], startIndex: 0 }]);
          llm.mockRejectedValue(new Error('500'));
        },
      },
      check: throws(/all 2 rows failed/),
    },
  ],
  process: async ({ items, rubric, instructions, preMock }) => {
    if (preMock) preMock();
    return scoreMatrix(items, rubric, instructions);
  },
});

// ─── progress events ─────────────────────────────────────────────────────

runTable({
  describe: 'scoreMatrix — progress events',
  examples: [
    {
      name: 'emits full lifecycle: start, input, phase, output, complete',
      inputs: {
        items: ['a', 'b'],
        rubric: rubric2,
        preMock: () => {
          createBatches.mockReturnValueOnce([{ items: ['a', 'b'], startIndex: 0 }]);
          llm.mockResolvedValueOnce(llmMatrixResponse([row2(5, 5), row2(7, 7)]));
        },
      },
      check: ({ result }) => {
        const start = result.events.find(
          (e) => e.step === 'score-matrix' && e.event === ChainEvent.start
        );
        expect(start).toBeDefined();
        const input = result.events.find(
          (e) => e.step === 'score-matrix' && e.event === DomainEvent.input
        );
        expect(input.value).toEqual(['a', 'b']);
        const scoring = result.events.find(
          (e) => e.event === DomainEvent.phase && e.phase === 'scoring-matrix'
        );
        expect(scoring).toBeDefined();
        const output = result.events.find(
          (e) => e.step === 'score-matrix' && e.event === DomainEvent.output
        );
        expect(output.value).toEqual({ rows: 2, columns: 2 });
        const complete = result.events.find(
          (e) => e.step === 'score-matrix' && e.event === ChainEvent.complete
        );
        expect(complete).toMatchObject({
          totalItems: 2,
          successCount: 2,
          outcome: 'success',
        });
      },
    },
    {
      name: 'reports partial outcome when rows fail',
      inputs: {
        items: ['a', 'b'],
        rubric: rubric2,
        instructions: { maxAttempts: 1 },
        preMock: () => {
          createBatches.mockReturnValueOnce([{ items: ['a', 'b'], startIndex: 0 }]);
          llm.mockResolvedValueOnce(llmMatrixResponse([row2(5, 5)]));
        },
      },
      check: ({ result }) => {
        const complete = result.events.find(
          (e) => e.step === 'score-matrix' && e.event === ChainEvent.complete
        );
        expect(complete).toMatchObject({ outcome: 'partial', failedItems: 1 });
      },
    },
    {
      name: 'emits batch progress and anchors-established on multi-batch',
      inputs: {
        items: ['a', 'b', 'c'],
        rubric: rubric2,
        preMock: () => {
          createBatches.mockReturnValueOnce([
            { items: ['a', 'b'], startIndex: 0 },
            { items: ['c'], startIndex: 2 },
          ]);
          llm
            .mockResolvedValueOnce(llmMatrixResponse([row2(2, 8), row2(9, 1)]))
            .mockResolvedValueOnce(llmMatrixResponse([row2(5, 5)]));
        },
      },
      check: ({ result }) => {
        const anchors = result.events.find(
          (e) => e.event === DomainEvent.phase && e.phase === 'anchors-established'
        );
        expect(anchors).toBeDefined();
        const batches = result.events.filter((e) => e.event === OpEvent.batchComplete);
        expect(batches.length).toBeGreaterThan(0);
      },
    },
  ],
  process: async ({ items, rubric, instructions, preMock }) => {
    if (preMock) preMock();
    const events = [];
    await scoreMatrix(items, rubric, {
      ...(typeof instructions === 'object' && !Array.isArray(instructions) ? instructions : {}),
      onProgress: (e) => events.push(e),
    });
    return { events };
  },
});

// ─── knownTexts ──────────────────────────────────────────────────────────

runTable({
  describe: 'scoreMatrix — knownTexts',
  examples: [
    {
      name: 'declares anchors as a known text key',
      inputs: {},
      check: () => expect(scoreMatrix.knownTexts).toEqual(['anchors']),
    },
  ],
  process: () => undefined,
});
