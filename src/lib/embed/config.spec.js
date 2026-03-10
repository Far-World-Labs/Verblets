import { describe, it, expect, vi, beforeEach } from 'vitest';

// The embed module reads env.VERBLETS_EMBED_MODEL lazily (inside getExtractor).
// We mock the pipeline import to capture which model name is resolved.

describe('embed model configuration', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('defaults to mixedbread-ai/mxbai-embed-xsmall-v1 when VERBLETS_EMBED_MODEL is unset', async () => {
    let capturedModel;
    vi.doMock('@huggingface/transformers', () => ({
      pipeline: vi.fn((task, model) => {
        capturedModel = model;
        return Promise.resolve(() => ({}));
      }),
    }));

    const { embedWarmup } = await import('./index.js');
    await embedWarmup();

    expect(capturedModel).toBe('mixedbread-ai/mxbai-embed-xsmall-v1');
  });

  it('reads VERBLETS_EMBED_MODEL override from env', async () => {
    vi.stubEnv('VERBLETS_EMBED_MODEL', 'custom/model-v2');

    let capturedModel;
    vi.doMock('@huggingface/transformers', () => ({
      pipeline: vi.fn((task, model) => {
        capturedModel = model;
        return Promise.resolve(() => ({}));
      }),
    }));

    const { embedWarmup } = await import('./index.js');
    await embedWarmup();

    expect(capturedModel).toBe('custom/model-v2');
  });
});
