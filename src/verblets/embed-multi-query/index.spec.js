import { describe, it, expect, vi, beforeEach } from 'vitest';
import embedMultiQuery, { mapDivergence } from './index.js';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
}));

const { default: mockLlm } = await import('../../lib/llm/index.js');

beforeEach(() => {
  mockLlm.mockReset();
});

describe('mapDivergence', () => {
  it('returns undefined when undefined', () => {
    expect(mapDivergence(undefined)).toBeUndefined();
  });

  it('maps low to tight-paraphrase guidance', () => {
    const guidance = mapDivergence('low');
    expect(guidance).toContain('Stay close');
    expect(guidance).toContain('similar phrasing');
  });

  it('maps high to maximum-diversity guidance', () => {
    const guidance = mapDivergence('high');
    expect(guidance).toContain('Maximize diversity');
    expect(guidance).toContain('contrasting terminology');
  });

  it('returns undefined on unknown string', () => {
    expect(mapDivergence('turbo')).toBeUndefined();
  });
});

describe('embedMultiQuery', () => {
  it('calls LLM with query and count in prompt and returns array', async () => {
    const variants = [
      'How do plants photosynthesize?',
      'Plant energy conversion from sunlight',
      'Photosynthesis mechanism in green plants',
    ];
    mockLlm.mockResolvedValueOnce(variants);

    const result = await embedMultiQuery('how do plants make food');

    expect(mockLlm).toHaveBeenCalledTimes(1);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(3);

    const prompt = mockLlm.mock.calls[0][0];
    expect(prompt).toContain('how do plants make food');
    expect(prompt).toContain('3'); // default count
    expect(prompt).toContain('diverse search queries');
  });

  it('uses items schema for auto-unwrapping', async () => {
    mockLlm.mockResolvedValueOnce([]);

    await embedMultiQuery('test query');

    const callConfig = mockLlm.mock.calls[0][1];
    const schema = callConfig.modelOptions.response_format.json_schema.schema;
    expect(schema.properties).toHaveProperty('items');
    expect(schema.properties.items.type).toBe('array');
    expect(schema.properties.items.items.type).toBe('string');
    expect(schema.required).toContain('items');
  });

  it('uses default count of 3', async () => {
    mockLlm.mockResolvedValueOnce([]);

    await embedMultiQuery('query');

    const prompt = mockLlm.mock.calls[0][0];
    expect(prompt).toContain('Generate 3 diverse');
  });

  it('passes custom count to prompt', async () => {
    mockLlm.mockResolvedValueOnce([]);

    await embedMultiQuery('query', { count: 5 });

    const prompt = mockLlm.mock.calls[0][0];
    expect(prompt).toContain('Generate 5 diverse');
  });

  it('passes llm config through to modelOptions', async () => {
    mockLlm.mockResolvedValueOnce([]);

    await embedMultiQuery('query', { llm: { modelName: 'test-model' } });

    const callConfig = mockLlm.mock.calls[0][1];
    expect(callConfig.llm).toEqual({ modelName: 'test-model' });
  });

  it('injects low divergence guidance into prompt', async () => {
    mockLlm.mockResolvedValueOnce([]);

    await embedMultiQuery('query', { divergence: 'low' });

    const prompt = mockLlm.mock.calls[0][0];
    expect(prompt).toContain('Stay close');
    expect(prompt).toContain('similar phrasing');
  });

  it('injects high divergence guidance into prompt', async () => {
    mockLlm.mockResolvedValueOnce([]);

    await embedMultiQuery('query', { divergence: 'high' });

    const prompt = mockLlm.mock.calls[0][0];
    expect(prompt).toContain('Maximize diversity');
  });

  it('omits divergence guidance when not specified', async () => {
    mockLlm.mockResolvedValueOnce([]);

    await embedMultiQuery('query');

    const prompt = mockLlm.mock.calls[0][0];
    expect(prompt).not.toContain('Stay close');
    expect(prompt).not.toContain('Maximize diversity');
  });

  it('passes logger through to LLM call', async () => {
    const logger = { info: vi.fn() };
    mockLlm.mockResolvedValueOnce([]);

    await embedMultiQuery('query', { logger });

    const callConfig = mockLlm.mock.calls[0][1];
    expect(callConfig.logger).toBe(logger);
  });
});
