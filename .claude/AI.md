# Verblets Project AI Guide

## Core Design

Chains and verblets are abstract by design — accuracy depends on the user providing domain context with their query. The library provides the transformation mechanism; users supply the expertise.

## Implementation Guidelines

### Instructions
- Every chain/verblet normalizes instructions through `resolveTexts(instruction, knownKeys)` from `src/lib/instruction/index.js`
- Instructions are strings or objects: `{ text, ...namedContext }`. Unknown keys become XML context; known keys override internal derivation.
- When instructions are optional, use `resolveArgs(instructions, config, knownKeys)` to disambiguate positional arguments
- Every function exports a `knownTexts` static property listing recognized keys

### Prompts
- Assemble prompts with `parts.filter(Boolean).join('\n\n')` — not template literals, `.replace()`, or ad-hoc conditionals
- Reuse shared prompts from `src/prompts/index.js` for consistency
- Extract `response_format` schemas to separate files (`schema.js` or `schemas.js`)
- Schema keys are part of the prompt interface — use descriptive names to guide output
- System prompts define the LLM's role; user prompts supply runtime content
- Be mindful of input size variability; adapt prompt construction to model context limits

### Progress Events
- Every chain/verblet emits `DomainEvent.input` after `emitter.start()` and `DomainEvent.output` before `emitter.complete()`
- Domain chains emit derived artifacts (specifications, anchors, categories) on existing domain events
- `collectEventsWith(fn, ...fields)` wraps a chain call and captures named fields from progress events

### Model Selection
- Use capability-based selection (`{ fast: true, good: 'prefer' }`) over hardcoded model names
- Reserve larger models for complex reasoning; use cheaper models for simple transformations

## Module Analysis Guidance

When analyzing modules, focus on:

- Isomorphic compatibility (browser + Node.js)
- Prompt quality — well-structured, predictable prompts
- Composability — clean interfaces that work with other modules
- Resource management — cleanup of connections, timeouts, listeners
- Schema extraction — `response_format` schemas in separate files
- Integration contracts — whether assumptions between modules hold

### Non-Concerns

These are intentional design choices — do not flag them:

- **Missing domain knowledge in prompts** — this comes from user input, not the library
- **Input ambiguity** — assume input is well-defined per Design by Contract. Flag ambiguity in the library's own prompts only if it matters.
- **Smaller model usage** — intentional when the task is simple. Only flag if weaker reasoning appears to be a design flaw.
- **Transformation reliability with `response_format`** — the schema ensures consistent output structure
- **Missing orchestration in verblets** — fallbacks, retries, and chaining belong in chains

### Skip Linter Territory
Focus on architectural and design concerns. Linters handle unused variables, formatting, import order, and naming conventions.

## Recommendations

### Never Suggest
- Model training or fine-tuning
- Vague improvements ("add more tests", "improve error handling")
- Architectural changes that contradict the project philosophy

### Test Recommendations
Be specific: name exact missing test cases, identify untested boundaries with line numbers, point to uncovered branches.

### Priority Areas
- Resource leaks — unclosed connections, uncleared timeouts
- Missing JSON schemas — LLM calls without `response_format`
- Schema mismatches — discrepancies between expected and actual response formats
- Mock realism — test mocks that don't reflect actual LLM response patterns
- Error propagation — swallowed errors that should bubble to orchestrators
