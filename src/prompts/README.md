# prompts

Functions that generate structured LLM prompts with parameterization for specific use cases.

## Overview

Prompt functions create structured representations (targeting HTML) that can be validated and transformed before sending to language models. This approach enables testing, handles markup complexity, and provides tooling benefits over raw text generation.

## Basic Usage

```javascript
import { generatePrompt } from './some-prompt-function.js';

const prompt = generatePrompt({
  context: 'User feedback analysis',
  examples: ['Great product!', 'Could be better'],
  instructions: 'Classify sentiment as positive, negative, or neutral'
});

// Returns structured HTML that can be validated and transformed
```

## Architecture

- **Prompt Functions**: Generate structured HTML representations
- **Constants**: Reusable text fragments in [`constants.js`](./constants.js)
- **Validation**: HTML structure enables testing and validation
- **Transformation**: Convert to text format before LLM submission

## Development Status

Current prompt functions are in transition to structured output. Future functions will:
- Output validated HTML structures
- Include comprehensive test coverage
- Support parameterized content generation
- Enable markup complexity handling

## Integration

Prompt functions integrate with chains and verblets by providing the structured prompts needed for LLM operations. The HTML-based approach allows for consistent formatting and validation across the system.
