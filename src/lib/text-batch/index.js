import modelService from '../../services/llm-model/index.js';

const FALLBACK_TOKENS_PER_CHAR = 0.25;
const SAFETY_MARGIN = 1.2;
const MAX_ITEM_RATIO = 0.8;

function estimateTokens(text, model) {
  if (model?.toTokens) {
    return model.toTokens(text).length;
  }
  return Math.ceil(text.length * FALLBACK_TOKENS_PER_CHAR);
}

function calculateBudget({ model, outputRatio = 2, maxTokenBudget = 4000, contextBuffer = 0.9 }) {
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
    maxItemTokens: Math.floor(inputBudget * MAX_ITEM_RATIO),
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

    if (itemTokens > budget.maxItemTokens) {
      if (currentBatch.length > 0) {
        batches.push({ items: currentBatch, startIndex: batchStartIndex });
        currentBatch = [];
        currentTokens = 0;
      }

      batches.push({ items: [], startIndex: i, skip: true });
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

export default function createBatches(list, config = {}) {
  const {
    batchSize: providedBatchSize,
    outputRatio = 2,
    maxTokenBudget = 4000,
    contextBuffer = 0.9,
    llm,
  } = config;

  const modelName = llm?.modelName || modelService.getBestPublicModel().key;
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
