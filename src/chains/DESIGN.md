# Chain Module Guidelines

## What is a Chain?

Chains are AI-powered workflows that handle complex, multi-step processes. They orchestrate multiple LLM calls, manage batch processing, implement retry logic, and coordinate stateful operations that go beyond single verblet capabilities.

**Chains build on verblets** - they use the same core patterns for LLM interaction, schema handling, and structured output. For foundational concepts like schema passing, response handling, and basic LLM configuration, see [Verblet Design Guidelines](../verblets/DESIGN.md).

## Chain vs Verblet

| Aspect | Verblets | Chains |
|--------|----------|--------|
| **Purpose** | Single AI operation | Multi-step AI workflows |
| **Complexity** | Simple, focused functions | Complex orchestration logic |
| **Input** | Individual items or simple data | Arrays, batches, complex datasets |
| **Processing** | Direct LLM calls | Batch processing, retry logic, progress tracking |
| **State** | Stateless operations | Stateful workflows with coordination |
| **Examples** | `sentiment()`, `classify()` | `aiArchExpect()`, `bulkAnalysis()` |

## Module Structure

### Directory Naming
- Use **kebab-case** for directory names (e.g., `pop-reference`, `filter-ambiguous`)
- Keep names descriptive but concise
- Follow existing patterns in the codebase

### Required Files
Each chain directory contains:
- `index.js` - Main implementation
- `index.spec.js` - Unit tests (mock LLM calls)
- `index.examples.js` - Integration examples (real LLM calls)
- `schema.json` - Output schema (when applicable)
- `README.md` - **Required for most chains**, optional only for very simple ones

## Config System

Every chain participates in the config resolution system via `initChain`:

```javascript
import callLlm from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { initChain, withPolicy } from '../../lib/context/option.js';

export const mapEffort = (value) => {
  if (value === undefined) return { iterations: 1, extremeK: 10 };
  if (typeof value === 'object') return value;
  return {
    low: { iterations: 1, extremeK: 5 },
    high: { iterations: 2, extremeK: 15 },
  }[value] ?? { iterations: 1, extremeK: 10 };
};

export default async function myChain(items, inputConfig = {}) {
  const { config, iterations, extremeK } = await initChain('my-chain', inputConfig, {
    effort: withPolicy(mapEffort, ['iterations', 'extremeK']),
  });

  // Use resolved values; pass config to callLlm and retry
  const result = await retry(
    () => callLlm(prompt, config),
    { label: 'my-chain', config }
  );

  return result;
}
```

### Key principles

- **`initChain(name, config, spec)`** combines `scopeOperation` + `getOptions` in one call. Returns `{ config, ...resolvedOptions }`.
- **`withPolicy` override keys** flatten sub-properties into the result. `withPolicy(mapEffort, ['iterations', 'extremeK'])` makes each sub-key individually overridable by the consumer.
- **Config flows through directly** — pass `config` to `callLlm`, `retry`, and sub-chain calls. No need to extract and re-pass `llm`, `onProgress`, `abortSignal`, or retry params.
- **`callLlm` resolves `llm` from config** — chains with non-standard model defaults set them in `initChain`: `initChain('name', { llm: 'fastGoodCheap', ...inputConfig }, spec)`.
- **`retry` is config-aware** — resolves `maxAttempts`, `retryDelay`, `retryOnAll` from config via `getOption`. Pass `{ label, config }` instead of explicit retry params.

### Model Configuration

- **Use capability-based selection** — pass `llm` as a string shorthand (`'fastGoodCheap'`), capability object (`{ fast: true, good: 'prefer' }`), or full config (`{ modelName: 'model-key' }`)
- Set model defaults on `scopeOperation`, not as destructured fallbacks
- Only specify non-default model keys when specific capabilities are needed (e.g., `{ sensitive: true }`)

### Prompt Engineering Best Practices

- **Parameter ordering** - Put description/instruction parameters higher in the prompt since they're more important for guiding LLM interpretation
- **Content wrapping** - Wrap all caller-supplied content with `asXML()` for lengthy inputs to ensure proper formatting
- **Structured tags** - Include proper XML tags for structured content (e.g., `<sentence>`, `<description>`, `<items>`)
- **Clear sections** - Separate instructions, context, and data clearly in the prompt

Example:
```javascript
const prompt = `Process the following based on the description.

${asXML(description, { tag: 'description' })}

${asXML(sentence, { tag: 'sentence' })}

Requirements:
- Be specific about expectations
- Use the description to guide interpretation

${onlyJSON}`;
```

### Batch Processing with Progress Tracking

Use `prepareBatches` to combine batching, progress tracking, and config resolution:

```javascript
import { prepareBatches } from '../../lib/progress-callback/index.js';
import parallel from '../../lib/parallel-batch/index.js';

export default async function myChain(items, inputConfig = {}) {
  const { config, progressMode } = await initChain('my-chain', inputConfig, {
    progressMode: 'batch',
  });

  const { batches, tracker } = await prepareBatches('my-chain', items, config, { progressMode });
  const results = await parallel(batches, async (batch) => {
    const result = await retry(
      () => callLlm(buildPrompt(batch.items), config),
      { label: 'my-chain:batch', config }
    );
    tracker.batchDone(batch.items.length);
    return result;
  }, { maxParallel: config.maxParallel ?? 3 });

  tracker.complete();
  return results.flat();
}
```

`prepareBatches` handles `createBatches` + `batchTracker` + `start` in one call. The tracker manages counters and emits progress events to `config.onProgress`.

### Scoping Progress for Nested Chains

When a chain passes `onProgress` to a nested chain call, use `scopeProgress` to tag events with a `phase` field so consumers can distinguish parent events from nested events:

```javascript
import { scopeProgress } from '../../lib/progress-callback/index.js';

// Phase format: chainName:purpose
const results = await reduce(items, prompt, {
  ...config,
  onProgress: scopeProgress(config.onProgress, 'reduce:category-discovery'),
});
```

Phases compose recursively with `/` when scoped chains are themselves wrapped by an outer scope:

```js
// Consumer sees: { step: 'reduce', phase: 'group:workflow/reduce:category-discovery', ... }
```

Phase naming convention is `chainName:purpose` — the chain being called plus a short description of its role. This speciates when the same chain is called multiple times (e.g. `reduce:extraction` vs `reduce:refinement`).

### Failure Handling Strategies

Chains need sophisticated error recovery:

```javascript
async function processWithFailureHandling(items, inputConfig = {}) {
  const { config, errorPosture } = await initChain('my-chain', inputConfig, {
    strictness: withPolicy(mapStrictness, ['errorPosture']),
  });

  const results = [];
  for (const item of items) {
    try {
      const result = await retry(
        () => callLlm(buildPrompt(item), config),
        { label: 'my-chain:item', config }
      );
      results.push(result);
    } catch (error) {
      if (errorPosture === 'strict') throw error;
      results.push(undefined);
    }
  }

  return results;
}
```

## Chain-Specific Schema Patterns

### Bulk Processing Schemas

Chains often need schemas that handle arrays of results:

```javascript
const bulkSchema = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          passed: { type: 'boolean' },
          reason: { type: 'string' },
        },
        required: ['path', 'passed', 'reason'],
        additionalProperties: false,
      },
    },
  },
  required: ['results'],
  additionalProperties: false,
};
```

## Expected Exports

```javascript
// Option mapper — pure, exported for testing and external validation
export const mapEffort = (value) => { /* ... */ };

/**
 * Process items using AI-powered workflow
 * @param {Array} items - Items to process
 * @param {Object} [config] - Configuration (passed to initChain)
 * @returns {Promise<Array>} Processed results
 */
export default async function chainName(items, config = {}) {
  // Implementation
}
```

## Common Chain Types

- **Analysis Chains**: Multi-step analysis workflows (`aiArchExpect`, `centralTendency`)
- **Transformation Chains**: Bulk data transformation with validation
- **Orchestration Chains**: Coordinate multiple verblets or external services
- **Aggregation Chains**: Collect and summarize results from multiple sources

## Integration Requirements

### Adding New Chains
1. Add entry to `src/index.js` exports
2. Add entry to main `README.md` under appropriate category
3. Follow the established export pattern for both named and verblets exports

### Testing Integration
- Import as: `import expect from '../expect/index.js';`
- Use pattern: `await expect(actual).toSatisfy(constraint)`

## Chain-Specific Documentation Requirements

**README Always Required For:**
- Batch processing strategies and configuration
- Progress tracking and callback patterns
- Complex failure handling logic
- Multi-step workflows with dependencies
- Performance considerations for large datasets
- Avoid generic feature lists (bulk processing, retries, etc.)

**README Structure:**
```markdown
# Chain Name

Brief description of the multi-step workflow.

## Usage

\`\`\`javascript
import { chainName } from '@far-world-labs/verblets';

const results = await chainName(items, {
  effort: 'high',
  onProgress: (event) => console.log(`${event.step} ${event.event}`),
});
\`\`\`

## Options
- `effort` - `'low'` | `'high'` — controls iterations and precision
- `onProgress` - Progress callback

## Performance Notes
[Guidance on batch sizes, concurrency, memory usage]
```

## Chain-Specific Testing Patterns

**Unit Tests should cover:**
- Option mapper behavior (structural contracts, not exact values)
- Config forwarding to callLlm and retry
- Failure handling and recovery scenarios
- Progress tracking and callback functionality

**Integration Tests should validate:**
- End-to-end workflows with real data
- Performance characteristics with various dataset sizes

## Anti-Patterns

- Destructuring config params and re-passing them individually — pass config directly
- Resolving retry params (`maxAttempts`, `retryDelay`, `retryOnAll`) in chains — retry resolves them from config
- Extracting `llm` from config to re-pass to callLlm — callLlm resolves it from config
- Hard-coded processing strategies without configuration options
- Poor error messages that don't indicate which items failed
- Missing progress feedback for long-running operations
