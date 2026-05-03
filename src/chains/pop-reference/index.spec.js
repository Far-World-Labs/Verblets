import { beforeEach, describe, expect, it, vi } from 'vitest';
import popReferenceItem, { mapPopReference, mapPopReferenceParallel } from './index.js';
import {
  popReferenceVariants,
  popReferenceWithCount,
} from '../../lib/test-utils/factories/pop-reference.js';
import { runTable } from '../../lib/examples-runner/index.js';
import llm from '../../lib/llm/index.js';
import map from '../map/index.js';

// ─── mocks ────────────────────────────────────────────────────────────────

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
}));

vi.mock('../map/index.js', () => ({ default: vi.fn() }));

vi.mock('../../lib/parallel-batch/index.js', () => ({
  default: vi.fn(async (items, processor) => {
    for (let i = 0; i < items.length; i++) await processor(items[i], i);
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── popReferenceItem result-shape table ──────────────────────────────────
//
// Each row stages an LLM response via the pop-reference factory variants
// (or `popReferenceWithCount` for arbitrary sizes) and asserts on the count
// the chain returns. Variant naming aligns with the project-wide vocabulary
// in src/lib/test-utils/factories/variants.js.

const itemCountExamples = [
  {
    name: 'returns each reference the LLM produced (single)',
    inputs: { mockResponse: () => popReferenceWithCount(1) },
    want: 1,
  },
  {
    name: 'returns each reference the LLM produced (many)',
    inputs: { mockResponse: () => popReferenceWithCount(5) },
    want: 5,
  },
  {
    name: 'returns empty array when the LLM finds nothing',
    inputs: { mockResponse: popReferenceVariants.empty },
    want: 0,
  },
  {
    name: 'throws when the LLM returns null',
    inputs: { mockResponse: popReferenceVariants.isNull },
    want: { throws: 'object' },
  },
  {
    name: 'throws when the LLM returns a malformed shape',
    inputs: { mockResponse: popReferenceVariants.malformedShape },
    want: { throws: 'array' },
  },
  {
    name: 'throws on empty sentence (boundary validation)',
    inputs: { sentence: '', mockResponse: popReferenceVariants.wellFormed },
    want: { throws: 'sentence must be a non-empty string' },
  },
];

const itemCountProcessor = async ({
  sentence = 'She finally made a decision',
  description = 'pivotal moment',
  options,
  mockResponse,
}) => {
  llm.mockResolvedValue(mockResponse());
  const result = await popReferenceItem(sentence, description, options);
  return result.length;
};

runTable({
  describe: 'popReferenceItem: result count',
  examples: itemCountExamples,
  process: itemCountProcessor,
});

// ─── popReferenceItem prompt construction ─────────────────────────────────
//
// Prompt-shape assertions don't fit the want/got compare cleanly — they
// inspect call args, not return values. Kept imperative.

describe('popReferenceItem: prompt construction', () => {
  it('mentions sources when include is provided', async () => {
    llm.mockResolvedValue(popReferenceVariants.wellFormed());
    await popReferenceItem('any sentence', 'desc', { include: ['The Office'] });
    expect(llm).toHaveBeenCalledWith(expect.stringContaining('<sources>'), expect.any(Object));
  });

  it('formats weighted sources with focus percentage', async () => {
    llm.mockResolvedValue(popReferenceVariants.wellFormed());
    await popReferenceItem('any sentence', 'desc', {
      include: [
        { reference: 'Internet Memes', percent: 80 },
        { reference: 'The Office', percent: 20 },
      ],
    });
    expect(llm).toHaveBeenCalledWith(
      expect.stringContaining('Internet Memes (focus 80%)'),
      expect.any(Object)
    );
  });

  it('respects referencesPerSource', async () => {
    llm.mockResolvedValue(popReferenceVariants.wellFormed());
    await popReferenceItem('any sentence', 'desc', { referencesPerSource: 3 });
    expect(llm).toHaveBeenCalledWith(
      expect.stringContaining('Find 3 references per source'),
      expect.any(Object)
    );
  });
});

// ─── mapPopReferenceParallel ──────────────────────────────────────────────

describe('mapPopReferenceParallel', () => {
  it('runs popReferenceItem per sentence with one shared description', async () => {
    llm
      .mockResolvedValueOnce(popReferenceWithCount(1))
      .mockResolvedValueOnce(popReferenceVariants.empty());
    const result = await mapPopReferenceParallel(['s1', 's2'], 'shared description');
    expect(result).toHaveLength(2);
    expect(result[0]).toHaveLength(1);
    expect(result[1]).toEqual([]);
    expect(llm).toHaveBeenCalledTimes(2);
  });

  it('reports partial outcome when one sentence fails', async () => {
    llm
      .mockResolvedValueOnce(popReferenceVariants.empty())
      .mockRejectedValueOnce(new Error('boom'));
    const events = [];
    const result = await mapPopReferenceParallel(['ok', 'bad'], 'desc', {
      maxAttempts: 1,
      onProgress: (e) => events.push(e),
    });
    expect(result[0]).toEqual([]);
    expect(result[1]).toBeUndefined();
    const complete = events.find(
      (e) => e.event === 'chain:complete' && e.step === 'pop-reference:parallel'
    );
    expect(complete.outcome).toBe('partial');
  });

  it('throws when sentences is not an array', async () => {
    await expect(mapPopReferenceParallel('not-an-array', 'd')).rejects.toThrow(/must be an array/);
  });
});

// ─── mapPopReference (batched) ────────────────────────────────────────────

describe('mapPopReference (batched)', () => {
  it('routes through map() with the pop-reference batch responseFormat', async () => {
    vi.mocked(map).mockResolvedValueOnce([popReferenceWithCount(1), popReferenceVariants.empty()]);
    const result = await mapPopReference(['s1', 's2'], 'description');
    expect(result).toHaveLength(2);
    expect(result[0][0].reference).toBeTruthy();
    expect(result[1]).toEqual([]);
    const mapConfig = vi.mocked(map).mock.calls[0][2];
    expect(mapConfig.responseFormat?.json_schema?.name).toBe('pop_reference_batch');
  });

  it('throws when sentences is not an array', async () => {
    await expect(mapPopReference('not-an-array', 'd')).rejects.toThrow(/must be an array/);
  });
});
