import modelService, { resolveModel } from '../../services/llm-model/index.js';
import { getOptions } from '../context/option.js';

const FALLBACK_TOKENS_PER_CHAR = 0.25;
const SAFETY_MARGIN = 1.2;
const DEFAULT_OUTPUT_RATIO = 2;
const DEFAULT_MAX_TOKEN_BUDGET = 4000;
const DEFAULT_CONTEXT_BUFFER = 0.9;

function estimateTokens(text, model) {
  const str = typeof text === 'string' ? text : JSON.stringify(text);
  if (model?.toTokens) {
    return model.toTokens(str).length;
  }
  return Math.ceil(str.length * FALLBACK_TOKENS_PER_CHAR);
}

function calculateBudget({
  model,
  outputRatio = DEFAULT_OUTPUT_RATIO,
  maxTokenBudget = DEFAULT_MAX_TOKEN_BUDGET,
  contextBuffer = DEFAULT_CONTEXT_BUFFER,
}) {
  const maxContextTokens = Math.floor(model.maxContextWindow * contextBuffer);
  const maxOutputTokens = model.maxOutputTokens || Math.floor(maxContextTokens / 2);

  const effectiveBudget = Math.min(
    maxTokenBudget,
    maxOutputTokens,
    Math.floor(maxContextTokens / (1 + outputRatio))
  );

  const inputBudget = Math.floor(effectiveBudget / (1 + outputRatio));

  return {
    totalBudget: effectiveBudget,
    inputBudget,
    outputBudget: Math.floor((effectiveBudget * outputRatio) / (1 + outputRatio)),
  };
}

function calculateOptimalBatchSize(list, budget, model) {
  const maxItemTokens = Math.max(...list.map((item) => estimateTokens(item, model)));
  return Math.max(1, Math.floor(budget.inputBudget / (maxItemTokens * SAFETY_MARGIN)));
}

function buildBatches(list, { targetBatchSize, budget, model }) {
  const batches = [];
  let currentBatch = [];
  let currentTokens = 0;
  let batchStartIndex = 0;

  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    const itemTokens = estimateTokens(item, model);

    // Oversized items get isolated in their own single-item batch.
    // The LLM call succeeds or fails based on the model's actual context
    // window — no silent data loss.
    if (itemTokens > budget.inputBudget) {
      if (currentBatch.length > 0) {
        batches.push({ items: currentBatch, startIndex: batchStartIndex });
        currentBatch = [];
        currentTokens = 0;
      }

      batches.push({ items: [item], startIndex: i });
      batchStartIndex = i + 1;
      continue;
    }

    const wouldExceedBudget = currentTokens + itemTokens > budget.inputBudget;
    const wouldExceedBatchSize = currentBatch.length >= targetBatchSize;

    if (currentBatch.length > 0 && (wouldExceedBudget || wouldExceedBatchSize)) {
      batches.push({ items: currentBatch, startIndex: batchStartIndex });

      currentBatch = [item];
      currentTokens = itemTokens;
      batchStartIndex = i;
    } else {
      currentBatch.push(item);
      currentTokens += itemTokens;
    }
  }

  if (currentBatch.length > 0) {
    batches.push({ items: currentBatch, startIndex: batchStartIndex });
  }

  return batches;
}

export default async function createBatches(list, config = {}) {
  const { batchSize: providedBatchSize, contextBuffer = DEFAULT_CONTEXT_BUFFER, llm } = config;
  const { outputRatio, maxTokenBudget } = await getOptions(config, {
    outputRatio: DEFAULT_OUTPUT_RATIO,
    maxTokenBudget: DEFAULT_MAX_TOKEN_BUDGET,
  });

  const modelName = resolveModel(llm) || modelService.bestPublicModelKey;
  const model = modelService.getModel(modelName);
  const budget = calculateBudget({
    model,
    outputRatio,
    maxTokenBudget,
    contextBuffer,
  });

  const targetBatchSize = providedBatchSize || calculateOptimalBatchSize(list, budget, model);

  return buildBatches(list, { targetBatchSize, budget, model });
}
