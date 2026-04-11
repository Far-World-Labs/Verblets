import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock loaders — we never want actual model downloads in tests
vi.mock('./loaders.js', () => ({
  loadPipeline: vi.fn(async (def) => ({
    embedTexts: vi.fn(async (texts) => texts.map(() => new Float32Array(def.dimensions || 384))),
    embedImages: undefined,
    dimensions: def.dimensions || 384,
  })),
  loadClip: vi.fn(async (def) => ({
    embedTexts: vi.fn(async (texts) => texts.map(() => new Float32Array(def.dimensions || 512))),
    embedImages: vi.fn(async (inputs) => inputs.map(() => new Float32Array(def.dimensions || 512))),
    dimensions: def.dimensions || 512,
  })),
}));

const { EmbeddingService, resolveEmbedding } = await import('./index.js');

describe('EmbeddingService', () => {
  let service;

  beforeEach(() => {
    service = new EmbeddingService();
  });

  describe('negotiate', () => {
    it('returns CLIP model as default (catch-all)', () => {
      const model = service.negotiate({});
      expect(model.loader).toBe('clip');
    });

    it('returns pipeline model when good requested without multi', () => {
      const model = service.negotiate({ good: true });
      expect(model.loader).toBe('pipeline');
    });

    it('returns CLIP when multi explicitly requested', () => {
      const model = service.negotiate({ multi: true });
      expect(model.loader).toBe('clip');
    });

    it('returns CLIP when both good and multi requested', () => {
      const model = service.negotiate({ good: true, multi: true });
      expect(model.loader).toBe('clip');
    });

    it('ignores fast capability (no rules match on it)', () => {
      const model = service.negotiate({ fast: true });
      expect(model.loader).toBe('clip');
    });

    it('returns CLIP for prefer good (soft preference satisfies rule)', () => {
      const model = service.negotiate({ good: 'prefer' });
      // 'prefer' satisfies the good:true condition, and multi:false condition
      // fails because multi is not requested — so pipeline matches
      expect(model.loader).toBe('pipeline');
    });
  });

  describe('getModel', () => {
    it('resolves built-in catalog models by name', () => {
      const model = service.getModel('Xenova/clip-vit-base-patch16');
      expect(model.dimensions).toBe(512);
      expect(model.loader).toBe('clip');
    });

    it('returns undefined for unknown model', () => {
      const model = service.getModel('nonexistent/model');
      expect(model).toBeUndefined();
    });
  });

  describe('addModels', () => {
    it('adds custom models that take precedence over catalog', () => {
      service.addModels({
        'custom/embed-v1': { dimensions: 256, loader: 'pipeline', dtype: 'fp32' },
      });
      const model = service.getModel('custom/embed-v1');
      expect(model.name).toBe('custom/embed-v1');
      expect(model.dimensions).toBe(256);
    });
  });

  describe('setRules', () => {
    it('replaces default rules entirely', () => {
      service.addModels({
        'custom/embed-v1': { dimensions: 256, loader: 'pipeline', dtype: 'fp32' },
      });
      service.setRules([{ use: 'custom/embed-v1' }]);
      const model = service.negotiate({});
      expect(model.name).toBe('custom/embed-v1');
    });
  });

  describe('getDefaultModel', () => {
    it('returns the catch-all model', () => {
      const model = service.getDefaultModel();
      expect(model.loader).toBe('clip');
    });
  });

  describe('getLoader', () => {
    it('returns a loader with embedTexts for pipeline models', async () => {
      const model = service.negotiate({ good: true });
      const loader = await service.getLoader(model.name);
      expect(typeof loader.embedTexts).toBe('function');
      expect(loader.embedImages).toBeUndefined();
    });

    it('returns a loader with embedTexts and embedImages for clip models', async () => {
      const model = service.negotiate({ multi: true });
      const loader = await service.getLoader(model.name);
      expect(typeof loader.embedTexts).toBe('function');
      expect(typeof loader.embedImages).toBe('function');
    });

    it('caches loaders by model name', async () => {
      const model = service.negotiate({});
      const loader1 = service.getLoader(model.name);
      const loader2 = service.getLoader(model.name);
      expect(loader1).toBe(loader2);
    });

    it('throws for unknown model', () => {
      expect(() => service.getLoader('nonexistent/model')).toThrow('Unknown embedding model');
    });
  });
});

describe('resolveEmbedding', () => {
  it('returns empty caps for undefined input', () => {
    const { caps, modelName } = resolveEmbedding(undefined);
    expect(caps).toEqual({});
    expect(modelName).toBeUndefined();
  });

  it('extracts model name from string input', () => {
    const { modelName, caps } = resolveEmbedding('Xenova/clip-vit-base-patch16');
    expect(modelName).toBe('Xenova/clip-vit-base-patch16');
    expect(caps).toEqual({});
  });

  it('extracts capability flags from object', () => {
    const { caps, modelName } = resolveEmbedding({ good: true, multi: true });
    expect(caps).toEqual({ good: true, multi: true });
    expect(modelName).toBeUndefined();
  });

  it('separates modelName from capabilities', () => {
    const { modelName, caps } = resolveEmbedding({
      modelName: 'custom/model',
      good: true,
    });
    expect(modelName).toBe('custom/model');
    expect(caps).toEqual({ good: true });
  });

  it('passes all keys through as caps (negotiation ignores unknowns)', () => {
    const { caps } = resolveEmbedding({ good: true, unknownFlag: true });
    expect(caps).toEqual({ good: true, unknownFlag: true });
  });
});
