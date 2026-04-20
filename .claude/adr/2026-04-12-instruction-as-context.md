# Instruction-as-Context: Structured Prompt Composition

Every chain and verblet now accepts instructions as a string or an object with named context. A universal normalization layer (`resolveTexts`) extracts known keys, renders unknown keys as XML context, and produces the text the chain uses for its core prompt. Prompt assembly uses a consistent `parts.filter(Boolean).join('\n\n')` composition pattern. Derived artifacts flow through progress events and can be captured for pipeline reuse via `collectEventsWith`.

## Context

Chains built prompts from a single instruction string plus hardcoded `asXML` assembly. In pipelines, intermediate knowledge (specs, categories, anchors, query expansions) was generated, used once, and discarded at step boundaries. A caller with context from a prior step had no structured way to thread it into the next chain.

Putting context on `config` creates a propagation problem: chains spread `...runConfig` to sub-chains, so config-based context leaks across boundaries. Instruction-based context avoids this — instruction is positional (arg 1 or 2), not on config. When a chain calls a sub-chain, it constructs a new instruction for that sub-chain; the caller's context never reaches internal calls.

Separately, prompt assembly used inconsistent patterns: some chains used template literals with `${contextBlock}` suffixes, others used `.replace()` on template constants with `{placeholder}` markers, others had ad-hoc `bundleContext ? \`...\n\n${bundleContext}\` : ...` conditionals. These were functionally equivalent but varied enough to make auditing prompt structure difficult.

Finally, the `buildInstructions` factory (`src/lib/build-instructions/`) generated 5 instruction builders for spec+apply chains. It added indirection without proportional value — every chain that used it was a unique snowflake anyway, and the factory's rigid structure meant chains frequently worked around it.

## Decisions

| Decision | Reason | Rejected Alternative |
|---|---|---|
| Instruction normalization via `resolveTexts(instruction, knownKeys)` | One function handles string passthrough, object destructuring, template builder resolution, and unknown-key XML rendering. Chains call it once at the top, get `{ text, known, context }`. Known keys override internal derivation (e.g. supplying `spec` skips the spec generation LLM call). Unknown keys become `<tag>value</tag>` XML prepended to the prompt. | Config-based context threading (leaks through `...runConfig` spread to sub-chains), separate `context` parameter (third positional arg is awkward), middleware/decorator pattern (over-engineering for what is destructuring + XML wrapping) |
| `resolveArgs(instructions, config, knownKeys)` for optional instruction params | When a chain's signature is `fn(input, instructions?, config?)`, callers had to pass `undefined` to skip instructions. `resolveArgs` detects when an object without `text` was passed as instructions and shifts it to config. Chains call it before `resolveTexts`. | Requiring instructions to always be provided (breaks backward compatibility for chains where instructions were historically optional), config-only context (the propagation problem above) |
| `parts.filter(Boolean).join('\n\n')` as the universal prompt assembly pattern | Replaces template literals, `.replace()` with placeholder constants, and ad-hoc `bundleContext` conditionals. Optional parts (context, known-key overrides, conditional sections) are naturally handled — falsy values are filtered out. Every chain now assembles prompts the same way. | Keeping varied assembly patterns (inconsistent, hard to audit), a prompt builder class (over-engineering for array filtering and joining) |
| `knownTexts` static property on every chain/verblet | Lists the instruction keys the function recognizes internally. Enables introspection — callers can check what a chain accepts, tooling can validate bundles, and the property documents the contract. Value is `[]` for chains with no known keys. | No introspection (callers must read source to know what keys a chain accepts), a central registry (couples all chains to a shared module) |
| Remove `buildInstructions` factory | Every chain using it was unique — the factory's 5 builders imposed structure without reducing complexity. Direct `resolveTexts` in each chain is simpler, more readable, and eliminates a layer of indirection. Each chain's prompt assembly is now visible in one place. | Extending the factory to handle context (adds more complexity to an already complex abstraction), keeping it alongside resolveTexts (two ways to do the same thing) |
| `ContextBudget` for XML context assembly | Lightweight class that collects named entries, XML-wraps each, and joins with double newlines. `SummaryMap.build()` delegates to it for final assembly after its own heavyweight summarization pass. | Extending `asXML` with budget awareness (conflates formatting with resource management), putting assembly logic in SummaryMap only (ContextBudget is useful independently for chains that assemble context from multiple sources) |
| `collectEventsWith` for pipeline artifact capture | Wraps a chain call with a progress callback that captures named fields from domain events. Returns `[result, captured]` tuple — lifecycle tied to the wrapped function. Enables pipeline patterns where one chain's derived artifacts feed the next chain's instruction bundle. | Returning artifacts from the chain function (changes return types, breaks existing consumers), property-on-function pattern (`.captured` on a callback is surprising; promise can hang if chain errors) |
| Null rejection at instruction boundary | `resolveArgs` and `normalizeInstruction` throw on `null`. The project disallows null — silently converting it to undefined hides caller bugs. | `== null` check (treats null same as undefined, masking errors), no check (null crashes downstream with confusing error) |
| `DomainEvent.input` / `DomainEvent.output` on all chains and verblets | Every chain and verblet now emits its primary input after `emitter.start()` and its primary output before `emitter.complete()`. Enables observability (what went in, what came out) and artifact capture via `collectEventsWith`. | Emitting only on failure (loses the observability benefit), optional emission (inconsistent — consumers can't rely on the events being present) |

## Instruction bundle anatomy

```javascript
// String — unchanged behavior
await map(items, 'Summarize each item');

// Object — text plus named context
await map(items, {
  text: 'Summarize each item',
  domain: 'SEC 10-K annual filings',
  audience: 'Non-technical board members',
});

// Known key — overrides internal derivation
await score(items, { text: 'Rate quality 1-10', spec: priorSpec });
```

Inside the chain:

```javascript
const { text, known, context } = resolveTexts(instructions, ['spec']);
const spec = known.spec ?? (await generateSpec(text, runConfig));

const parts = [
  context,                                        // unknown keys as XML
  'Rate each item in the list...',
  asXML(text, { tag: 'scoring-criteria' }),
  asXML(spec, { tag: 'specification' }),
];
const prompt = parts.filter(Boolean).join('\n\n');
```

## Pipeline capture pattern

```javascript
import collectEventsWith from './lib/collect-events-with/index.js';

// Step 1: capture derived spec
const [entities, { specification }] = await collectEventsWith(
  (onProgress) => extractEntities(doc, 'Extract organizations', { onProgress }),
  'specification',
);

// Step 2: reuse spec — skips spec generation LLM call
const e2 = await extractEntities(doc2, { text: 'Extract organizations', spec: specification });
```

## Known keys by chain

Domain chains recognize instruction keys that override internal derivation:

| Chain | Known keys | Effect of supplying |
|-------|-----------|---------------------|
| entities | `spec` | Skips `entitySpec()` |
| tags | `spec`, `vocabulary` | Skips `tagSpec()`, overrides vocabulary |
| score | `spec`, `anchors` | Skips `scoreSpec()`, skips first-batch anchoring |
| scale | `spec` | Skips `scaleSpec()` |
| relations | `spec` | Skips `relationSpec()` |
| calibrate | `spec` | Skips `calibrateSpec()` |
| group | `categories` | Skips Phase 1 category discovery |
| filter | `guidance` | Overrides strictness mapper output |
| document-shrink | `expansions` | Skips query expansion step |
| timeline | `knowledge` | Skips knowledge base reduce |
| glossary | `terms` | Overrides term collection step |
| map, reduce, sort, join, find, list, truncate | _(none)_ | All keys become XML context |

All chains export `chainFn.knownTexts` listing their recognized keys.

## Files changed

**New:**
- `src/lib/instruction/index.js` — `resolveArgs`, `normalizeInstruction`, `resolveTexts`
- `src/lib/context-budget/index.js` — `ContextBudget` class (collect + XML-wrap + join)
- `src/lib/collect-events-with/index.js` — `collectEventsWith(fn, ...fields)` wrapping pattern
- `src/lib/template-builder/index.js` — `templateBuilder`, `slot()` for parameterized prompts

**Removed:**
- `src/lib/build-instructions/` — 3 files (index, spec, shared)

**Modified:**
- All chains and verblets — `resolveTexts`/`resolveArgs` for instruction normalization, parts composition for prompt assembly, `DomainEvent.input`/`output` emissions, `knownTexts` static property

## Consequences

- Every chain's prompt structure is visible in one place — no indirection through factories
- Unknown instruction keys automatically become XML context with no chain-side code
- Known keys let pipelines skip expensive derivation steps (spec generation, anchor establishment, category discovery)
- `collectEventsWith` enables capture-and-reuse without changing chain return types
- Context never propagates to sub-chains — instruction is positional, not config
- Backward compatible — string instructions work identically to before
