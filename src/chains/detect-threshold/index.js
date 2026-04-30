import reduce from '../reduce/index.js';
import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { debug } from '../../lib/debug/index.js';
import thresholdResultSchema from './threshold-result.json' with { type: 'json' };
import { DomainEvent, Outcome } from '../../lib/progress/constants.js';
import { nameStep, getOptions } from '../../lib/context/option.js';
import { resolveArgs, resolveTexts } from '../../lib/instruction/index.js';

const name = 'detect-threshold';

export function calculateStatistics(data, targetProperty) {
  // Filter to finite numbers only. The previous filter let null through
  // (null !== undefined, and isNaN(null) is false because null coerces
  // to 0), which then sorted into the dataset and skewed mean/median/
  // stdDev. Strings and booleans had similar coercion paths.
  const values = data
    .map((item) => item[targetProperty])
    .filter((v) => typeof v === 'number' && Number.isFinite(v))
    .toSorted((a, b) => a - b);

  if (values.length === 0) {
    throw new Error(`No valid numeric values found for property: ${targetProperty}`);
  }

  const count = values.length;
  const sum = values.reduce((acc, val) => acc + val, 0);
  const mean = sum / count;

  const median =
    count % 2 === 0
      ? (values[count / 2 - 1] + values[count / 2]) / 2
      : values[Math.floor(count / 2)];

  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / count;
  const stdDev = Math.sqrt(variance);

  // Calculate percentiles
  const percentiles = {
    10: values[Math.floor(count * 0.1)],
    25: values[Math.floor(count * 0.25)],
    50: median,
    75: values[Math.floor(count * 0.75)],
    90: values[Math.floor(count * 0.9)],
    95: values[Math.floor(count * 0.95)],
    99: values[Math.floor(count * 0.99)],
  };

  return {
    count,
    mean,
    median,
    stdDev,
    min: values[0],
    max: values[values.length - 1],
    percentiles,
    values,
  };
}

export default async function detectThreshold(data, targetProperty, goal, config) {
  [goal, config] = resolveArgs(goal, config);
  const { text: goalText, context } = resolveTexts(goal, []);
  const runConfig = nameStep(name, { llm: { good: true }, ...config });
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  const { batchSize } = await getOptions(runConfig, {
    batchSize: 50,
  });
  if (!data || !Array.isArray(data) || data.length === 0) {
    throw new Error('Data must be a non-empty array');
  }

  if (!targetProperty) {
    throw new Error('Target property must be specified');
  }

  if (!goalText) {
    throw new Error('Goal must be specified to determine appropriate thresholds');
  }

  try {
    // Calculate statistics for context (or use provided stats)
    const stats = config.stats ?? calculateStatistics(data, targetProperty);

    emitter.emit({ event: DomainEvent.phase, phase: 'statistics', stats });

    // Enrich data with statistical context
    const enrichedData = data.map((record) => ({
      value: record[targetProperty],
      percentileRank: Math.round(
        (stats.values.filter((v) => v <= record[targetProperty]).length / stats.count) * 100
      ),
      context: record,
    }));

    // Schema for the accumulator
    const accumulatorSchema = {
      type: 'object',
      properties: {
        observedPatterns: { type: 'array', items: { type: 'string' } },
        potentialThresholds: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              value: { type: 'number' },
              rationale: { type: 'string' },
            },
            required: ['value', 'rationale'],
            additionalProperties: false,
          },
        },
        distributionInsights: { type: 'array', items: { type: 'string' } },
      },
      required: ['observedPatterns', 'potentialThresholds', 'distributionInsights'],
      additionalProperties: false,
    };

    // Initial accumulator with schema structure
    const initialAccumulator = {
      observedPatterns: [],
      potentialThresholds: [],
      distributionInsights: [],
    };

    const baseInstructions = `You are analyzing data to identify threshold candidates for the property "${targetProperty}".

${asXML(goalText, { tag: 'goal' })}

${asXML(
  `Mean: ${stats.mean.toFixed(2)}, Median: ${stats.median.toFixed(
    2
  )}, StdDev: ${stats.stdDev.toFixed(2)}, Min: ${stats.min}, Max: ${stats.max}`,
  { tag: 'statistics' }
)}

${asXML(
  Object.entries(stats.percentiles)
    .map(([p, val]) => `${p}th: ${val}`)
    .join(', '),
  { tag: 'percentiles' }
)}

IMPORTANT: Each line contains an ARRAY of data points. Process all items in each array.
The "value" field contains the ${targetProperty} value to analyze.

For each batch of data:
1. Look for patterns, clusters, or natural breaks in the values
2. Identify potential threshold points that align with the goal
3. Note any outliers or edge cases
4. Update the accumulator with new insights

Accumulator should track:
- observedPatterns: Notable patterns or clusters in the data
- potentialThresholds: Candidate threshold values with rationales (must be within Min-Max range shown above)
- distributionInsights: Key insights about the data distribution

Return the updated accumulator as valid JSON.`;
    const instructions = [baseInstructions, context].filter(Boolean).join('\n\n');

    // Convert enrichedData to strings for reduce - batch multiple items per line
    const ITEMS_PER_LINE = 20;
    const dataStrings = [];

    for (let i = 0; i < enrichedData.length; i += ITEMS_PER_LINE) {
      const batch = enrichedData.slice(i, i + ITEMS_PER_LINE);
      dataStrings.push(JSON.stringify(batch));
    }

    emitter.emit({ event: DomainEvent.phase, phase: 'enriched', enrichedData });

    const analysisResult = await reduce(dataStrings, instructions, {
      ...runConfig,
      initial: JSON.stringify(initialAccumulator),
      batchSize,
      responseFormat: jsonSchema('analysis_accumulator', accumulatorSchema),
      onProgress: scopePhase(runConfig.onProgress, 'reduce:analysis'),
    });

    const accumulated = analysisResult;

    // Now use llm directly with structured output for final recommendations
    const baseFinalPrompt = `Based on the following analysis of ${
      stats.count
    } data points for property "${targetProperty}", generate threshold recommendations.

${asXML(goalText, { tag: 'goal' })}

${asXML(JSON.stringify(accumulated, null, 2), { tag: 'accumulated-analysis' })}

${asXML(
  JSON.stringify(
    {
      mean: stats.mean,
      median: stats.median,
      standardDeviation: stats.stdDev,
      min: stats.min,
      max: stats.max,
      percentiles: stats.percentiles,
    },
    null,
    2
  ),
  { tag: 'statistics' }
)}

CRITICAL: The threshold VALUE must be the actual ${targetProperty} value (between ${
      stats.min
    } and ${stats.max}), NOT a percentile position.
For example, if suggesting a threshold at the 75th percentile where the value is 0.55, the threshold value should be 0.55, not 75.

Generate specific threshold recommendations that:
1. Align with the stated goal
2. Are based on natural breaks or patterns in the data
3. Include clear rationales for each threshold
4. Consider the statistical distribution

Return threshold candidates with their rationales.`;
    const finalPrompt = [baseFinalPrompt, context].filter(Boolean).join('\n\n');

    const result = await retry(
      () =>
        callLlm(finalPrompt, {
          ...runConfig,
          responseFormat: jsonSchema('threshold_result', thresholdResultSchema),
        }),
      {
        label: 'detect-threshold-analysis',
        config: runConfig,
      }
    );

    // Schema declares thresholdCandidates as required. A malformed response
    // would either crash on .filter (if missing) or silently mutate a
    // non-object on line below. Throw at the boundary instead.
    if (!result || typeof result !== 'object' || Array.isArray(result)) {
      throw new Error(
        `detect-threshold: expected object from final LLM (got ${
          result === null ? 'null' : typeof result
        })`
      );
    }
    if (!Array.isArray(result.thresholdCandidates)) {
      throw new Error(
        `detect-threshold: LLM response missing required "thresholdCandidates" array (got ${typeof result.thresholdCandidates})`
      );
    }

    // Drop threshold candidates whose value is outside the observed data range
    result.thresholdCandidates = result.thresholdCandidates.filter((candidate) => {
      if (candidate.value < stats.min || candidate.value > stats.max) {
        debug(
          `Threshold value ${candidate.value} is outside data range [${stats.min}, ${stats.max}]`
        );
        return false;
      }
      return true;
    });

    // Add distribution analysis
    result.distributionAnalysis = {
      mean: stats.mean,
      median: stats.median,
      standardDeviation: stats.stdDev,
      min: stats.min,
      max: stats.max,
      percentiles: stats.percentiles,
      dataPoints: stats.count,
    };

    emitter.complete({ outcome: Outcome.success });

    return result;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

detectThreshold.knownTexts = [];
