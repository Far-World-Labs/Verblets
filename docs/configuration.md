# Configuration

Every verblet and chain accepts a config object as its last parameter. Config flows through the entire call tree — pass it once and everything resolves from it.

## Model Selection

The `llm` key controls which model handles the request. Three forms:

```javascript
// String shorthand — common presets
await filter(items, 'urgent', { llm: 'fastGoodCheap' });

// Capability object — declarative requirements
await filter(items, 'urgent', { llm: { fast: true, good: 'prefer' } });

// Explicit model
await filter(items, 'urgent', { llm: { modelName: 'claude-sonnet-4-20250514' } });
```

### Capabilities

Six capability keys control model selection: `fast` (low latency), `cheap` (low cost), `good` (high quality), `reasoning` (strong logic), `multi` (multimodal), and `sensitive` (privacy-capable models).

Each takes `true` (require), `false` (exclude), or `'prefer'` (soft preference).

## Model Parameters

All standard LLM parameters are flat on the config object:

```javascript
await map(items, 'translate to French', {
  temperature: 0.3,       // Sampling temperature (0.0–1.0)
  maxTokens: 500,         // Maximum output tokens
  topP: 0.9,              // Nucleus sampling
  frequencyPenalty: 0.3,  // Reduce repetition
  presencePenalty: 0.1,   // Encourage topic diversity
  systemPrompt: '...',    // System message
  requestTimeout: 30000,  // Timeout in milliseconds
});
```

## Batch and Retry

Chains that process lists accept:

```javascript
await filter(items, 'relevant', {
  batchSize: 10,          // Items per LLM call (auto-calculated if omitted)
  maxParallel: 3,         // Concurrent batch requests
  maxAttempts: 3,         // Retry attempts per batch
  onProgress: (event) => console.log(event),  // Progress callback
  abortSignal: controller.signal,             // Cancellation
});
```

## Chain-Specific Options

Many chains have their own tuning parameters that control how deeply or broadly they operate. All dial-style options accept `'low'` or `'high'` as string shorthands, or a structured object for fine-grained control.

For example, `strictness` on [filter](../src/chains/filter) controls borderline inclusion. `granularity` on [group](../src/chains/group) controls category breadth. `thoroughness` on [detect-patterns](../src/chains/detect-patterns) controls analysis depth. `effort` on [score](../src/chains/score) controls iterations and precision. Each chain's README documents its specific options.

## Policy

For application-wide control, use the `policy` map. Policy functions receive an evaluation context and can override any config value dynamically:

```javascript
const config = {
  policy: {
    temperature: (ctx) => ctx.operation === 'socratic' ? 0.9 : 0.3,
    sensitive: (ctx) => ctx.operation.startsWith('veiled'),
    llm: (ctx) => ctx.operation.includes('score') ? { good: true } : 'fastGoodCheap',
  },
};

// Every chain using this config resolves its options through the policy
await filter(items, 'urgent', config);
await score(items, 'quality', config);
```

See [option resolution](../src/lib/context/option.js) for the full API: `getOption`, `getOptions`, `withPolicy`, `scopeOperation`, `initChain`.

## Structured Output

When a function needs structured JSON responses, it uses `response_format` internally. The `callLlm` module auto-parses responses and unwraps common patterns (`{value: x}` → `x`, `{items: [...]}` → `[...]`).

For custom structured output at the consumer level, see [to-object](../src/chains/to-object/) for JSON repair and [JSON Schema Guidelines](../guidelines/JSON_SCHEMAS.md) for schema design.
