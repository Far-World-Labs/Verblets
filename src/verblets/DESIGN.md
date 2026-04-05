# Verblet Module Guidelines

Verblets are single-purpose AI functions — one LLM call, one focused task, structured output via JSON schema. They are the building blocks that chains compose into multi-step workflows.

**For chains, see [Chain Design Guidelines](../chains/DESIGN.md).**

## Module Structure

Each verblet directory contains:
- `index.js` — implementation
- `index.spec.js` — unit tests (mocked LLM)
- `index.examples.js` — integration examples (real LLM)
- `README.md` — optional for simple verblets, required for complex ones

## Structured Output

Pass `response_format` flat on the config object alongside other options. callLlm handles JSON parsing and auto-unwraps `{ value }` and `{ items }` wrappers. See [JSON Schema Guidelines](../../.claude/guidelines/JSON_SCHEMAS.md) for schema design patterns, collection conventions, and common mistakes.

```javascript
import callLlm from '../../lib/llm/index.js';

export default async function sentiment(text, config = {}) {
  return callLlm(`Analyze the sentiment of this text: ${text}`, {
    ...config,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'sentiment_result',
        schema: {
          type: 'object',
          properties: {
            sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
            confidence: { type: 'number' },
            reasoning: { type: 'string' },
          },
          required: ['sentiment', 'confidence', 'reasoning'],
          additionalProperties: false,
        },
      },
    },
  });
}
```

## Config System

Verblets participate in the same config system as chains (see [option resolution](../../docs/option-resolution.md)). The difference: verblets typically have 1-2 options, so they use `getOption` directly rather than `getOptions` batch resolution.

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

README is optional for verblets with a single parameter and obvious behavior. Required when there are multiple config options, non-obvious edge cases, or custom schemas. See [DOCUMENTATION.md](../../.claude/guidelines/DOCUMENTATION.md) for structure and quality standards.

## Testing

**Unit tests** (`index.spec.js`): mock `callLlm`, verify the prompt contains expected content and `response_format` is passed. **Integration tests** (`index.examples.js`): real LLM calls with vitest test wrappers. See [example test conventions](../../docs/example-test-conventions.md).

## Anti-Patterns

- Embedding schemas in prompts instead of using `response_format` (see [JSON Schema Guidelines](../../.claude/guidelines/JSON_SCHEMAS.md))
- Nesting model keys under `modelOptions` — pass `response_format`, `temperature`, etc. flat on config
- Extracting `llm` from config to re-pass — callLlm resolves it automatically
- Over-defensive input validation for simple single-parameter verblets
- Hard-coding model names instead of capability-based selection
