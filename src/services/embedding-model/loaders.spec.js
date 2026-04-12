import { describe, it, expect, vi, beforeEach } from 'vitest';

// Fake tensor: { data: Float32Array, dims: [batch, dim] }
function fakeTensor(batchSize, dim) {
  const data = new Float32Array(batchSize * dim);
  for (let i = 0; i < data.length; i++) data[i] = (i % dim) / dim;
  return { data, dims: [batchSize, dim] };
}

const mockExtractor = vi.fn(async (texts) => {
  const dim = 384;
  const data = new Float32Array(texts.length * dim);
  for (let i = 0; i < data.length; i++) data[i] = (i % dim) / dim;
  return { data, dims: [texts.length, dim] };
});

const mockTokenizer = vi.fn((texts) => ({ input_ids: texts }));
const mockTextModel = vi.fn(async () => ({ text_embeds: fakeTensor(0, 512) }));
const mockProcessor = vi.fn(async (images) => ({ pixel_values: images }));
const mockVisionModel = vi.fn(async () => ({ image_embeds: fakeTensor(0, 512) }));

vi.mock('@huggingface/transformers', () => ({
  pipeline: vi.fn(async () => mockExtractor),
  AutoTokenizer: { from_pretrained: vi.fn(async () => mockTokenizer) },
  CLIPTextModelWithProjection: { from_pretrained: vi.fn(async () => mockTextModel) },
  AutoProcessor: { from_pretrained: vi.fn(async () => mockProcessor) },
  CLIPVisionModelWithProjection: { from_pretrained: vi.fn(async () => mockVisionModel) },
  RawImage: { read: vi.fn(async (input) => `loaded:${input}`) },
}));

const { loadPipeline, loadClip } = await import('./loaders.js');

describe('loadPipeline', () => {
  const modelDef = { name: 'test/pipeline', dimensions: 384, dtype: 'fp32' };

  beforeEach(() => {
    mockExtractor.mockClear();
    mockExtractor.mockImplementation(async (texts) => {
      const dim = 384;
      const data = new Float32Array(texts.length * dim);
      for (let i = 0; i < data.length; i++) data[i] = (i % dim) / dim;
      return { data, dims: [texts.length, dim] };
    });
  });

  it('returns all vectors for a single batch', async () => {
    const loader = await loadPipeline(modelDef);
    const texts = ['hello', 'world', 'test'];
    const vectors = await loader.embedTexts(texts);

    expect(vectors).toHaveLength(3);
    expect(vectors[0]).toBeInstanceOf(Float32Array);
    expect(vectors[0].length).toBe(384);
  });

  it('chunks large inputs into multiple forward passes', async () => {
    const loader = await loadPipeline(modelDef);
    const texts = Array.from({ length: 10 }, (_, i) => `text-${i}`);
    const vectors = await loader.embedTexts(texts, { batchSize: 3 });

    // 10 items / batchSize 3 = 4 calls (3+3+3+1)
    expect(mockExtractor).toHaveBeenCalledTimes(4);
    expect(vectors).toHaveLength(10);
    expect(vectors[9]).toBeInstanceOf(Float32Array);
  });

  it('aborts between chunks when signal is triggered', async () => {
    const loader = await loadPipeline(modelDef);
    const controller = new AbortController();
    const texts = Array.from({ length: 10 }, (_, i) => `text-${i}`);

    // Abort after the first batch completes
    let callCount = 0;
    mockExtractor.mockImplementation(async (batch) => {
      callCount++;
      if (callCount === 1) controller.abort();
      const dim = 384;
      const data = new Float32Array(batch.length * dim);
      return { data, dims: [batch.length, dim] };
    });

    await expect(
      loader.embedTexts(texts, { batchSize: 3, abortSignal: controller.signal })
    ).rejects.toThrow();

    // Should have run exactly 1 batch before abort was detected
    expect(callCount).toBe(1);
  });
});

describe('loadClip', () => {
  const modelDef = { name: 'test/clip', dimensions: 512, dtype: 'fp32' };

  beforeEach(() => {
    mockTokenizer.mockClear();
    mockTextModel.mockClear();
    mockProcessor.mockClear();
    mockVisionModel.mockClear();

    mockTextModel.mockImplementation(async (inputs) => {
      const batchSize = inputs.input_ids.length;
      return { text_embeds: fakeTensor(batchSize, 512) };
    });

    mockVisionModel.mockImplementation(async () => {
      // Image batch size determined by processor output
      const batchSize = mockProcessor.mock.calls.at(-1)?.[0]?.length ?? 1;
      return { image_embeds: fakeTensor(batchSize, 512) };
    });
  });

  it('returns normalized text vectors', async () => {
    const loader = await loadClip(modelDef);
    const vectors = await loader.embedTexts(['hello', 'world']);

    expect(vectors).toHaveLength(2);
    expect(vectors[0]).toBeInstanceOf(Float32Array);
    expect(vectors[0].length).toBe(512);

    // Verify L2 normalization
    const mag = Math.sqrt([...vectors[0]].reduce((s, v) => s + v * v, 0));
    expect(mag).toBeCloseTo(1.0, 3);
  });

  it('chunks text into multiple forward passes', async () => {
    const loader = await loadClip(modelDef);
    const texts = Array.from({ length: 7 }, (_, i) => `text-${i}`);
    const vectors = await loader.embedTexts(texts, { batchSize: 2 });

    // 7 items / batchSize 2 = 4 calls (2+2+2+1)
    expect(mockTextModel).toHaveBeenCalledTimes(4);
    expect(vectors).toHaveLength(7);
  });

  it('batches images through processor in single forward pass', async () => {
    const loader = await loadClip(modelDef);
    const inputs = ['img1.jpg', 'img2.jpg', 'img3.jpg'];
    const vectors = await loader.embedImages(inputs, { batchSize: 10 });

    // All 3 fit in one batch
    expect(mockProcessor).toHaveBeenCalledTimes(1);
    expect(mockVisionModel).toHaveBeenCalledTimes(1);
    expect(vectors).toHaveLength(3);
  });

  it('chunks images into multiple forward passes', async () => {
    const loader = await loadClip(modelDef);
    const inputs = Array.from({ length: 5 }, (_, i) => `img-${i}.jpg`);
    const vectors = await loader.embedImages(inputs, { batchSize: 2 });

    // 5 items / batchSize 2 = 3 calls (2+2+1)
    expect(mockProcessor).toHaveBeenCalledTimes(3);
    expect(mockVisionModel).toHaveBeenCalledTimes(3);
    expect(vectors).toHaveLength(5);
  });

  it('loads all images in a batch concurrently', async () => {
    const { RawImage } = await import('@huggingface/transformers');
    RawImage.read.mockClear();

    const loader = await loadClip(modelDef);
    await loader.embedImages(['a.jpg', 'b.jpg'], { batchSize: 10 });

    // Both reads happen before processor call
    expect(RawImage.read).toHaveBeenCalledTimes(2);
    expect(RawImage.read).toHaveBeenCalledWith('a.jpg');
    expect(RawImage.read).toHaveBeenCalledWith('b.jpg');
  });

  it('aborts between image chunks when signal is triggered', async () => {
    const loader = await loadClip(modelDef);
    const controller = new AbortController();
    const inputs = Array.from({ length: 6 }, (_, i) => `img-${i}.jpg`);

    let callCount = 0;
    mockVisionModel.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) controller.abort();
      const batchSize = mockProcessor.mock.calls.at(-1)?.[0]?.length ?? 1;
      return { image_embeds: fakeTensor(batchSize, 512) };
    });

    await expect(
      loader.embedImages(inputs, { batchSize: 2, abortSignal: controller.signal })
    ).rejects.toThrow();

    expect(callCount).toBe(1);
  });
});
