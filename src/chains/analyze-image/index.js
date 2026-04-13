import { nameStep, getOptions } from '../../lib/context/option.js';
import { resolveArgs, resolveTexts } from '../../lib/instruction/index.js';
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { Outcome } from '../../lib/progress/constants.js';
import callLlm, { buildVisionPrompt, jsonSchema } from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import parallelBatch from '../../lib/parallel-batch/index.js';
import { imageToBase64, tileImages } from '../../lib/image-utils/index.js';

const name = 'analyze-image';

const analysisFormat = jsonSchema('analysis', {
  type: 'object',
  properties: { value: { type: 'string', description: 'The analysis result' } },
  required: ['value'],
  additionalProperties: false,
});

/**
 * Map detail level string to API detail value.
 * @param {string|undefined} value
 * @returns {'auto'|'low'|'high'}
 */
export const mapDetail = (value) => ({ low: 'low', high: 'high' })[value] ?? 'auto';

/**
 * Normalize images input to array of { path, label?, url? } objects.
 * @param {string|string[]|Array<{path: string, label?: string, url?: string}>} images
 * @returns {Array<{path: string, label?: string, url?: string}>}
 */
const normalizeImages = (images) => {
  const list = Array.isArray(images) ? images : [images];
  return list.map((item) => (typeof item === 'string' ? { path: item } : item));
};

/**
 * Analyze one or more images using an LLM with vision capabilities.
 *
 * @param {string|string[]|Array<{path: string, label?: string, url?: string}>} images - Image path(s)
 * @param {string} instructions - What to look for / how to analyze the images
 * @param {object} [config={}] - Chain config
 * @param {boolean} [config.tile] - Combine images into a single sprite for one LLM call
 * @returns {Promise<string|object>} LLM analysis result
 */
const analyzeImage = async (images, instructions, config) => {
  [instructions, config] = resolveArgs(instructions, config);
  const { text: instructionText, context } = resolveTexts(instructions, []);
  const effectiveInstructions = context ? `${instructionText}\n\n${context}` : instructionText;
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();

  const normalizedImages = normalizeImages(images);
  const imageCount = normalizedImages.length;

  try {
    const { tile } = await getOptions(runConfig, {
      tile: false,
    });

    // Tile: combine images into one composite
    const shouldTile = tile && normalizedImages.length > 1;
    let imageDataArray;

    if (shouldTile) {
      const paths = normalizedImages.map((img) => img.path);
      const labels = normalizedImages.map((img) => img.label).filter(Boolean);
      const tileResult = await tileImages(paths, {
        labels: labels.length > 0 ? labels : undefined,
      });
      emitter.emit({
        event: 'tile',
        path: tileResult.path,
        width: tileResult.width,
        height: tileResult.height,
        sizeBytes: tileResult.sizeBytes,
      });
      const tileData = await imageToBase64(tileResult.path);
      imageDataArray = [tileData];
    } else {
      imageDataArray = await parallelBatch(normalizedImages, (img) => imageToBase64(img.path), {
        maxParallel: 4,
        label: 'analyze-image:encode',
        abortSignal: runConfig.abortSignal,
      });
    }

    const contentArray = buildVisionPrompt(effectiveInstructions, imageDataArray);
    const llmConfig = runConfig.responseFormat
      ? runConfig
      : { ...runConfig, responseFormat: analysisFormat };
    const result = await retry(() => callLlm(contentArray, llmConfig), {
      label: 'analyze-image:llm',
      config: runConfig,
      onProgress: scopePhase(runConfig.onProgress, 'llm'),
    });

    emitter.complete({ outcome: Outcome.success, imageCount, tiled: shouldTile });

    return result;
  } catch (err) {
    emitter.error(err, { imageCount });
    throw err;
  }
};

analyzeImage.knownTexts = [];

export default analyzeImage;
