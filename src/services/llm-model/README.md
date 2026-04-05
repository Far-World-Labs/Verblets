# llm-model

Capability-based model selection service. Negotiates the best LLM for a task by matching required and preferred capabilities against registered models.

## Usage

```javascript
import modelService, { resolveModel, getCapabilities } from './index.js';

// Negotiate by capability flags — returns a Model instance
modelService.negotiateModel(undefined, { fast: true, cheap: true });
// → Model { name: 'gpt-4.1-mini', ... }

// Gated capabilities require explicit opt-in
modelService.negotiateModel(undefined, { sensitive: true });
// → Model { name: 'qwen3.5:2b', ... } (local model)

// Preferred model wins if it satisfies constraints
modelService.negotiateModel('gpt-4.1-mini', { fast: true });
// → Model { name: 'gpt-4.1-mini', ... }

// Resolve an llm config to a model name (same shapes chains accept)
resolveModel('gpt-4.1-mini');                              // → 'gpt-4.1-mini'
resolveModel({ fast: true, good: 'prefer' });              // → 'gpt-4.1-mini'
resolveModel({ modelName: 'gpt-4.1-mini', cheap: true }); // → 'gpt-4.1-mini'

// Inspect capabilities
getCapabilities('gpt-4.1-mini');  // → Set(['fast', 'good', 'cheap', 'multi'])
```

## API

### `modelService.negotiateModel(preferred, negotiation)`

Selects the best model for a set of capability constraints.

- `preferred` (string|undefined) — model name to use if it satisfies all hard constraints
- `negotiation` (object) — capability flags:
  - `fast`, `cheap`, `good`, `reasoning`, `multi`, `sensitive`
  - `true` — hard require
  - `false` — hard exclude
  - `'prefer'` — soft preference (used to rank when multiple models match)

Returns a `Model` instance or `undefined`.

### `resolveModel(llm)`

Resolves the same `llm` shapes that chains and verblets accept:

- `string` — model name lookup (`'gpt-4.1-mini'`)
- `{ fast: true, good: 'prefer' }` — capability flags → negotiation
- `{ modelName: 'gpt-4.1-mini', cheap: true }` — preferred + flags

Returns the resolved model name or `undefined`.

### `getCapabilities(modelName)`

Returns the `Set` of capability strings for a registered model, or `undefined` if unregistered.

### `modelService.getModel(name)`

Looks up a model by name, then by catalog name. Returns a `Model` instance with `name`, `maxContextWindow`, `maxOutputTokens`, `requestTimeout`, `endpoint`, `apiUrl`, `apiKey`, `systemPrompt`, `toTokens(text)`, and `budgetTokens(text, options)`.

### `modelService.getRequestConfig(options)`

Builds a provider-ready request object from `{ prompt, modelName, temperature, maxTokens, topP, frequencyPenalty, presencePenalty, systemPrompt, response_format, tools, toolChoice }`.

### `modelService.setModels(entries)`

Replaces the model registry from `[capabilityObject, catalogModelName]` tuples:

```javascript
modelService.setModels([
  [{ fast: true, good: true, cheap: true, multi: true }, 'gpt-4.1-mini'],
  [{ fast: true, cheap: true }, 'gpt-4.1-nano'],
  [{ reasoning: true, good: true, multi: true }, 'claude-opus-4-6'],
]);
```

## Negotiation algorithm

1. **Filter** — entries must satisfy hard constraints (`true` = must have, `false` = must not have)
2. **Gating** — entries with gated capabilities (`sensitive`, `reasoning`) excluded unless consumer requests them
3. **Preferred model** — if `preferred` satisfies all constraints, return it
4. **Score** — `(prefer matches × 1000) + total capability count`; highest wins, array order breaks ties
