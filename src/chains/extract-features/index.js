import { createLifecycleLogger } from '../../lib/lifecycle-logger/index.js';

/**
 * Extract multiple features from items
 * @param {Array} items - Items to process
 * @param {Array<{name: string, operation: Function}>} features - Features to extract with their operation functions
 * @param {Object} config - Configuration options
 * @returns {Promise<Array<Object>>} Array of objects with extracted features
 */
export async function extractFeatures(items, features, config = {}) {
  const { logger } = config;

  // Create lifecycle logger for extract-features chain
  const lifecycleLogger = createLifecycleLogger(logger, 'chain:extract-features');

  lifecycleLogger.logStart({
    itemCount: items.length,
    featureCount: features.length,
    featureNames: features.map((f) => f.name),
  });

  // Log input
  lifecycleLogger.info({
    event: 'chain:extract-features:input',
    value: {
      items,
      featureNames: features.map((f) => f.name),
    },
  });

  // Note: Features are processed sequentially since each operation may involve multiple LLM calls
  // Each operation function is already internally optimized for parallelism

  const featureResults = [];

  // Execute feature operations sequentially
  for (const { name, operation } of features) {
    lifecycleLogger.logEvent('feature-start', { featureName: name });
    const values = await operation(items, { ...config, logger: lifecycleLogger });
    featureResults.push({ name, values });
    lifecycleLogger.logEvent('feature-complete', {
      featureName: name,
      resultCount: values.length,
    });
  }

  // Combine results into objects
  const results = items.map((_, index) => {
    const obj = {};
    for (const { name, values } of featureResults) {
      obj[name] = values[index];
    }
    return obj;
  });

  // Log output
  lifecycleLogger.info({
    event: 'chain:extract-features:output',
    value: results,
  });

  lifecycleLogger.logResult(results, {
    itemCount: results.length,
    featuresExtracted: features.length,
  });

  return results;
}

export default extractFeatures;
