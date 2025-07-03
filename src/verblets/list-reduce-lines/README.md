# list-reduce-lines

Combine an accumulator value with a list of strings using natural language instructions in a single LLM call.

For bulk reduction of large datasets, use the [reduce](../../chains/reduce) chain.

## Basic Usage

```javascript
import listReduceLines from './index.js';

// Summarize a list of feedback comments
const feedback = [
  'Great product, love the design',
  'Shipping was fast', 
  'Could use better packaging',
  'Excellent customer service'
];

const summary = await listReduceLines(
  'Overall impression:', 
  feedback, 
  'Create a brief summary highlighting key themes'
);
// => 'Overall impression: Positive feedback on product design and service, with minor packaging concerns'
```

## Parameters

- **accumulator** (string): Initial value to combine with the list
- **list** (string[]): Array of text lines to reduce
- **instructions** (string): Natural language description of how to combine them
- **config** (Object): Configuration options
  - **llm** (Object): LLM model options (default: uses system default)

## Return Value

Returns a string containing the final reduced result after combining the accumulator with all list items according to the instructions.

## Use Cases

- Summarizing lists of feedback, comments, or reviews
- Aggregating information from multiple sources
- Creating consolidated reports from individual data points
- Combining partial results into final conclusions
- Building cumulative narratives from sequential events

## Advanced Usage

```javascript
// Building a story from plot points
const plotPoints = [
  'Hero discovers ancient map',
  'Map leads to hidden treasure',
  'Rival appears seeking same treasure'
];

const story = await listReduceLines(
  'Once upon a time,',
  plotPoints,
  'weave these plot points into a coherent narrative'
);
```
