import { beforeEach, describe, expect, it, vi } from 'vitest';
import scoreMatrix, { normalizeRubric, mapAnchoring, scoreMatrixInstructions } from './index.js';
import llm from '../../lib/llm/index.js';
import createBatches from '../../lib/text-batch/index.js';
import { ChainEvent, DomainEvent, OpEvent } from '../../lib/progress/constants.js';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
}));

vi.mock('../../lib/text-batch/index.js', () => ({
  default: vi.fn(),
}));

vi.mock('../../lib/parallel-batch/index.js', () => ({
  default: vi.fn(async (items, processor) => {
    for (let i = 0; i < items.length; i++) {
      await processor(items[i], i);
    }
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

function llmMatrixResponse(matrix, scale = { min: 0, max: 10 }) {
  return { matrix, scale };
}

describe('score-matrix chain', () => {
  describe('normalizeRubric', () => {
    it('converts string to single-dimension array', () => {
      const result = normalizeRubric('How persuasive?');
      expect(result).toEqual([{ dimension: 'overall', description: 'How persuasive?' }]);
    });

    it('passes through valid dimension array', () => {
      const rubric = [{ dimension: 'a' }, { dimension: 'b', description: 'desc' }];
      expect(normalizeRubric(rubric)).toBe(rubric);
    });

    it('rejects empty string', () => {
      expect(() => normalizeRubric('')).toThrow(/rubric string must not be empty/);
      expect(() => normalizeRubric('  ')).toThrow(/rubric string must not be empty/);
    });

    it('rejects empty array', () => {
      expect(() => normalizeRubric([])).toThrow(/non-empty string or array/);
    });

    it('rejects non-array non-string', () => {
      expect(() => normalizeRubric(42)).toThrow(/non-empty string or array/);
      expect(() => normalizeRubric(undefined)).toThrow(/non-empty string or array/);
    });

    it('rejects dimension objects missing the dimension field', () => {
      expect(() => normalizeRubric([{ description: 'no dim' }])).toThrow(
        /rubric\[0\] is missing required "dimension"/
      );
    });

    it('reports the index of the bad element', () => {
      expect(() => normalizeRubric([{ dimension: 'ok' }, { name: 'bad' }])).toThrow(/rubric\[1\]/);
    });
  });

  describe('mapAnchoring', () => {
    it('maps low to none', () => expect(mapAnchoring('low')).toBe('none'));
    it('maps high to rich', () => expect(mapAnchoring('high')).toBe('rich'));
    it('maps undefined to default', () => expect(mapAnchoring(undefined)).toBe('default'));
    it('maps unknown values to default', () => expect(mapAnchoring('banana')).toBe('default'));
  });

  describe('scoreMatrixInstructions', () => {
    it('returns instruction bundle with rubric and default text', () => {
      const bundle = scoreMatrixInstructions({ rubric: rubric2 });
      expect(bundle.text).toContain('Evaluate');
      expect(bundle.rubric).toBe(rubric2);
    });

    it('allows text override', () => {
      const bundle = scoreMatrixInstructions({ rubric: rubric2, text: 'Custom instruction' });
      expect(bundle.text).toBe('Custom instruction');
    });

    it('includes anchors when provided', () => {
      const bundle = scoreMatrixInstructions({ rubric: rubric2, anchors: 'anchor data' });
      expect(bundle.anchors).toBe('anchor data');
    });

    it('omits anchors key when not provided', () => {
      const bundle = scoreMatrixInstructions({ rubric: rubric2 });
      expect('anchors' in bundle).toBe(false);
    });

    it('passes through additional context keys', () => {
      const bundle = scoreMatrixInstructions({ rubric: rubric2, domain: 'medicine' });
      expect(bundle.domain).toBe('medicine');
    });
  });

  describe('default export', () => {
    it('scores items against a multi-dimension rubric', async () => {
      createBatches.mockReturnValueOnce([{ items: ['a', 'b'], startIndex: 0 }]);
      llm.mockResolvedValueOnce(llmMatrixResponse([row2(7, 3), row2(5, 9)]));

      const result = await scoreMatrix(['a', 'b'], rubric2, 'Score carefully');

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
    });

    it('includes instruction in prompt when provided', async () => {
      createBatches.mockReturnValueOnce([{ items: ['x'], startIndex: 0 }]);
      llm.mockResolvedValueOnce(llmMatrixResponse([[cell(8)]]));

      await scoreMatrix(['x'], [{ dimension: 'd1' }], 'Be harsh');

      const prompt = llm.mock.calls[0][0];
      expect(prompt).toContain('Be harsh');
      expect(prompt).toContain('<instruction>');
    });

    it('works without instruction (config-only second arg)', async () => {
      createBatches.mockReturnValueOnce([{ items: ['x'], startIndex: 0 }]);
      llm.mockResolvedValueOnce(llmMatrixResponse([[cell(5)]]));

      const result = await scoreMatrix(['x'], [{ dimension: 'd1' }], { temperature: 0.5 });

      expect(result.matrix).toEqual([[cell(5)]]);
    });

    it('normalizes string rubric to single dimension', async () => {
      createBatches.mockReturnValueOnce([{ items: ['x'], startIndex: 0 }]);
      llm.mockResolvedValueOnce(llmMatrixResponse([[cell(6)]]));

      const result = await scoreMatrix(['x'], 'How clear?');

      expect(result.dimensions).toEqual(['overall']);
      expect(result.matrix[0]).toHaveLength(1);
    });

    it('returns empty matrix for empty items without LLM call', async () => {
      const result = await scoreMatrix([], rubric2);

      expect(llm).not.toHaveBeenCalled();
      expect(createBatches).not.toHaveBeenCalled();
      expect(result.matrix).toEqual([]);
      expect(result.dimensions).toEqual(['clarity', 'depth']);
      expect(result.scale).toEqual({ min: 0, max: 10 });
    });

    it('bakes row and column cardinality into the dynamic schema', async () => {
      createBatches.mockReturnValueOnce([{ items: ['a', 'b', 'c'], startIndex: 0 }]);
      llm.mockResolvedValueOnce(llmMatrixResponse([row2(1, 2), row2(3, 4), row2(5, 6)]));

      await scoreMatrix(['a', 'b', 'c'], rubric2);

      const schema = llm.mock.calls[0][1].responseFormat.json_schema.schema;
      expect(schema.properties.matrix.minItems).toBe(3);
      expect(schema.properties.matrix.maxItems).toBe(3);
      expect(schema.properties.matrix.items.minItems).toBe(2);
      expect(schema.properties.matrix.items.maxItems).toBe(2);
    });
  });

  describe('multi-batch anchoring', () => {
    it('uses first batch scores as anchors for subsequent batches', async () => {
      createBatches.mockReturnValueOnce([
        { items: ['a', 'b'], startIndex: 0 },
        { items: ['c', 'd'], startIndex: 2 },
      ]);
      llm
        .mockResolvedValueOnce(llmMatrixResponse([row2(2, 8), row2(9, 1)]))
        .mockResolvedValueOnce(llmMatrixResponse([row2(5, 5), row2(4, 6)]));

      const result = await scoreMatrix(['a', 'b', 'c', 'd'], rubric2);

      expect(llm).toHaveBeenCalledTimes(2);
      const secondPrompt = llm.mock.calls[1][0];
      expect(secondPrompt).toContain('scoring-anchors');
      expect(result.matrix).toHaveLength(4);
    });

    it('omits anchors when anchoring is low', async () => {
      createBatches.mockReturnValueOnce([
        { items: ['a', 'b'], startIndex: 0 },
        { items: ['c'], startIndex: 2 },
      ]);
      llm
        .mockResolvedValueOnce(llmMatrixResponse([row2(3, 7), row2(8, 2)]))
        .mockResolvedValueOnce(llmMatrixResponse([row2(5, 5)]));

      await scoreMatrix(['a', 'b', 'c'], rubric2, { anchoring: 'low' });

      const secondPrompt = llm.mock.calls[1][0];
      expect(secondPrompt).not.toContain('scoring-anchors');
    });

    it('uses provided anchors and skips first-batch anchor generation', async () => {
      createBatches.mockReturnValueOnce([
        { items: ['a'], startIndex: 0 },
        { items: ['b'], startIndex: 1 },
      ]);
      llm
        .mockResolvedValueOnce(llmMatrixResponse([[cell(5)]]))
        .mockResolvedValueOnce(llmMatrixResponse([[cell(7)]]));

      await scoreMatrix(['a', 'b'], [{ dimension: 'd1' }], {
        text: 'score',
        anchors: 'pre-built anchor text',
      });

      const firstPrompt = llm.mock.calls[0][0];
      const secondPrompt = llm.mock.calls[1][0];
      expect(firstPrompt).toContain('pre-built anchor text');
      expect(secondPrompt).toContain('pre-built anchor text');
    });
  });

  describe('retry and error handling', () => {
    it('retries rows when LLM returns malformed matrix', async () => {
      createBatches
        .mockReturnValueOnce([{ items: ['a', 'b', 'c'], startIndex: 0 }])
        .mockReturnValueOnce([{ items: ['b'], startIndex: 0 }]);
      llm
        .mockResolvedValueOnce(
          llmMatrixResponse([
            row2(5, 5),
            [{ score: 'not-a-number', rationale: 'bad' }], // malformed row
            row2(7, 7),
          ])
        )
        .mockResolvedValueOnce(llmMatrixResponse([row2(6, 6)]));

      const result = await scoreMatrix(['a', 'b', 'c'], rubric2);

      expect(result.matrix[0]).toEqual(row2(5, 5));
      expect(result.matrix[1]).toEqual(row2(6, 6));
      expect(result.matrix[2]).toEqual(row2(7, 7));
    });

    it('returns undefined for failed rows after retries exhaust', async () => {
      createBatches.mockReturnValueOnce([{ items: ['a', 'b'], startIndex: 0 }]);
      llm.mockResolvedValueOnce(
        llmMatrixResponse([
          row2(5, 5),
          undefined, // missing row
        ])
      );

      const result = await scoreMatrix(['a', 'b'], rubric2, { maxAttempts: 1 });

      expect(result.matrix[0]).toEqual(row2(5, 5));
      expect(result.matrix[1]).toBeUndefined();
    });

    it('contains batch errors without throwing in resilient mode', async () => {
      createBatches.mockReturnValueOnce([
        { items: ['a'], startIndex: 0 },
        { items: ['b'], startIndex: 1 },
      ]);
      llm
        .mockResolvedValueOnce(llmMatrixResponse([[cell(8)]]))
        .mockRejectedValueOnce(new Error('500'));

      createBatches.mockReturnValueOnce([{ items: ['b'], startIndex: 0 }]);
      llm.mockRejectedValueOnce(new Error('500'));

      const result = await scoreMatrix(['a', 'b'], [{ dimension: 'd1' }], { maxAttempts: 2 });

      expect(result.matrix[0]).toEqual([cell(8)]);
      expect(result.matrix[1]).toBeUndefined();
    });

    it('throws when every row fails', async () => {
      createBatches.mockReturnValueOnce([{ items: ['a', 'b'], startIndex: 0 }]);
      llm.mockRejectedValue(new Error('500'));

      await expect(
        scoreMatrix(['a', 'b'], [{ dimension: 'd1' }], { maxAttempts: 1 })
      ).rejects.toThrow(/all 2 rows failed/);
    });
  });

  describe('progress events', () => {
    it('emits full lifecycle: start, input, phase, output, complete', async () => {
      createBatches.mockReturnValueOnce([{ items: ['a', 'b'], startIndex: 0 }]);
      llm.mockResolvedValueOnce(llmMatrixResponse([row2(5, 5), row2(7, 7)]));

      const events = [];
      await scoreMatrix(['a', 'b'], rubric2, { onProgress: (e) => events.push(e) });

      const chainStart = events.find(
        (e) => e.step === 'score-matrix' && e.event === ChainEvent.start
      );
      expect(chainStart).toBeDefined();

      const inputEvent = events.find(
        (e) => e.step === 'score-matrix' && e.event === DomainEvent.input
      );
      expect(inputEvent).toBeDefined();
      expect(inputEvent.value).toEqual(['a', 'b']);

      const scoringPhase = events.find(
        (e) => e.event === DomainEvent.phase && e.phase === 'scoring-matrix'
      );
      expect(scoringPhase).toBeDefined();

      const outputEvent = events.find(
        (e) => e.step === 'score-matrix' && e.event === DomainEvent.output
      );
      expect(outputEvent).toBeDefined();
      expect(outputEvent.value).toEqual({ rows: 2, columns: 2 });

      const chainComplete = events.find(
        (e) => e.step === 'score-matrix' && e.event === ChainEvent.complete
      );
      expect(chainComplete).toBeDefined();
      expect(chainComplete.totalItems).toBe(2);
      expect(chainComplete.successCount).toBe(2);
      expect(chainComplete.outcome).toBe('success');
    });

    it('reports partial outcome when rows fail', async () => {
      createBatches.mockReturnValueOnce([{ items: ['a', 'b'], startIndex: 0 }]);
      llm.mockResolvedValueOnce(llmMatrixResponse([row2(5, 5)])); // only 1 of 2 rows

      const events = [];
      await scoreMatrix(['a', 'b'], rubric2, {
        onProgress: (e) => events.push(e),
        maxAttempts: 1,
      });

      const complete = events.find(
        (e) => e.step === 'score-matrix' && e.event === ChainEvent.complete
      );
      expect(complete.outcome).toBe('partial');
      expect(complete.failedItems).toBe(1);
    });

    it('emits batch progress and anchors-established on multi-batch', async () => {
      createBatches.mockReturnValueOnce([
        { items: ['a', 'b'], startIndex: 0 },
        { items: ['c'], startIndex: 2 },
      ]);
      llm
        .mockResolvedValueOnce(llmMatrixResponse([row2(2, 8), row2(9, 1)]))
        .mockResolvedValueOnce(llmMatrixResponse([row2(5, 5)]));

      const events = [];
      await scoreMatrix(['a', 'b', 'c'], rubric2, { onProgress: (e) => events.push(e) });

      const anchorsPhase = events.find(
        (e) => e.event === DomainEvent.phase && e.phase === 'anchors-established'
      );
      expect(anchorsPhase).toBeDefined();

      const batchEvents = events.filter((e) => e.event === OpEvent.batchComplete);
      expect(batchEvents.length).toBeGreaterThan(0);
    });
  });

  describe('knownTexts', () => {
    it('declares anchors as a known text key', () => {
      expect(scoreMatrix.knownTexts).toEqual(['anchors']);
    });
  });
});
