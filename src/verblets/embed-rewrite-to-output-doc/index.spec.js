import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
}));

const { default: callLlm } = await import('../../lib/llm/index.js');
const { default: embedRewriteToOutputDoc } = await import('./index.js');

beforeEach(() => {
  callLlm.mockReset();
});

describe('embedRewriteToOutputDoc', () => {
  it('passes prompt and schema to callLlm', async () => {
    callLlm.mockResolvedValueOnce(
      'Photosynthesis is the process by which plants convert sunlight into energy.'
    );

    const result = await embedRewriteToOutputDoc('how does photosynthesis work');

    expect(result).toBe(
      'Photosynthesis is the process by which plants convert sunlight into energy.'
    );
    expect(callLlm).toHaveBeenCalledOnce();

    const [prompt, options] = callLlm.mock.calls[0];
    expect(prompt).toContain('how does photosynthesis work');
    expect(prompt).toContain('write a short passage');
    expect(options.response_format.json_schema.name).toBe('hyde_output_doc');
    expect(options.response_format.json_schema.schema.properties.value.type).toBe('string');
  });

  it('forwards llm config', async () => {
    callLlm.mockResolvedValueOnce('A passage about dogs.');

    await embedRewriteToOutputDoc('dogs', { llm: { fast: true } });

    const [, options] = callLlm.mock.calls[0];
    expect(options.llm).toEqual({ fast: true });
  });

  it('forwards extra options like logger', async () => {
    const logger = { log: vi.fn() };
    callLlm.mockResolvedValueOnce('A passage.');

    await embedRewriteToOutputDoc('query', { logger });

    const [, options] = callLlm.mock.calls[0];
    expect(options.logger).toBe(logger);
  });
});
