# truncate

Intelligently truncate text at natural semantic boundaries while preserving maximum informativeness within specified length constraints.

This function analyzes text structure to find optimal truncation points that maintain readability and meaning. It prioritizes semantic units like paragraphs, sentences, and clauses over arbitrary character cuts.

## Usage

```javascript
import truncate from 'verblets/src/chains/truncate/index.js';

const text = `The Verblets project provides AI utilities. It helps build complex
systems by combining language understanding with deterministic code.`;

const result = truncate(text, { limit: 50 });
// {
//   truncated: "The Verblets project provides AI utilities.",
//   cutPoint: 43,
//   cutType: "sentence", 
//   preservationScore: 0.512
// }
```

## Options

- `limit` (number) - Maximum length constraint (default: text length)
- `unit` (string) - Unit type: 'characters', 'words', or 'tokens' (default: 'characters')  
- `tokenizer` (function) - Custom tokenizer for 'tokens' unit (default: split on whitespace)

## Return Value

Always returns an object with:

- `truncated` (string) - The truncated text
- `cutPoint` (number) - Position where text was cut (in specified units)
- `cutType` (string) - Type of boundary used: 'full', 'paragraph', 'sentence', 'clause', 'word', 'code-block', 'soft', or 'none'
- `preservationScore` (number) - Confidence score 0.0-1.0 representing informativeness preserved

## Boundary Priority

The function attempts truncation in this order:

1. **Full text** - If under limit, returns complete text
2. **Paragraph boundaries** - Natural document sections
3. **Sentence boundaries** - Complete thoughts 
4. **Clause boundaries** - Comma/semicolon separated phrases
5. **Word boundaries** - Complete words
6. **Code block boundaries** - Preserves complete ```code``` blocks
7. **Soft truncation** - Character/token cut as fallback

## Examples

**Word-based truncation:**
```javascript
truncate('The quick brown fox jumps', { limit: 3, unit: 'words' })
// { truncated: 'The quick brown', cutType: 'word', cutPoint: 3, ... }
```

**Custom tokenizer:**
```javascript
const tokenizer = text => text.split(',');
truncate('a,b,c,d', { limit: 2, unit: 'tokens', tokenizer })
// { truncated: 'a,b', cutPoint: 2, ... }
```

**Code preservation:**
```javascript
const code = 'Example:\n\n```js\nfunction test() { return true; }\n```\n\nMore text.';
truncate(code, { limit: 60 })
// Preserves complete code block when possible
```

The function ensures truncated output remains meaningful and self-contained, making it ideal for previews, summaries, and content excerpts.