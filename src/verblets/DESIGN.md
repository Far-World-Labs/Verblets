# Verblet Module Guidelines

Verblets are single-purpose AI functions — one LLM call, one focused task, structured output via JSON schema. They are the building blocks that chains compose into multi-step workflows.

**For chains, see [Chain Design Guidelines](../chains/DESIGN.md).**

## Module Structure

Each verblet directory contains:
- `index.js` — implementation
- `index.spec.js` — unit tests (mocked LLM)
- `index.examples.js` — integration examples (real LLM)
- `README.md` — optional for simple verblets, required for complex ones

## Schema Passing and Structured Output

Proper schema configuration is the most critical aspect of reliable verblets. Pass `response_format` flat on the config object — callLlm parses the response and auto-unwraps `{ value }` and `{ items }` wrappers.

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

## Documentation

README is optional for verblets with a single parameter and obvious behavior. Required when there are multiple config options, non-obvious edge cases, or custom schemas. See [DOCUMENTATION.md](../../guidelines/DOCUMENTATION.md) for structure and quality standards.

## Testing

**Unit tests** (`index.spec.js`): mock `callLlm`, verify the prompt contains expected content and `response_format` is passed. **Integration tests** (`index.examples.js`): real LLM calls with vitest test wrappers. See [example test conventions](../../docs/example-test-conventions.md).

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
