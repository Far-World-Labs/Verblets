import { describe, expect, it, vi } from 'vitest';
import fillMissing, { mapCreativity } from './index.js';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn().mockResolvedValue({
    template: 'The {animal} jumps over the {object}.',
    variables: {
      animal: { original: '???', candidate: 'fox', confidence: 0.9 },
      object: { original: '???', candidate: 'fence', confidence: 0.8 },
    },
  }),
}));

describe('mapCreativity', () => {
  it('returns undefined when undefined', () => {
    expect(mapCreativity(undefined)).toBeUndefined();
  });

  it('maps low to conservative guidance', () => {
    const guidance = mapCreativity('low');
    expect(guidance).toContain('conservative');
    expect(guidance).toContain('[UNKNOWN]');
  });

  it('maps high to speculative guidance', () => {
    const guidance = mapCreativity('high');
    expect(guidance).toContain('speculative');
    expect(guidance).toContain('best educated guess');
  });

  it('returns undefined on unknown string', () => {
    expect(mapCreativity('wild')).toBeUndefined();
  });
});

describe('fillMissing verblet', () => {
  it('returns imputed text structure', async () => {
    const result = await fillMissing('The ??? jumps over the ???.');
    expect(result).toStrictEqual({
      template: 'The {animal} jumps over the {object}.',
      variables: {
        animal: { original: '???', candidate: 'fox', confidence: 0.9 },
        object: { original: '???', candidate: 'fence', confidence: 0.8 },
      },
    });
  });

  it('injects conservative guidance with creativity low', async () => {
    const llm = (await import('../../lib/llm/index.js')).default;

    await fillMissing('Missing ??? text', { creativity: 'low' });
    const prompt = llm.mock.calls.at(-1)[0];
    expect(prompt).toContain('conservative');
    expect(prompt).toContain('[UNKNOWN]');
  });

  it('injects speculative guidance with creativity high', async () => {
    const llm = (await import('../../lib/llm/index.js')).default;

    await fillMissing('Missing ??? text', { creativity: 'high' });
    const prompt = llm.mock.calls.at(-1)[0];
    expect(prompt).toContain('speculative');
    expect(prompt).toContain('best educated guess');
  });

  it('omits creativity guidance when not specified', async () => {
    const llm = (await import('../../lib/llm/index.js')).default;

    await fillMissing('Missing ??? text');
    const prompt = llm.mock.calls.at(-1)[0];
    expect(prompt).not.toContain('conservative');
    expect(prompt).not.toContain('speculative');
  });

  it('uses JSON schema validation', async () => {
    const llm = (await import('../../lib/llm/index.js')).default;

    await fillMissing('Missing ??? text');
    const options = llm.mock.calls[0][1];
    expect(options).toHaveProperty('response_format');
    expect(options.response_format.type).toBe('json_schema');
    expect(options.response_format.json_schema.name).toBe('fill_missing_result');
  });
});
