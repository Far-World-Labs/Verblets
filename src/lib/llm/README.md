# llm

Core LLM integration for making API calls with capability-based model selection, config-aware option resolution, and structured response handling.

## Usage

```javascript
import callLlm from './index.js';

// Basic usage — default model
const response = await callLlm('Explain quantum computing in simple terms');

// With config from a chain (typical usage)
const config = scopeOperation('my-chain', { llm: 'fastGoodCheap', ...inputConfig });
const result = await callLlm(prompt, { ...config, response_format: responseFormat });

// With capability-based model selection
const result = await callLlm(prompt, {
  llm: { fast: true, good: 'prefer' },
  temperature: 0.7,
  response_format: {
    type: 'json_schema',
    json_schema: {
      name: 'colors',
      schema: {
        type: 'object',
        properties: {
          items: { type: 'array', items: { type: 'string' } },
        },
        required: ['items'],
        additionalProperties: false,
      },
    },
  },
});
```

## API

### `callLlm(prompt, options)`

**Parameters:**
- `prompt` (string): The text prompt to send to the LLM
- `options` (object, optional): Configuration — all keys are flat on the options object
  - `llm` (string | object): Model selection — string shorthand (`'fastGoodCheap'`), capability object (`{ fast: true, good: 'prefer' }`), or full config (`{ modelName: 'model-key' }`)
  - `response_format` (object): Structured output schema
  - `temperature` (number): Sampling temperature
  - `frequencyPenalty` (number): Frequency penalty
  - `presencePenalty` (number): Presence penalty
  - `systemPrompt` (string): System message
  - `requestTimeout` (number): Request timeout in milliseconds
  - `tools` (array): Tool definitions
  - `toolChoice` (string | object): Tool choice strategy
  - `maxTokens` (number): Maximum output tokens
  - `topP` (number): Nucleus sampling parameter
  - `logger` (object): Logger instance
  - `onBeforeRequest` (function): Hook called before the API request
  - `abortSignal` (AbortSignal): Signal to cancel the request

**Returns:** Promise that resolves with the LLM response (string, or parsed object for structured outputs with auto-unwrapping of `{value: ...}` and `{items: [...]}` patterns).

## Config-aware resolution

All model keys (`response_format`, `temperature`, `frequencyPenalty`, `presencePenalty`, `systemPrompt`, `requestTimeout`, `tools`, `toolChoice`, `maxTokens`, `topP`) and capability keys (`fast`, `cheap`, `good`, `reasoning`, `multi`, `sensitive`) are resolved through `getOption` before building the internal model options. This means any of these can be set via the `policy` channel:

```javascript
const config = {
  policy: {
    temperature: (ctx) => ctx.operation === 'socratic' ? 0.9 : 0.5,
    sensitive: (ctx) => ctx.operation.startsWith('veiled'),
  },
};
```

The `llm` parameter itself is also resolved from config — chains with non-standard model defaults set them on `scopeOperation`:

```javascript
const config = scopeOperation('my-chain', { llm: 'fastGoodCheap', ...inputConfig });
// callLlm resolves llm from config automatically
await callLlm(prompt, config);
```

## Model selection

### Capability values
- `true` — require this capability
- `false` — exclude models with this capability
- `'prefer'` — soft preference, use if available

### Capability keys
`fast`, `cheap`, `good`, `reasoning`, `multi`, `sensitive`

```javascript
// Fast and cheap for bulk operations
await callLlm(prompt, { llm: { fast: true, cheap: true } });

// Quality-focused
await callLlm(prompt, { llm: { good: true } });

// Sensitive data — routes to privacy-capable models
await callLlm(prompt, { llm: { sensitive: true } });
```

## Structured outputs

```javascript
const result = await callLlm('List 5 programming languages', {
  response_format: {
    type: 'json_schema',
    json_schema: {
      name: 'languages',
      schema: {
        type: 'object',
        properties: {
          items: { type: 'array', items: { type: 'string' } },
        },
        required: ['items'],
        additionalProperties: false,
      },
    },
  },
});

// Result is automatically parsed; {items: [...]} is auto-unwrapped to the array
console.log(result); // ['JavaScript', 'Python', 'Java', 'C++', 'Go']
```

## Related Modules

- [`context/option`](../context/option.js) - `getOption` used for config-aware resolution
- [`llm-model`](../../services/llm-model/README.md) - Model negotiation and selection service
- [`retry`](../retry/README.md) - Retry logic (used by chains wrapping callLlm)
- [`normalize-llm`](../normalize-llm/index.js) - Normalizes `llm` parameter to model config
