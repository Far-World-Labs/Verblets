import reduce from '../reduce/index.js';
import chatGPT from '../../lib/chatgpt/index.js';
import retry from '../../lib/retry/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import thresholdResultSchema from './threshold-result.json';

function calculateStatistics(data, targetProperty) {
  const values = data
    .map((item) => item[targetProperty])
    .filter((v) => v !== null && v !== undefined && !isNaN(v))
    .sort((a, b) => a - b);

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

export default async function detectThreshold({
  data,
  targetProperty,
  goal,
  chunkSize = 50,
  llm = { negotiate: { good: true } },
  maxAttempts = 3,
  onProgress,
  ...options
}) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    throw new Error('Data must be a non-empty array');
  }

  if (!targetProperty) {
    throw new Error('Target property must be specified');
  }

  if (!goal) {
    throw new Error('Goal must be specified to determine appropriate thresholds');
  }

  // Calculate statistics for context
  const stats = calculateStatistics(data, targetProperty);

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
        },
      },
      distributionInsights: { type: 'array', items: { type: 'string' } },
    },
    required: ['observedPatterns', 'potentialThresholds', 'distributionInsights'],
  };

  // Initial accumulator with schema structure
  const initialAccumulator = {
    observedPatterns: [],
    potentialThresholds: [],
    distributionInsights: [],
  };

  const instructions = `You are analyzing data to identify threshold candidates for the property "${targetProperty}".

${asXML('goal', goal)}

${asXML(
  'statistics',
  `Mean: ${stats.mean.toFixed(2)}, Median: ${stats.median.toFixed(
    2
  )}, StdDev: ${stats.stdDev.toFixed(2)}, Min: ${stats.min}, Max: ${stats.max}`
)}

${asXML(
  'percentiles',
  Object.entries(stats.percentiles)
    .map(([p, val]) => `${p}th: ${val}`)
    .join(', ')
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

  // Convert enrichedData to strings for reduce - batch multiple items per line
  const ITEMS_PER_LINE = 20;
  const dataStrings = [];

  for (let i = 0; i < enrichedData.length; i += ITEMS_PER_LINE) {
    const batch = enrichedData.slice(i, i + ITEMS_PER_LINE);
    dataStrings.push(JSON.stringify(batch));
  }

  // Use reduce to analyze the data in chunks with JSON schema
  const analysisResult = await reduce(dataStrings, instructions, {
    initial: JSON.stringify(initialAccumulator),
    chunkSize,
    llm: {
      ...llm,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'analysis_accumulator',
          schema: accumulatorSchema,
        },
      },
    },
    onProgress,
    ...options,
  });

  // Parse the accumulated analysis - should be valid JSON with schema
  const accumulated =
    typeof analysisResult === 'string' ? JSON.parse(analysisResult) : analysisResult;

  // Now use chatGPT directly with structured output for final recommendations
  const finalPrompt = `Based on the following analysis of ${
    stats.count
  } data points for property "${targetProperty}", generate threshold recommendations.

${asXML('goal', goal)}

${asXML('accumulated-analysis', JSON.stringify(accumulated, null, 2))}

${asXML(
  'statistics',
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
  )
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

  const modelOptions = {
    ...llm,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'threshold_result',
        schema: thresholdResultSchema,
      },
    },
  };

  const result = await retry(chatGPT, {
    label: 'detect-threshold-analysis',
    maxAttempts,
    onProgress,
    chatGPTPrompt: finalPrompt,
    chatGPTConfig: {
      modelOptions,
      ...options,
    },
    logger: options.logger,
  });

  // With structured output, result should already be parsed
  const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;

  // Validate and fix threshold values to be within data range
  if (parsedResult.thresholdCandidates) {
    parsedResult.thresholdCandidates = parsedResult.thresholdCandidates.filter((candidate) => {
      // Ensure threshold value is within the data range
      if (candidate.value < stats.min || candidate.value > stats.max) {
        console.warn(
          `Threshold value ${candidate.value} is outside data range [${stats.min}, ${stats.max}]`
        );
        return false;
      }
      return true;
    });
  }

  // Add distribution analysis
  parsedResult.distributionAnalysis = {
    mean: stats.mean,
    median: stats.median,
    standardDeviation: stats.stdDev,
    min: stats.min,
    max: stats.max,
    percentiles: stats.percentiles,
    dataPoints: stats.count,
  };

  return parsedResult;
}
