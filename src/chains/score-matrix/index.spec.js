import { beforeEach, vi, expect } from 'vitest';
import scoreMatrix, { normalizeRubric, mapAnchoring, scoreMatrixInstructions } from './index.js';
import llm from '../../lib/llm/index.js';
import createBatches from '../../lib/text-batch/index.js';
import { ChainEvent, DomainEvent, OpEvent } from '../../lib/progress/constants.js';
import { runTable } from '../../lib/examples-runner/index.js';

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

runTable({
  describe: 'normalizeRubric',
  examples: [
    {
      name: 'converts string to single-dimension array',
      inputs: { rubric: 'How persuasive?' },
      want: { value: [{ dimension: 'overall', description: 'How persuasive?' }] },
    },
    {
      name: 'passes through valid dimension array',
      inputs: { rubric: [{ dimension: 'a' }, { dimension: 'b', description: 'desc' }] },
      want: { sameRef: true },
    },
    {
      name: 'rejects empty string',
      inputs: { rubric: '' },
      want: { throws: /rubric string must not be empty/ },
    },
    {
      name: 'rejects whitespace string',
      inputs: { rubric: '  ' },
      want: { throws: /rubric string must not be empty/ },
    },
    {
      name: 'rejects empty array',
      inputs: { rubric: [] },
      want: { throws: /non-empty string or array/ },
    },
    {
      name: 'rejects non-array non-string number',
      inputs: { rubric: 42 },
      want: { throws: /non-empty string or array/ },
    },
    {
      name: 'rejects undefined',
      inputs: { rubric: undefined },
      want: { throws: /non-empty string or array/ },
    },
    {
      name: 'rejects dimension objects missing the dimension field',
      inputs: { rubric: [{ description: 'no dim' }] },
      want: { throws: /rubric\[0\] is missing required "dimension"/ },
    },
    {
      name: 'reports the index of the bad element',
      inputs: { rubric: [{ dimension: 'ok' }, { name: 'bad' }] },
      want: { throws: /rubric\[1\]/ },
    },
  ],
  process: ({ inputs }) => normalizeRubric(inputs.rubric),
  expects: ({ result, error, inputs, want }) => {
    if (want.throws) {
      expect(error?.message).toMatch(want.throws);
      return;
    }
    if (error) throw error;
    if (want.value) expect(result).toEqual(want.value);
    if (want.sameRef) expect(result).toBe(inputs.rubric);
  },
});

runTable({
  describe: 'mapAnchoring',
  examples: [
    { name: 'low', inputs: { v: 'low' }, want: { value: 'none' } },
    { name: 'high', inputs: { v: 'high' }, want: { value: 'rich' } },
    { name: 'undefined', inputs: { v: undefined }, want: { value: 'default' } },
    { name: 'unknown', inputs: { v: 'banana' }, want: { value: 'default' } },
  ],
  process: ({ inputs }) => mapAnchoring(inputs.v),
  expects: ({ result, want }) => expect(result).toEqual(want.value),
});

runTable({
  describe: 'scoreMatrixInstructions',
  examples: [
    {
      name: 'returns instruction bundle with rubric and default text',
      inputs: { rubric: rubric2 },
      want: { textContains: 'Evaluate', sameRubric: true },
    },
    {
      name: 'allows text override',
      inputs: { rubric: rubric2, text: 'Custom instruction' },
      want: { matches: { text: 'Custom instruction' } },
    },
    {
      name: 'includes anchors when provided',
      inputs: { rubric: rubric2, anchors: 'anchor data' },
      want: { matches: { anchors: 'anchor data' } },
    },
    {
      name: 'omits anchors key when not provided',
      inputs: { rubric: rubric2 },
      want: { noAnchors: true },
    },
    {
      name: 'passes through additional context keys',
      inputs: { rubric: rubric2, domain: 'medicine' },
      want: { matches: { domain: 'medicine' } },
    },
  ],
  process: ({ inputs }) => scoreMatrixInstructions(inputs),
  expects: ({ result, inputs, want }) => {
    if (want.textContains) expect(result.text).toContain(want.textContains);
    if (want.sameRubric) expect(result.rubric).toBe(inputs.rubric);
    if (want.matches) expect(result).toMatchObject(want.matches);
    if (want.noAnchors) expect('anchors' in result).toBe(false);
  },
});

runTable({
  describe: 'scoreMatrix (default export)',
  examples: [
    {
      name: 'scores items against a multi-dimension rubric',
      inputs: {
        items: ['a', 'b'],
        rubric: rubric2,
        instructions: 'Score carefully',
        setupMock: () => {
          createBatches.mockReturnValueOnce([{ items: ['a', 'b'], startIndex: 0 }]);
          llm.mockResolvedValueOnce(llmMatrixResponse([row2(7, 3), row2(5, 9)]));
        },
      },
      want: {
        matrix: [row2(7, 3), row2(5, 9)],
        dimensions: ['clarity', 'depth'],
        scale: { min: 0, max: 10 },
        llmCalledWithSchema: true,
      },
    },
    {
      name: 'includes instruction in prompt when provided',
      inputs: {
        items: ['x'],
        rubric: [{ dimension: 'd1' }],
        instructions: 'Be harsh',
        setupMock: () => {
          createBatches.mockReturnValueOnce([{ items: ['x'], startIndex: 0 }]);
          llm.mockResolvedValueOnce(llmMatrixResponse([[cell(8)]]));
        },
      },
      want: { promptContains: ['Be harsh', '<instruction>'] },
    },
    {
      name: 'works without instruction (config-only second arg)',
      inputs: {
        items: ['x'],
        rubric: [{ dimension: 'd1' }],
        instructions: { temperature: 0.5 },
        setupMock: () => {
          createBatches.mockReturnValueOnce([{ items: ['x'], startIndex: 0 }]);
          llm.mockResolvedValueOnce(llmMatrixResponse([[cell(5)]]));
        },
      },
      want: { matrix: [[cell(5)]] },
    },
    {
      name: 'normalizes string rubric to single dimension',
      inputs: {
        items: ['x'],
        rubric: 'How clear?',
        setupMock: () => {
          createBatches.mockReturnValueOnce([{ items: ['x'], startIndex: 0 }]);
          llm.mockResolvedValueOnce(llmMatrixResponse([[cell(6)]]));
        },
      },
      want: { dimensions: ['overall'], firstRowLength: 1 },
    },
    {
      name: 'returns empty matrix for empty items without LLM call',
      inputs: { items: [], rubric: rubric2 },
      want: {
        matrix: [],
        dimensions: ['clarity', 'depth'],
        scale: { min: 0, max: 10 },
        noLlm: true,
        noBatches: true,
      },
    },
    {
      name: 'bakes row and column cardinality into the dynamic schema',
      inputs: {
        items: ['a', 'b', 'c'],
        rubric: rubric2,
        setupMock: () => {
          createBatches.mockReturnValueOnce([{ items: ['a', 'b', 'c'], startIndex: 0 }]);
          llm.mockResolvedValueOnce(llmMatrixResponse([row2(1, 2), row2(3, 4), row2(5, 6)]));
        },
      },
      want: { schemaRows: 3, schemaCols: 2 },
    },
  ],
  process: async ({ inputs }) => {
    inputs.setupMock?.();
    return scoreMatrix(inputs.items, inputs.rubric, inputs.instructions);
  },
  expects: ({ result, want }) => {
    if (want.llmCalledWithSchema) {
      expect(llm).toHaveBeenCalledWith(
        expect.stringContaining('rubric-dimensions'),
        expect.objectContaining({
          responseFormat: expect.objectContaining({
            type: 'json_schema',
            json_schema: expect.objectContaining({ name: 'score_matrix_result' }),
          }),
        })
      );
    }
    if (want.matrix) expect(result.matrix).toEqual(want.matrix);
    if (want.dimensions) expect(result.dimensions).toEqual(want.dimensions);
    if (want.scale) expect(result.scale).toEqual(want.scale);
    if (want.promptContains) {
      const prompt = llm.mock.calls[0][0];
      for (const fragment of want.promptContains) expect(prompt).toContain(fragment);
    }
    if (want.firstRowLength) expect(result.matrix[0]).toHaveLength(want.firstRowLength);
    if (want.noLlm) expect(llm).not.toHaveBeenCalled();
    if (want.noBatches) expect(createBatches).not.toHaveBeenCalled();
    if (want.schemaRows && want.schemaCols) {
      const schema = llm.mock.calls[0][1].responseFormat.json_schema.schema;
      expect(schema.properties.matrix.minItems).toBe(want.schemaRows);
      expect(schema.properties.matrix.maxItems).toBe(want.schemaRows);
      expect(schema.properties.matrix.items.minItems).toBe(want.schemaCols);
      expect(schema.properties.matrix.items.maxItems).toBe(want.schemaCols);
    }
  },
});

runTable({
  describe: 'multi-batch anchoring',
  examples: [
    {
      name: 'uses first batch scores as anchors for subsequent batches',
      inputs: {
        items: ['a', 'b', 'c', 'd'],
        rubric: rubric2,
        setupMock: () => {
          createBatches.mockReturnValueOnce([
            { items: ['a', 'b'], startIndex: 0 },
            { items: ['c', 'd'], startIndex: 2 },
          ]);
          llm
            .mockResolvedValueOnce(llmMatrixResponse([row2(2, 8), row2(9, 1)]))
            .mockResolvedValueOnce(llmMatrixResponse([row2(5, 5), row2(4, 6)]));
        },
      },
      want: { llmCalls: 2, secondPromptContains: 'scoring-anchors', matrixLen: 4 },
    },
    {
      name: 'omits anchors when anchoring is low',
      inputs: {
        items: ['a', 'b', 'c'],
        rubric: rubric2,
        instructions: { anchoring: 'low' },
        setupMock: () => {
          createBatches.mockReturnValueOnce([
            { items: ['a', 'b'], startIndex: 0 },
            { items: ['c'], startIndex: 2 },
          ]);
          llm
            .mockResolvedValueOnce(llmMatrixResponse([row2(3, 7), row2(8, 2)]))
            .mockResolvedValueOnce(llmMatrixResponse([row2(5, 5)]));
        },
      },
      want: { secondPromptNotContains: 'scoring-anchors' },
    },
    {
      name: 'uses provided anchors and skips first-batch anchor generation',
      inputs: {
        items: ['a', 'b'],
        rubric: [{ dimension: 'd1' }],
        instructions: { text: 'score', anchors: 'pre-built anchor text' },
        setupMock: () => {
          createBatches.mockReturnValueOnce([
            { items: ['a'], startIndex: 0 },
            { items: ['b'], startIndex: 1 },
          ]);
          llm
            .mockResolvedValueOnce(llmMatrixResponse([[cell(5)]]))
            .mockResolvedValueOnce(llmMatrixResponse([[cell(7)]]));
        },
      },
      want: { bothPromptsContain: 'pre-built anchor text' },
    },
  ],
  process: async ({ inputs }) => {
    inputs.setupMock?.();
    return scoreMatrix(inputs.items, inputs.rubric, inputs.instructions);
  },
  expects: ({ result, want }) => {
    if ('llmCalls' in want) expect(llm).toHaveBeenCalledTimes(want.llmCalls);
    if (want.secondPromptContains) {
      expect(llm.mock.calls[1][0]).toContain(want.secondPromptContains);
    }
    if (want.secondPromptNotContains) {
      expect(llm.mock.calls[1][0]).not.toContain(want.secondPromptNotContains);
    }
    if (want.matrixLen) expect(result.matrix).toHaveLength(want.matrixLen);
    if (want.bothPromptsContain) {
      expect(llm.mock.calls[0][0]).toContain(want.bothPromptsContain);
      expect(llm.mock.calls[1][0]).toContain(want.bothPromptsContain);
    }
  },
});

runTable({
  describe: 'scoreMatrix — retry and error handling',
  examples: [
    {
      name: 'retries rows when LLM returns malformed matrix',
      inputs: {
        items: ['a', 'b', 'c'],
        rubric: rubric2,
        setupMock: () => {
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
      want: { rowsEqual: { 0: row2(5, 5), 1: row2(6, 6), 2: row2(7, 7) } },
    },
    {
      name: 'returns undefined for failed rows after retries exhaust',
      inputs: {
        items: ['a', 'b'],
        rubric: rubric2,
        instructions: { maxAttempts: 1 },
        setupMock: () => {
          createBatches.mockReturnValueOnce([{ items: ['a', 'b'], startIndex: 0 }]);
          llm.mockResolvedValueOnce(llmMatrixResponse([row2(5, 5), undefined]));
        },
      },
      want: { rowsEqual: { 0: row2(5, 5) }, rowUndefined: 1 },
    },
    {
      name: 'contains batch errors without throwing in resilient mode',
      inputs: {
        items: ['a', 'b'],
        rubric: [{ dimension: 'd1' }],
        instructions: { maxAttempts: 2 },
        setupMock: () => {
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
      want: { rowsEqual: { 0: [cell(8)] }, rowUndefined: 1 },
    },
    {
      name: 'throws when every row fails',
      inputs: {
        items: ['a', 'b'],
        rubric: [{ dimension: 'd1' }],
        instructions: { maxAttempts: 1 },
        setupMock: () => {
          createBatches.mockReturnValueOnce([{ items: ['a', 'b'], startIndex: 0 }]);
          llm.mockRejectedValue(new Error('500'));
        },
      },
      want: { throws: /all 2 rows failed/ },
    },
  ],
  process: async ({ inputs }) => {
    inputs.setupMock?.();
    return scoreMatrix(inputs.items, inputs.rubric, inputs.instructions);
  },
  expects: ({ result, error, want }) => {
    if (want.throws) {
      expect(error?.message).toMatch(want.throws);
      return;
    }
    if (error) throw error;
    if (want.rowsEqual) {
      for (const [idx, value] of Object.entries(want.rowsEqual)) {
        expect(result.matrix[Number(idx)]).toEqual(value);
      }
    }
    if (want.rowUndefined !== undefined) {
      expect(result.matrix[want.rowUndefined]).toBeUndefined();
    }
  },
});

runTable({
  describe: 'scoreMatrix — progress events',
  examples: [
    {
      name: 'emits full lifecycle: start, input, phase, output, complete',
      inputs: {
        items: ['a', 'b'],
        rubric: rubric2,
        setupMock: () => {
          createBatches.mockReturnValueOnce([{ items: ['a', 'b'], startIndex: 0 }]);
          llm.mockResolvedValueOnce(llmMatrixResponse([row2(5, 5), row2(7, 7)]));
        },
      },
      want: { fullLifecycle: { items: ['a', 'b'], rows: 2, columns: 2 } },
    },
    {
      name: 'reports partial outcome when rows fail',
      inputs: {
        items: ['a', 'b'],
        rubric: rubric2,
        instructions: { maxAttempts: 1 },
        setupMock: () => {
          createBatches.mockReturnValueOnce([{ items: ['a', 'b'], startIndex: 0 }]);
          llm.mockResolvedValueOnce(llmMatrixResponse([row2(5, 5)]));
        },
      },
      want: { complete: { outcome: 'partial', failedItems: 1 } },
    },
    {
      name: 'emits batch progress and anchors-established on multi-batch',
      inputs: {
        items: ['a', 'b', 'c'],
        rubric: rubric2,
        setupMock: () => {
          createBatches.mockReturnValueOnce([
            { items: ['a', 'b'], startIndex: 0 },
            { items: ['c'], startIndex: 2 },
          ]);
          llm
            .mockResolvedValueOnce(llmMatrixResponse([row2(2, 8), row2(9, 1)]))
            .mockResolvedValueOnce(llmMatrixResponse([row2(5, 5)]));
        },
      },
      want: { anchorsAndBatches: true },
    },
  ],
  process: async ({ inputs }) => {
    inputs.setupMock?.();
    const events = [];
    await scoreMatrix(inputs.items, inputs.rubric, {
      ...(typeof inputs.instructions === 'object' && !Array.isArray(inputs.instructions)
        ? inputs.instructions
        : {}),
      onProgress: (e) => events.push(e),
    });
    return { events };
  },
  expects: ({ result, want }) => {
    if (want.fullLifecycle) {
      const start = result.events.find(
        (e) => e.step === 'score-matrix' && e.event === ChainEvent.start
      );
      expect(start).toBeDefined();
      const input = result.events.find(
        (e) => e.step === 'score-matrix' && e.event === DomainEvent.input
      );
      expect(input.value).toEqual(want.fullLifecycle.items);
      const scoring = result.events.find(
        (e) => e.event === DomainEvent.phase && e.phase === 'scoring-matrix'
      );
      expect(scoring).toBeDefined();
      const output = result.events.find(
        (e) => e.step === 'score-matrix' && e.event === DomainEvent.output
      );
      expect(output.value).toEqual({
        rows: want.fullLifecycle.rows,
        columns: want.fullLifecycle.columns,
      });
      const complete = result.events.find(
        (e) => e.step === 'score-matrix' && e.event === ChainEvent.complete
      );
      expect(complete).toMatchObject({
        totalItems: want.fullLifecycle.items.length,
        successCount: want.fullLifecycle.items.length,
        outcome: 'success',
      });
    }
    if (want.complete) {
      const complete = result.events.find(
        (e) => e.step === 'score-matrix' && e.event === ChainEvent.complete
      );
      expect(complete).toMatchObject(want.complete);
    }
    if (want.anchorsAndBatches) {
      const anchors = result.events.find(
        (e) => e.event === DomainEvent.phase && e.phase === 'anchors-established'
      );
      expect(anchors).toBeDefined();
      const batches = result.events.filter((e) => e.event === OpEvent.batchComplete);
      expect(batches.length).toBeGreaterThan(0);
    }
  },
});

runTable({
  describe: 'scoreMatrix — knownTexts',
  examples: [
    { name: 'declares anchors as a known text key', inputs: {}, want: { knownTexts: ['anchors'] } },
  ],
  process: () => undefined,
  expects: ({ want }) => {
    if (want.knownTexts) expect(scoreMatrix.knownTexts).toEqual(want.knownTexts);
  },
});
