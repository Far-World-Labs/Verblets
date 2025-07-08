import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import reduce from '../reduce/index.js';
import chatGPT from '../../lib/chatgpt/index.js';
import asXML from '../../lib/as-xml/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const thresholdResultSchema = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'threshold-result.json'), 'utf8')
);

function calculateStatistics(data, targetProperty) {
  const values = data
    .map((record) => record[targetProperty])
    .filter((val) => val !== undefined && val !== null && !isNaN(val))
    .map((val) => Number(val))
    .sort((a, b) => a - b);

  if (values.length === 0) {
    throw new Error(`No valid numeric values found for property: ${targetProperty}`);
  }

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const median =
    values.length % 2 === 0
      ? (values[values.length / 2 - 1] + values[values.length / 2]) / 2
      : values[Math.floor(values.length / 2)];

  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  const percentiles = {};
  [5, 10, 25, 50, 75, 90, 95, 99].forEach((p) => {
    const index = Math.ceil((p / 100) * values.length) - 1;
    percentiles[p] = values[Math.max(0, index)];
  });

  return {
    values,
    mean,
    median,
    stdDev,
    min: values[0],
    max: values[values.length - 1],
    percentiles,
    count: values.length,
  };
}

async function detectThreshold({
  data,
  targetProperty,
  goal,
  chunkSize = 50,
  llm = {},
  ...options
} = {}) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    throw new Error('Data must be a non-empty array');
  }

  if (!targetProperty) {
    throw new Error('Target property must be specified');
  }

  if (!goal) {
    throw new Error('Goal description must be provided');
  }

  const stats = calculateStatistics(data, targetProperty);

  // Prepare data with context for the reduce chain
  const enrichedData = data.map((record) => ({
    value: record[targetProperty],
    percentile: Math.round(
      (stats.values.indexOf(Number(record[targetProperty])) / stats.values.length) * 100
    ),
    context: record,
  }));

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

For each batch of data:
1. Look for patterns, clusters, or natural breaks in the values
2. Identify potential threshold points that align with the goal
3. Note any outliers or edge cases
4. Update the accumulator with new insights

Accumulator should track:
- observedPatterns: Notable patterns or clusters in the data
- potentialThresholds: Candidate threshold values with rationales
- distributionInsights: Key insights about the data distribution

Return the updated accumulator as JSON.`;

  // Use reduce to analyze the data in chunks
  const analysisResult = await reduce({
    list: enrichedData,
    template: instructions,
    initial: JSON.stringify(initialAccumulator),
    chunkSize,
    llm,
    ...options,
  });

  // Parse the accumulated analysis
  const accumulated = JSON.parse(analysisResult);

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

Generate threshold recommendations. Each candidate should include:
- value: the threshold value
- rationale: why this threshold is appropriate
- percentilePosition: where it falls in the distribution (0-100)
- riskProfile: conservative/balanced/aggressive
- falsePositiveRate: estimated rate (0-1)
- falseNegativeRate: estimated rate (0-1)
- confidence: your confidence in this recommendation (0-1)
- coverageAbove/Below: proportion of data above/below
- distributionInsight: key insight about this threshold`;

  const modelOptions = {
    ...llm,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'threshold_analysis',
        strict: true,
        schema: thresholdResultSchema,
      },
    },
  };

  // Get final recommendations using chatGPT with structured output
  const result = await chatGPT(finalPrompt, {
    modelOptions,
    ...options,
  });

  // With structured output, result should already be parsed
  const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;

  // Add distribution analysis
  parsedResult.distributionAnalysis = {
    mean: stats.mean,
    median: stats.median,
    standardDeviation: stats.stdDev,
    skewness: stats.mean > stats.median ? 'right' : stats.mean < stats.median ? 'left' : 'normal',
    outlierPresence: accumulated.distributionInsights?.some((i) =>
      i.toLowerCase().includes('outlier')
    )
      ? 'moderate'
      : 'low',
    distributionType: 'normal', // This could be enhanced based on accumulated insights
  };

  return parsedResult;
}

export default detectThreshold;
