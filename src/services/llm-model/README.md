# llm-model

Capability-based model selection service. Negotiates the best LLM for a task by matching required and preferred capabilities against registered models.

## Usage

```javascript
import modelService, { resolveModel, getCapabilities } from './index.js';

// Negotiate by capability flags
modelService.negotiateModel(undefined, { fast: true, cheap: true });
// → 'fastCheap'

// Sensitive models take absolute priority
modelService.negotiateModel(undefined, { sensitive: true });
// → 'sensitive' (local model)

// Preferred model wins if it satisfies constraints
modelService.negotiateModel('fastGood', { fast: true });
// → 'fastGood'

// Resolve an llm config to a model key (same shapes chains accept)
resolveModel('fastGood');                          // → 'fastGood'
resolveModel({ fast: true, good: 'prefer' });      // → 'fastGoodCheap' or similar
resolveModel({ modelName: 'good', cheap: true });  // → negotiated key

// Inspect capabilities
getCapabilities('fastGoodCheap');  // → Set(['fast', 'good', 'cheap'])
```

## API

### `modelService.negotiateModel(preferred, negotiation)`

Selects the best model key for a set of capability constraints.

- `preferred` (string|undefined) — model key to use if it satisfies all hard constraints
- `negotiation` (object) — capability flags:
  - `fast`, `cheap`, `good`, `reasoning`, `multi`, `sensitive`
  - `true` — hard require
  - `false` — hard exclude
  - `'prefer'` — soft preference (used to rank when multiple models match)

Returns a model key string or `undefined`.

### `resolveModel(llm)`

Resolves the same `llm` shapes that chains and verblets accept:

- `string` — model key lookup (`'fastGood'`)
- `{ fast: true, good: 'prefer' }` — capability flags → negotiation
- `{ modelName: 'fastGood', cheap: true }` — preferred + flags

Returns the resolved model key or `undefined`.

### `getCapabilities(modelKey)`

Returns the `Set` of capability strings for a registered model key, or `undefined` if unregistered.

### `modelService.getModel(name)`

Looks up a model by key, then by catalog name. Returns a `Model` instance with `name`, `maxContextWindow`, `maxOutputTokens`, `requestTimeout`, `endpoint`, `apiUrl`, `apiKey`, `systemPrompt`, `toTokens(text)`, and `budgetTokens(text, options)`.

### `modelService.getRequestConfig(options)`

Builds a provider-ready request object from `{ prompt, modelName, temperature, maxTokens, topP, frequencyPenalty, presencePenalty, systemPrompt, response_format, tools, toolChoice }`.

### Global overrides

```javascript
modelService.setGlobalOverride('temperature', 0.9);
modelService.clearGlobalOverride('temperature');
modelService.getAllGlobalOverrides();
```

Valid keys: `modelName`, `negotiate`, `temperature`, `maxTokens`, `topP`, `frequencyPenalty`, `presencePenalty`.

## Negotiation algorithm

1. **Sensitive check** — if `sensitive: true` or `sensitive: 'prefer'`, return the sensitive model immediately (with `good` routing to `sensitiveGood` when available)
2. **Preferred model** — if `preferred` satisfies all hard constraints, return it
3. **Priority scan** — walk a prioritized model list; filter by hard constraints, rank by prefer score
4. **Best match** — return the highest-scoring model, or `undefined` if none match
