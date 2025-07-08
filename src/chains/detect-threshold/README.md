# detect-threshold

Analyzes numeric distributions to recommend adaptive threshold values based on operational goals and risk profiles.

## Usage

```javascript
const transactions = [
  { amount: 100, riskScore: 0.1, merchant: 'Coffee Shop' },
  { amount: 5000, riskScore: 0.85, merchant: 'Electronics Store' },
  { amount: 250, riskScore: 0.3, merchant: 'Gas Station' },
  // ... more transactions
];

const result = await detectThreshold({
  data: transactions,
  targetProperty: 'riskScore',
  goal: 'Minimize false positives while catching high-risk transactions. Prioritize customer experience but flag definite fraud patterns.'
});

// result.thresholdCandidates[0] === {
//   value: 0.65,
//   rationale: "Conservative threshold capturing clear fraud patterns",
//   percentilePosition: 95,
//   riskProfile: "conservative",
//   falsePositiveRate: 0.05,
//   falseNegativeRate: 0.15,
//   confidence: 0.85,
//   coverageAbove: 0.05,
//   coverageBelow: 0.95,
//   distributionInsight: "Natural break before high-risk outliers"
// }

// result.distributionAnalysis === {
//   mean: 0.35,
//   median: 0.30,
//   standardDeviation: 0.25,
//   skewness: "right",
//   outlierPresence: "moderate",
//   distributionType: "long-tail"
// }
```

## API

### `detectThreshold({ data, targetProperty, goal, [options] })`

Analyzes a dataset to recommend threshold values that align with specified operational goals.

- `data` (`Array<Object>`): Dataset of records containing the target property
- `targetProperty` (`string`): The numeric property to analyze for thresholds
- `goal` (`string`): Description of operational context and risk tradeoffs
- `options.llm` (`Object`): LLM configuration

Returns `Promise<Object>` with:
- `thresholdCandidates`: Array of recommended thresholds with metrics
- `distributionAnalysis`: Statistical insights about the data distribution