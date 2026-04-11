/**
 * Embedding model loaders.
 *
 * Each loader downloads/caches a model on first use and returns a uniform
 * interface: { embedTexts, embedImages?, dimensions }.
 *
 * Loader types:
 *   pipeline — @huggingface/transformers feature-extraction (text only)
 *   clip     — CLIPTextModelWithProjection + CLIPVisionModelWithProjection (multimodal)
 */

import {
  pipeline,
  AutoTokenizer,
  CLIPTextModelWithProjection,
  CLIPVisionModelWithProjection,
  AutoProcessor,
  RawImage,
} from '@huggingface/transformers';

/** L2-normalize a Float32Array. Returns a new array. */
function l2Normalize(vec) {
  let norm = 0;
  for (let i = 0; i < vec.length; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm);
  if (norm === 0) return new Float32Array(vec.length);
  const out = new Float32Array(vec.length);
  for (let i = 0; i < vec.length; i++) out[i] = vec[i] / norm;
  return out;
}

/**
 * Load a text-only feature-extraction pipeline.
 *
 * @param {object} modelDef - Catalog entry
 * @returns {Promise<{ embedTexts: function, embedImages: undefined, dimensions: number }>}
 */
export async function loadPipeline(modelDef) {
  const { name, dtype = 'fp32', pooling = 'cls', normalize = true } = modelDef;
  const startTime = Date.now();
  console.error(`[verblets:embed] Loading pipeline model "${name}"…`);

  const extractor = await pipeline('feature-extraction', name, { dtype });
  console.error(`[verblets:embed] Pipeline model "${name}" ready (${Date.now() - startTime}ms)`);

  const embedTexts = async (texts) => {
    const output = await extractor(texts, { pooling, normalize });
    const dim = output.dims.at(-1);
    const vectors = [];
    for (let i = 0; i < texts.length; i++) {
      vectors.push(new Float32Array(output.data.slice(i * dim, (i + 1) * dim)));
    }
    return vectors;
  };

  return { embedTexts, embedImages: undefined, dimensions: modelDef.dimensions };
}

/**
 * Load a CLIP multimodal model (text + vision in the same vector space).
 *
 * @param {object} modelDef - Catalog entry
 * @returns {Promise<{ embedTexts: function, embedImages: function, dimensions: number }>}
 */
export async function loadClip(modelDef) {
  const { name, dtype = 'fp32' } = modelDef;
  const startTime = Date.now();
  console.error(`[verblets:embed] Loading CLIP model "${name}"…`);

  const [tokenizer, textModel, processor, visionModel] = await Promise.all([
    AutoTokenizer.from_pretrained(name),
    CLIPTextModelWithProjection.from_pretrained(name, { dtype }),
    AutoProcessor.from_pretrained(name),
    CLIPVisionModelWithProjection.from_pretrained(name, { dtype }),
  ]);

  console.error(`[verblets:embed] CLIP model "${name}" ready (${Date.now() - startTime}ms)`);

  const embedTexts = async (texts) => {
    const inputs = tokenizer(texts, { padding: true, truncation: true });
    const output = await textModel(inputs);
    const embeds = output.text_embeds;
    const dim = embeds.dims[1];
    const vectors = [];
    for (let i = 0; i < texts.length; i++) {
      vectors.push(l2Normalize(new Float32Array(embeds.data.slice(i * dim, (i + 1) * dim))));
    }
    return vectors;
  };

  const embedImages = async (inputs) => {
    const vectors = [];
    for (const input of inputs) {
      const image = await RawImage.read(input);
      const imageInputs = await processor(image);
      const output = await visionModel(imageInputs);
      vectors.push(l2Normalize(new Float32Array(output.image_embeds.data)));
    }
    return vectors;
  };

  return { embedTexts, embedImages, dimensions: modelDef.dimensions };
}
