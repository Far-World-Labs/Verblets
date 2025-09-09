import listBatch, { ListStyle, determineStyle } from '../../verblets/list-batch/index.js';
import createBatches from '../../lib/text-batch/index.js';
import retry from '../../lib/retry/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { filterDecisionsJsonSchema } from './schemas.js';
import {
  emitBatchStart,
  emitBatchComplete,
  emitBatchProcessed,
  createBatchProgressCallback,
  createBatchContext,
} from '../../lib/progress-callback/index.js';

const filterResponseFormat = {
  type: 'json_schema',
  json_schema: filterDecisionsJsonSchema,
};

export default async function filter(list, instructions, config = {}) {
  const {
    listStyle,
    autoModeThreshold,
    responseFormat,
    llm,
    maxAttempts = 3,
    logger,
    onProgress,
    ...options
  } = config;

  // Log filter start
  if (logger?.info) {
    logger.info('Filter chain starting', {
      itemCount: list.length,
      llm: typeof llm === 'object' ? llm.name : llm,
      maxAttempts,
      hasResponseFormat: !!responseFormat,
    });
  }

  const results = [];
  const batches = createBatches(list, config);
  const activeBatches = batches.filter((b) => !b.skip);

  if (logger?.info) {
    logger.info('Batches created', {
      totalBatches: batches.length,
      batchSizes: batches.map((b) => b.items?.length || 0),
    });
  }

  emitBatchStart(onProgress, 'filter', list.length, {
    totalBatches: activeBatches.length,
  });

  let processedItems = 0;
  let processedBatches = 0;

  for (const [batchIndex, { items, skip, startIndex }] of batches.entries()) {
    if (skip) {
      if (logger?.warn) {
        logger.warn(`Skipping batch ${batchIndex} due to size limits`);
      }
      continue;
    }

    if (logger?.info) {
      logger.info(`Processing batch ${batchIndex}`, {
        itemCount: items.length,
        firstItem: items[0]?.substring(0, 50),
      });
    }

    const batchStyle = determineStyle(listStyle, items, autoModeThreshold);

    const filterInstructions = ({ style, count }) => {
      const baseInstructions = `For each item in the list below, determine if it satisfies the filtering criteria. Return "yes" to include the item or "no" to exclude it. Return exactly one decision per item, in the same order as the input list.

${asXML(instructions, { tag: 'filtering-criteria' })}

IMPORTANT: 
- Evaluate each item independently
- Consider all aspects of the filtering criteria
- Return only "yes" or "no" for each item
- Maintain the exact order of the input list`;

      if (style === ListStyle.NEWLINE) {
        return `${baseInstructions}

Process exactly ${count} items from the list below and return ${count} yes/no decisions.`;
      }

      return `${baseInstructions}

Process exactly ${count} items from the XML list below and return ${count} yes/no decisions.`;
    };

    const prompt = filterInstructions({ style: batchStyle, count: items.length });
    const listBatchOptions = {
      listStyle: batchStyle,
      autoModeThreshold,
      responseFormat: responseFormat ?? filterResponseFormat,
      llm,
      ...options,
    };

    if (logger?.info) {
      logger.info(`Calling listBatch for batch ${batchIndex}`, {
        style: batchStyle,
        llmConfig: llm,
        optionKeys: Object.keys(listBatchOptions),
      });
    }

    let response;
    try {
      response = await retry(() => listBatch(items, prompt, listBatchOptions), {
        label: `filter:batch`,
        maxAttempts,
        onProgress: createBatchProgressCallback(
          onProgress,
          createBatchContext({
            batchIndex: processedBatches,
            batchSize: items.length,
            startIndex,
            totalItems: list.length,
            processedItems,
            totalBatches: activeBatches.length,
          })
        ),
        chatGPTPrompt: `${prompt}\n\nItems: ${JSON.stringify(items).substring(0, 500)}...`,
        chatGPTConfig: listBatchOptions,
      });
    } catch (error) {
      if (logger?.error) {
        logger.error(`Batch ${batchIndex} failed after all retries`, {
          error: error.message,
          itemCount: items.length,
        });
      }
      throw error;
    }

    // listBatch now returns arrays directly
    const decisions = response;

    if (logger?.info) {
      logger.info(`Batch ${batchIndex} response received`, {
        decisionsCount: decisions?.length,
        expectedCount: items.length,
        matches: decisions?.length === items.length,
      });
    }

    let included = 0;
    items.forEach((item, i) => {
      const decision = decisions[i]?.toLowerCase().trim();
      if (decision === 'yes') {
        results.push(item);
        included++;
      }
    });

    processedItems += items.length;
    processedBatches++;

    emitBatchProcessed(
      onProgress,
      'filter',
      {
        totalItems: list.length,
        processedItems,
        batchNumber: processedBatches,
        batchSize: items.length,
      },
      {
        batchIndex: `${startIndex}-${startIndex + items.length - 1}`,
        totalBatches: activeBatches.length,
      }
    );

    if (logger?.info) {
      logger.info(`Batch ${batchIndex} processed`, {
        itemsProcessed: items.length,
        itemsIncluded: included,
        totalResultsSoFar: results.length,
      });
    }
  }

  emitBatchComplete(onProgress, 'filter', list.length, {
    totalBatches: activeBatches.length,
  });

  if (logger?.info) {
    logger.info('Filter chain complete', {
      inputCount: list.length,
      outputCount: results.length,
      filterRate: `${((results.length / list.length) * 100).toFixed(1)}%`,
    });
  }

  return results;
}

export const filterOnce = filter;
