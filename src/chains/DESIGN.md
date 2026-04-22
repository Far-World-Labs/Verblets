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
| **Examples** | `sentiment()`, `classify()` | `aiArchExpect()`, `documentShrink()` |

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

Every chain resolves options through `nameStep` + `createProgressEmitter` + `getOptions` and passes `runConfig` to `callLlm`, `retry`, and sub-chains. `nameStep` returns a plain config object with the composed operation path and timestamp. `createProgressEmitter` returns a lifecycle handle with `start()`, `emit()`, `metrics()`, `complete()`, `error()`, and `batch()` methods. Call `start()` to emit `chain:start`. See [option resolution](../../.claude/docs/option-resolution.md) for the full API (`nameStep`, `createProgressEmitter`, `getOptions`, `getOption`, `withPolicy`, mappers, override keys).

```javascript
import callLlm from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { resolveArgs, resolveTexts } from '../../lib/instruction/index.js';
import { nameStep, getOptions, withPolicy } from '../../lib/context/option.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { DomainEvent, Outcome } from '../../lib/progress/constants.js';

export const mapEffort = (value) => {
  if (value === undefined) return { iterations: 1, extremeK: 10 };
  if (typeof value === 'object') return value;
  return {
    low: { iterations: 1, extremeK: 5 },
    high: { iterations: 2, extremeK: 15 },
  }[value] ?? { iterations: 1, extremeK: 10 };
};

export default async function myChain(items, instructions, config = {}) {
  const { text, known, context } = resolveTexts(instructions, []);
  const runConfig = nameStep('my-chain', config);
  const emitter = createProgressEmitter('my-chain', runConfig.onProgress, runConfig);
  emitter.start();
  emitter.emit({ event: DomainEvent.input, value: items });

  const { iterations, extremeK } = await getOptions(runConfig, {
    effort: withPolicy(mapEffort, ['iterations', 'extremeK']),
  });

  const parts = [context, 'Process each item...', asXML(text, { tag: 'instructions' })];
  const prompt = parts.filter(Boolean).join('\n\n');

  const result = await retry(
    () => callLlm(prompt, runConfig),
    { label: 'my-chain', config: runConfig }
  );

  emitter.emit({ event: DomainEvent.output, value: result });
  emitter.complete({ outcome: Outcome.success });
  return result;
}

myChain.knownTexts = [];
```

### Instruction Normalization

Every chain normalizes its instruction parameter through `resolveTexts`:

```javascript
import { resolveTexts } from '../../lib/instruction/index.js';

const { text, known, context } = resolveTexts(instructions, ['spec']);
const spec = known.spec ?? (await generateSpec(text, runConfig));
```

When the instruction parameter is optional, use `resolveArgs` first to disambiguate:

```javascript
import { resolveArgs, resolveTexts } from '../../lib/instruction/index.js';

const [instructions, config] = resolveArgs(rawInstructions, rawConfig, ['spec']);
const { text, known, context } = resolveTexts(instructions, ['spec']);
```

### Prompt Assembly

Assemble prompts using the parts composition pattern:

```javascript
const parts = [
  context,                                          // XML from unknown instruction keys
  `Process the following based on the description.`,
  asXML(text, { tag: 'description' }),
  asXML(sentence, { tag: 'sentence' }),
  spec && asXML(spec, { tag: 'specification' }),    // optional sections
  `Requirements:\n- Be specific about expectations`,
];
const prompt = parts.filter(Boolean).join('\n\n');
```

This replaces template literals, `.replace()` on placeholder constants, and ad-hoc `bundleContext` conditionals. Optional parts are naturally handled — falsy values are filtered out.

### Prompt Engineering Best Practices

- **Parameter ordering** - Put description/instruction parameters higher in the prompt since they're more important for guiding LLM interpretation
- **Content wrapping** - Wrap all caller-supplied content with `asXML()` for lengthy inputs to ensure proper formatting
- **Structured tags** - Include proper XML tags for structured content (e.g., `<sentence>`, `<description>`, `<items>`)
- **Clear sections** - Separate instructions, context, and data clearly in the prompt

### Batch Processing with Progress Tracking

The standard pattern uses `prepareBatches` + `parallelBatch` + `trackBatch`. See [batching](../../.claude/docs/batching.md) for the full pattern with auto-sizing and code example, and [progress tracking](../../.claude/docs/progress-tracking.md) for the event lifecycle, `scopeProgress`, and `filterProgress`.

### Failure Handling

Retry is config-aware — see [retry](../../.claude/docs/retry.md) for the full API. Chains that need per-item error control resolve an error posture through their option mapper (e.g., `strictness: withPolicy(mapStrictness, ['errorPosture'])`). `'strict'` re-throws on failure; `'resilient'` pushes `undefined` and continues. `parallelBatch` also supports `errorPosture` directly.

## Chain-Specific Schema Patterns

For schema design fundamentals, see [JSON Schema Guidelines](../../.claude/guidelines/json-schemas.md). Chains commonly need bulk processing schemas that handle arrays of results:

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
 * @param {string|object} [instructions] - Instruction string or bundle
 * @param {Object} [config] - Configuration (passed to nameStep)
 * @returns {Promise<Array>} Processed results
 */
export default async function chainName(items, instructions, config = {}) {
  // Implementation
}

// Known instruction keys — introspectable by callers and tooling
chainName.knownTexts = ['spec'];
```

## Adding a New Chain

1. Add the export to `src/shared.js`
2. Add a line to the root `README.md` and `src/chains/README.md`
3. Follow the module structure above (`index.js`, `index.spec.js`, `index.examples.js`, `README.md`)

## Testing Patterns

**Unit tests** (`index.spec.js`): mock LLM calls; cover option mapper behavior (structural contracts, not exact values), config forwarding to callLlm and retry, failure handling, and progress callbacks.

**Integration tests** (`index.examples.js`): real LLM calls; validate end-to-end workflows with realistic data. See [example test conventions](../../.claude/guidelines/example-tests.md) for budget tiers and skip tagging.

## Documentation

README structure and quality standards are in [documentation.md](../../.claude/guidelines/documentation.md). Key chain-specific points: avoid generic feature lists (bulk processing, retries), show the dial options the chain accepts, include realistic examples that demonstrate AI capabilities.

## Anti-Patterns

- Destructuring config params and re-passing them individually — pass config directly (see [option resolution](../../.claude/docs/option-resolution.md))
- Resolving retry or llm params in chains — retry and callLlm resolve them from config (see [retry](../../.claude/docs/retry.md))
- Using `initChain`, `startChain`, or `buildInstructions` — replaced by `nameStep` + `getOptions` + `resolveTexts`
- Assembling prompts with template literals and `${contextBlock}` suffixes — use `parts.filter(Boolean).join('\n\n')`
- Using `.replace()` on prompt constants with `{placeholder}` markers — use parts composition
- Threading context on config — instruction is positional; config-based context leaks to sub-chains
- Hard-coded processing strategies without dial options
- Missing `DomainEvent.input`/`output` emissions
- Missing `knownTexts` static property
