# join

Fuse text fragments into coherent sequences using AI-driven analysis and custom merging instructions.

For simple text concatenation, use the [concat](../../verblets/concat) verblet.

## Basic Usage

```javascript
import join from './index.js';

const features = [
  'This smartphone has a 6.5-inch display.',
  'It includes a powerful 5000mAh battery.',
  'The camera system features a 108MP sensor.',
  'It supports 5G connectivity for fast internet speeds.'
];

const description = await join(features, 'Create a compelling product description');

// Returns: "This smartphone features a stunning 6.5-inch display and powerful 5000mAh battery
// for all-day use. The advanced 108MP camera system captures professional-quality photos,
// while 5G connectivity ensures lightning-fast internet speeds wherever you go."
```

## Parameters

- **fragments** (Array): Text fragments to join together
- **instructions** (string): Custom instructions for how to merge the fragments
- **config** (Object): Configuration options
  - **llm** (Object): LLM model options (default: uses system default)

## Return Value

Returns a string containing the coherently joined text fragments.

## Features

- **AI-driven fusion**: Intelligently merges fragments based on context and instructions
- **Custom merging logic**: Flexible instructions for different joining styles
- **Contiguous analysis**: Analyzes relationships between adjacent fragments

## Use Cases

- Creating product descriptions from feature lists
- Combining research notes into coherent summaries
- Merging interview transcripts into flowing narratives
- Assembling documentation from scattered notes
