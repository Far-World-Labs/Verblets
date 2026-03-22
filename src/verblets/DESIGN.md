# Verblet Module Guidelines

## Overview

Verblets are AI-powered functions that emulate constructs from classical programming while adding intelligence. They represent single-purpose operations that transform input data through LLM processing, providing structured outputs with schema validation.

**For complex multi-step workflows, see [Chain Design Guidelines](../chains/DESIGN.md)** - chains build on these verblet patterns to orchestrate batch processing, retry logic, and stateful operations.

## What is a Verblet?

Verblets are the foundational building blocks of the AI function library. They handle:
- **Single Purpose Operations**: Each verblet performs one clear, focused task
- **Reliable Structured Output**: Consistent JSON responses using schemas
- **Input Validation**: Contract-based validation with meaningful errors
- **LLM Integration**: Seamless interaction with language models

## Module Structure

Each verblet directory contains:
- `index.js` - Main implementation
- `index.spec.js` - Unit tests (mock LLM calls)
- `index.examples.js` - Integration examples (real LLM calls)
- `README.md` - **Optional for simple verblets**, required for complex ones

## Core Characteristics

- **Single Purpose**: Each verblet performs one clear operation
- **Reliable Output**: Consistent structured responses using schemas
- **Error Handling**: Graceful failure with meaningful error messages
- **Async Behavior**: All verblets return promises
- **Schema-Driven**: Use JSON schemas for structured output validation

## Schema Passing and Structured Output

**This is the most critical aspect for reliable verblets.** Understanding proper schema configuration prevents JSON parsing issues and ensures consistent responses.

### Correct Schema Configuration

Pass `response_format` flat on the config object:

```javascript
import callLlm from '../../lib/llm/index.js';

export default async function sentiment(text, config = {}) {
  const prompt = `Analyze the sentiment of this text: ${text}`;

  const response = await callLlm(prompt, {
    ...config,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'sentiment_result',
        schema: {
          type: 'object',
          properties: {
            sentiment: {
              type: 'string',
              enum: ['positive', 'negative', 'neutral'],
            },
            confidence: { type: 'number' },
            reasoning: { type: 'string' },
          },
          required: ['sentiment', 'confidence', 'reasoning'],
          additionalProperties: false,
        },
      },
    },
  });

  // callLlm parses structured output automatically
  return response;
}
```

### Schema Design Best Practices

**Use Specific Types and Constraints:**
```javascript
const schema = {
  type: 'object',
  properties: {
    category: {
      type: 'string',
      enum: ['urgent', 'normal', 'low'],
    },
    score: { type: 'number' },
    description: { type: 'string' },
  },
  required: ['category', 'score', 'description'],
  additionalProperties: false,
};
```

**Always include `additionalProperties: false`** on object schemas — required by the structured output API.

**Array Processing Schemas:**
```javascript
const listSchema = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          processed: { type: 'boolean' },
          result: { type: 'string' },
        },
        required: ['id', 'processed', 'result'],
        additionalProperties: false,
      },
    },
  },
  required: ['items'],
  additionalProperties: false,
};
```

### Common Schema Passing Mistakes

**Wrong: Embedding schema in prompt**
```javascript
const prompt = `Return JSON with this structure: {"sentiment": "positive|negative|neutral"}`;
// This leads to unreliable parsing and markdown-wrapped responses
```

**Wrong: Not including additionalProperties: false**
```javascript
const schema = { type: 'object', properties: { ... }, required: ['...'] };
// Missing additionalProperties: false — will get 400 errors from the API
```

### Response Handling

callLlm automatically parses structured output and auto-unwraps `{value: ...}` and `{items: [...]}` patterns. No manual JSON parsing needed.

## Config System

Verblets participate in the same config system as chains. Prompt-shaping options use `getOption` directly (verblets typically have 1-2 options, so `getOptions` batch resolution is unnecessary):

```javascript
import callLlm from '../../lib/llm/index.js';
import { getOption } from '../../lib/context/option.js';

export const mapDivergence = (value) => {
  if (value === undefined) return undefined;
  if (typeof value === 'string') {
    return {
      low: 'Stay close to the original query with minor keyword variations.',
      high: 'Generate maximally diverse variants with contrasting terminology.',
    }[value];
  }
  return value;
};

export default async function multiQuery(query, config = {}) {
  const divergence = await getOption('divergence', config, undefined);
  const guidance = mapDivergence(divergence);

  const prompt = buildPrompt(query, guidance);
  return callLlm(prompt, { ...config, response_format: schema });
}
```

For verblets, `callLlm` resolves `llm` and all model keys from config — just spread config and add any verblet-specific keys.

## Expected Exports

```javascript
// Optional: mapper for prompt-shaping options
export const mapDivergence = (value) => { /* ... */ };

/**
 * Extract sentiment from text input
 * @param {string} text - The text to analyze
 * @param {Object} [config] - Configuration (llm, policy, etc.)
 * @returns {Promise<Object>} Sentiment analysis result
 */
export default async function sentiment(text, config = {}) {
  // Implementation
}
```

## Common Verblet Types

- **Primitive**: Extract single values (`toNumber`, `toBool`, `toEnum`)
- **List**: Process arrays of items (`map`, `filter`, `reduce` operations)
- **Content**: Generate or transform text content (`summarize`, `rewrite`)
- **Analysis**: Analyze and classify content (`sentiment`, `intent`, `classify`)
- **Embedding**: Query transforms for RAG (`embedMultiQuery`, `embedStepBack`, `embedSubquestions`)

## Error Handling

Use contract-based validation with meaningful error messages:

```javascript
export default async function sentiment(text, config = {}) {
  if (!text || typeof text !== 'string') {
    throw new Error('Text input is required and must be a string');
  }

  return callLlm(buildPrompt(text), {
    ...config,
    response_format: sentimentSchema,
  });
}
```

## Documentation Standards

### When README is Required

**Complex verblets need documentation when they have:**
- Multiple configuration options beyond basic `llm` settings
- Non-obvious behavior or edge cases
- Custom schema requirements
- Performance considerations

### When README is Optional

**Simple verblets can skip documentation when they:**
- Have single parameter input with obvious behavior
- Use standard verblet patterns without customization
- Are self-explanatory from function name and JSDoc

### README Structure (when needed)

```markdown
# Verblet Name

Brief description of what it does and when to use it.

## Usage

\`\`\`javascript
import { verbletName } from '@far-world-labs/verblets';
const result = await verbletName(input, { divergence: 'high' });
\`\`\`

## Options
- `divergence` - `'low'` | `'high'` — controls variant diversity
- `llm` - Model selection (string, capability object, or full config)

## Returns
Description of output structure and format
```

## Testing Standards

### Unit Tests (index.spec.js)

Mock LLM calls for fast, deterministic tests:

```javascript
import { vi, describe, it, expect } from 'vitest';
import sentiment from './index.js';
import llm from '../../lib/llm/index.js';

vi.mock('../../lib/llm/index.js');

describe('sentiment', () => {
  it('should analyze positive sentiment', async () => {
    llm.mockResolvedValue({
      sentiment: 'positive',
      confidence: 0.95,
      reasoning: 'Expresses joy and satisfaction',
    });

    const result = await sentiment('I love this product!');

    expect(result.sentiment).toBe('positive');
    expect(llm).toHaveBeenCalledWith(
      expect.stringContaining('I love this product!'),
      expect.objectContaining({
        response_format: expect.any(Object),
      })
    );
  });
});
```

### Integration Tests (index.examples.js)

Use real LLM calls for validation with vitest test wrappers.

## Anti-Patterns

### Schema and Response Handling
- **Missing `additionalProperties: false` on object schemas** — causes 400 errors from the structured output API
- **Not handling both string and object response types from structured output**
- **Assuming all LLM responses will be markdown-wrapped (structured output returns clean JSON)**

### Config Handling
- **Nesting model keys under `modelOptions`** — pass `response_format`, `temperature`, etc. flat on config
- **Extracting `llm` from config to re-pass** — callLlm resolves it from config automatically
- **Hard-coding model names** — use capability-based selection via `llm` parameter

### General Patterns
- Over-defensive input validation for simple cases
- Embedding schemas directly in prompts
- Complex configuration for simple operations
- Hard-coding timeouts or retry logic without configuration options
