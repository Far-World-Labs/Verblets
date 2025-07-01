# truncate

Intelligently truncate text using LLM reasoning to find optimal semantic boundaries while preserving maximum meaning within specified length constraints.

This chain uses language model intelligence to make qualitative decisions about where to truncate text, rather than relying on rigid rules or regex patterns. It understands context and meaning to choose the best truncation points.

## Usage

```javascript
import truncate from 'verblets/src/chains/truncate/index.js';

const text = `The Verblets project provides AI utilities for building complex systems. 
It combines language understanding with deterministic code to create powerful tools 
for developers working with natural language processing tasks.`;

const result = await truncate(text, 'Preserve the most important information', {
  limit: 100,
  unit: 'characters'
});

// {
//   truncated: "The Verblets project provides AI utilities for building complex systems.",
//   cutPoint: 72,
//   cutType: "sentence", 
//   preservationScore: 0.89,
//   reasoning: "Cut at sentence boundary to preserve complete thought about the project's purpose"
// }
```

## Parameters

- `text` (string) - The text to truncate
- `instructions` (string) - Instructions for how to approach truncation (default: 'Truncate intelligently at natural boundaries')
- `config` (object) - Configuration options

## Configuration Options

- `limit` (number) - Maximum length constraint (default: 100)
- `unit` (string) - Unit type: 'characters', 'words', or 'tokens' (default: 'characters')
- `chunkLen` (number) - Chunk size for processing very long texts (default: 4000)
- `maxAttempts` (number) - Maximum retry attempts for LLM calls (default: 2)
- `llm` (object) - LLM configuration (model name, temperature, etc.)

## Return Value

Always returns an object with:

- `truncated` (string) - The intelligently truncated text
- `cutPoint` (number) - Position where text was cut (in specified units)
- `cutType` (string) - Type of boundary used: 'full', 'paragraph', 'sentence', 'clause', 'word', 'character', or 'soft'
- `preservationScore` (number) - Confidence score 0.0-1.0 representing informativeness preserved
- `reasoning` (string) - LLM's explanation of the truncation decision

## How It Works

1. **LLM Analysis**: The language model analyzes the text to understand its structure and meaning
2. **Intelligent Boundaries**: Rather than using regex, the LLM identifies natural semantic boundaries
3. **Context Awareness**: Considers the overall meaning and importance of different sections
4. **Qualitative Decisions**: Makes decisions based on understanding, not just syntactic patterns
5. **Fallback Safety**: If LLM calls fail, falls back to simple truncation methods

## Examples

**Semantic-aware truncation:**
```javascript
const result = await truncate(
  'Introduction paragraph. Main argument with supporting details. Conclusion.',
  'Keep the most essential content',
  { limit: 50 }
);
// LLM chooses to keep introduction + start of main argument
```

**Word-based with custom instructions:**
```javascript
const result = await truncate(
  'Technical documentation about API endpoints and their parameters.',
  'Prioritize technical accuracy over completeness',
  { limit: 8, unit: 'words' }
);
// { truncated: 'Technical documentation about API endpoints and', cutType: 'word', ... }
```

**Long text chunking:**
```javascript
const longText = 'Very long document...'.repeat(1000);
const result = await truncate(longText, 'Preserve introduction', {
  limit: 200,
  chunkLen: 2000  // Process in smaller chunks
});
// Handles long texts efficiently by chunking
```

**Custom LLM configuration:**
```javascript
const result = await truncate(text, 'Truncate for mobile display', {
  limit: 140,
  llm: {
    temperature: 0.1,  // More deterministic
    modelName: 'gpt-4'
  }
});
```

## Advantages Over Regex-Based Truncation

- **Context Understanding**: Knows what's important vs. filler content
- **Semantic Boundaries**: Finds meaningful break points, not just syntactic ones
- **Adaptive**: Adjusts approach based on content type and instructions
- **Quality Preservation**: Optimizes for meaning retention over rigid rules
- **Flexible**: Can follow complex, nuanced truncation instructions

## Error Handling

If LLM calls fail, the function gracefully falls back to simple character/word truncation while maintaining the same return structure. Console warnings are logged for debugging.

The function is designed to always return a valid result, even under error conditions, making it reliable for production use.