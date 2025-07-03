# shorten-text

Intelligently shorten text to fit within token limits by removing content from the middle while preserving context.

## Basic Usage

```javascript
import shortenText from './index.js';

const longText = `This is a very long piece of text that needs to be shortened because it exceeds the token limit for the language model we want to use.`;

const shortened = shortenText(longText, { 
  targetTokenCount: 20 
});
// => "This is a very long piece...we want to use."
```

## Parameters

- **text** (string): The text to shorten
- **config** (Object): Configuration options
  - **targetTokenCount** (number): Maximum number of tokens allowed
  - **minCharsToRemove** (number): Minimum characters to remove per iteration (default: 10)
  - **model** (Object): LLM model for token counting (default: best public model)

## Return Value

Returns a shortened string that fits within the target token count, with "..." indicating removed content.

## Algorithm

The function removes text from the middle of the content, preserving the beginning and end to maintain context. It uses the specified model's tokenizer to accurately count tokens and iteratively removes content until the target is reached.

## Use Cases

- Preparing text for LLM input when context window is limited
- Creating summaries that preserve key opening and closing information
- Fitting content into token-constrained API calls
- Maintaining readability while reducing text length 