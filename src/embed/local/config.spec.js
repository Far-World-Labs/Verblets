import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the EmbeddingService and loaders to avoid real model downloads
vi.mock('../../services/embedding-model/loaders.js', () => ({
  loadPipeline: vi.fn(async (def) => ({
    embedTexts: vi.fn(async (texts) =>
      texts.map(() => {
        const v = new Float32Array(def.dimensions || 384);
        v[0] = 1;
        return v;
      })
    ),
    embedImages: undefined,
    dimensions: def.dimensions || 384,
  })),
  loadClip: vi.fn(async (def) => ({
    embedTexts: vi.fn(async (texts) =>
      texts.map(() => {
        const v = new Float32Array(def.dimensions || 512);
        v[0] = 1;
        return v;
      })
    ),
    embedImages: vi.fn(async (inputs) =>
      inputs.map(() => {
        const v = new Float32Array(def.dimensions || 512);
        v[1] = 1;
        return v;
      })
    ),
    dimensions: def.dimensions || 512,
  })),
}));

describe('embed model configuration', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('throws when embed is not enabled and no service on config', async () => {
    const { embed, setEmbedEnabled } = await import('./index.js');
    setEmbedEnabled(false);
    await expect(embed('hello')).rejects.toThrow('Local embeddings are disabled');
  });

  it('works with global enable (backward compat)', async () => {
    const { embed, setEmbedEnabled } = await import('./index.js');
    setEmbedEnabled(true);
    const vec = await embed('hello');
    expect(vec).toBeInstanceOf(Float32Array);
  });

  it('uses embeddingService from config when provided', async () => {
    const { EmbeddingService } = await import('../../services/embedding-model/index.js');
    const { embed, setEmbedEnabled } = await import('./index.js');
    setEmbedEnabled(false); // disabled globally

    const service = new EmbeddingService();
    // Should work because config provides the service
    const vec = await embed('hello', { embeddingService: service });
    expect(vec).toBeInstanceOf(Float32Array);
  });

  it('defaults to CLIP (multi) model', async () => {
    const { embed, setEmbedEnabled } = await import('./index.js');
    setEmbedEnabled(true);
    const vec = await embed('hello');
    // Default CLIP produces 512-dim vectors
    expect(vec.length).toBe(512);
  });

  it('uses pipeline model when embedding: { good: true }', async () => {
    const { embed, setEmbedEnabled } = await import('./index.js');
    setEmbedEnabled(true);
    const vec = await embed('hello', { embedding: { good: true } });
    // Pipeline (mxbai) produces 384-dim vectors
    expect(vec.length).toBe(384);
  });

  it('embedImage auto-negotiates multi', async () => {
    const { embedImage, setEmbedEnabled } = await import('./index.js');
    setEmbedEnabled(true);
    const vec = await embedImage('https://example.com/photo.jpg');
    expect(vec).toBeInstanceOf(Float32Array);
    expect(vec.length).toBe(512);
  });

  it('embedImage throws for non-multi model', async () => {
    const { embedImage, setEmbedEnabled } = await import('./index.js');
    setEmbedEnabled(true);
    await expect(
      embedImage('https://example.com/photo.jpg', {
        embedding: 'mixedbread-ai/mxbai-embed-xsmall-v1',
      })
    ).rejects.toThrow('does not support image embedding');
  });

  it('embedBatch works with default model', async () => {
    const { embedBatch, setEmbedEnabled } = await import('./index.js');
    setEmbedEnabled(true);
    const vecs = await embedBatch(['hello', 'world']);
    expect(vecs).toHaveLength(2);
    expect(vecs[0]).toBeInstanceOf(Float32Array);
  });

  it('embedImageBatch embeds multiple images', async () => {
    const { embedImageBatch, setEmbedEnabled } = await import('./index.js');
    setEmbedEnabled(true);
    const vecs = await embedImageBatch(['img1.jpg', 'img2.jpg']);
    expect(vecs).toHaveLength(2);
    expect(vecs[0]).toBeInstanceOf(Float32Array);
  });
});
