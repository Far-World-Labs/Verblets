# join

Intelligently merge text fragments using windowed processing with overlapping segments and AI-driven stitching for coherent results.

This sophisticated merge system processes fragments in overlapping windows to ensure equal context exposure and seamless integration, making it ideal for combining large amounts of text while maintaining narrative flow.

## Usage

```javascript
import join from './index.js';

const chapters = [
  'Chapter 1: The hero begins their journey through the ancient forest.',
  'Chapter 2: Strange creatures emerge from the shadows.',
  'Chapter 3: A mysterious guide appears to help.',
  'Chapter 4: The path leads to a hidden temple.',
  'Chapter 5: Ancient secrets are revealed within.'
];

const story = await join(chapters, 'Merge these chapters into a flowing narrative');

// Returns: A coherent story that seamlessly blends all chapters with proper transitions
```

## Features

- **Windowed Processing**: Processes fragments in overlapping windows to ensure equal context exposure
- **Intelligent Stitching**: AI-driven overlap resolution preserves terminal sections while seamlessly merging overlapping regions
- **Configurable Overlap**: Adjustable window size and overlap percentage for different content types

## API

### `join(fragments, prompt, config)`

**Parameters:**
- `fragments` (Array): Text fragments to merge together
- `prompt` (string): Instructions for how to merge the fragments
- `config` (Object): Configuration options
  - `windowSize` (number): Size of overlapping windows (default: 5)
  - `overlapPercent` (number): Percentage of overlap between windows (default: 50)
  - `styleHint` (string): Optional additional style guidance
  - `maxRetries` (number): Maximum retry attempts (default: 2)
  - `llm` (Object): LLM model options

**Returns:** Promise<string> - Single merged result

## Use Cases

### Document Synthesis
```javascript
import join from './index.js';

const sections = [
  'Executive Summary: Our Q3 results show strong growth.',
  'Financial Performance: Revenue increased 15% year-over-year.',
  'Market Analysis: Competition remains fierce in key segments.',
  'Strategic Outlook: We plan to expand into new markets.',
  'Risk Assessment: Economic uncertainty poses challenges.'
];

const report = await join(sections, 'Create a comprehensive executive report', {
  windowSize: 3,
  overlapPercent: 40,
  styleHint: 'Professional business tone'
});
```
