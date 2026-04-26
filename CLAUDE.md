# CLAUDE.md

> Think carefully and implement the most concise solution that changes as little code as possible.

## Project: Verblets AI Library

AI-powered functions that accept natural language instructions to transform and process data.

### Documentation

#### Specs

- **[spec/spec-conventions.md](spec/spec-conventions.md)** — How to write specs: two-layer split (timeless/impl), length and file organization, specification techniques (constraints, decision criteria, shape declarations, corrective notes), why not examples, generic spec kinds.
- **[spec/spec-conventions.lib.md](spec/spec-conventions.lib.md)** — This library's spec families: LLM integration, chains/verblets, embedding, progress/events, instruction/prompt, automation. System-wide corrective notes, coverage gaps.
- **[spec/automation.md](spec/automation.md)** / **[.impl.md](spec/automation.impl.md)** — Automation execution model: RunContext shape, ctx.lib split, storage domains and API, observability, run history, composition, termination.
- **[spec/discovery-philosophy.md](spec/discovery-philosophy.md)** — How hypothesis discovery works: start from human needs, arrive at operations. Three horizons (present needs, emerging possibilities, deep analogues), angle/topic quality criteria, anti-patterns.

#### Docs

- **[docs/configuration.md](docs/configuration.md)** — Consumer-facing: init, model selection (string/capability/explicit), model parameters, batch/retry config, chain-specific dials, policy, structured output.
- **[docs/option-resolution.md](docs/option-resolution.md)** — Author-facing: nameStep, createProgressEmitter, getOptions, getOption, withPolicy, mappers, override keys, resolution order.
- **[docs/batching.md](docs/batching.md)** — Auto-sizing via createBatches, parallelBatch concurrency, error postures (strict/resilient), batch object shape.
- **[docs/retry.md](docs/retry.md)** — Config-aware retry: retryable error detection (429/5xx), linear delay scaling, abort signal, progress events.
- **[docs/progress-tracking.md](docs/progress-tracking.md)** — Event taxonomy (event/operation/telemetry/logging), createProgressEmitter lifecycle, batch progress, phase scoping, domain events, event shape.

#### Reference

- **[reference/configuration-philosophy.md](reference/configuration-philosophy.md)** — General essays: code/deploy/runtime config trade-offs, context attributes as policy vocabulary, permanent flags as strategic options.
- **[reference/dynamic-configuration.md](reference/dynamic-configuration.md)** — Long-form guide: AI-powered configuration with policy functions, OpenFeature, classify policies, decision tracing, valueArbitrate, feedback loops.

#### ADRs

- **[adr/2026-03-18-option-value-vocabulary.md](adr/2026-03-18-option-value-vocabulary.md)** — Unified low/high vocabulary, pure mapper functions, fused resolve+map, three mapper shapes.
- **[adr/2026-03-19-resolve-all-and-eval-context.md](adr/2026-03-19-resolve-all-and-eval-context.md)** — Batch resolution via getOptions, withPolicy marker, override key flattening.
- **[adr/2026-03-30-event-vocabulary-normalization.md](adr/2026-03-30-event-vocabulary-normalization.md)** — Normalized naming across 54 chains: segmentation nouns, pipeline stages, outcomes.
- **[adr/2026-04-12-instruction-as-context.md](adr/2026-04-12-instruction-as-context.md)** — resolveTexts normalization, unknown keys as XML context, known keys table, collectEventsWith.

#### Guidelines

- **[guidelines/](guidelines/)** — Standards enforced by architecture tests: [code quality](guidelines/code-quality.md), [prompts](guidelines/prompts.md), [JSON schemas](guidelines/json-schemas.md), [unit tests](guidelines/unit-tests.md), [example tests](guidelines/example-tests.md), [architecture tests](guidelines/architecture-tests.md), [documentation](guidelines/documentation.md).

#### Design

- **[src/chains/DESIGN.md](src/chains/DESIGN.md)** — Chain implementation patterns.
- **[src/verblets/DESIGN.md](src/verblets/DESIGN.md)** — Verblet implementation patterns.

### Project-Specific Rules
- **Never use null** - Convert to undefined at boundaries (JSON, Redis, LLM responses)
- **Use responseFormat with JSON schemas** - The llm module auto-unwraps `value` and `items`
- **JSON imports require `with { type: 'json' }`** - e.g. `import schema from './foo.json' with { type: 'json' };`. Required by Node 25+. Vite/vitest handle it via transform so tests pass without it, but direct node execution breaks. Enforced by ESLint `local/require-json-import-type` rule.
- **Example tests MUST use vitest core function wrappers** - For AI analysis of test output
- **One compelling example per README** - Show unique AI capabilities with real-world scenarios

### Code Style Preferences
- **Avoid early returns** - Less nesting, clearer flow
- **Define named variables** - Make transformations explicit
- **Extract pure functions** - Even from classes when possible
- **Prefer named pure functions over inline idioms** - Well-named, often curried utility functions (in `src/lib/pure/index.js`) are more readable than dense inline native JS. When replacing a library function, create a named internal equivalent rather than inlining. Favor functional composition and non-mutating patterns (e.g. `toSorted()` over `[...arr].sort()`)
- **Composable interfaces** - Design for composition
- **Use lib/ for reusable modules** - Break out generally useful code
- **Boy Scout Principle** - Always leave code cleaner than you found it
- **Extract magic numbers** - To constants file (global), module constants, or file-level
- **Config hierarchy** - Environment variables → startup parsing → config values

## Important Context for Analysis

When analyzing modules in this project, remember:
1. **LLM dependency is not a concern** - It's the fundamental design of verblets
2. **Error handling philosophy** - Verblets should crash in ways that orchestrators can recover from or retry
3. **Single LLM call rule** - Verblets should use exactly one LLM call without async forks
4. **No retry logic in verblets** - This belongs in chains, not individual functions
5. **Chains are orchestrators** - They handle retries, error recovery, and complex workflows
6. **Isomorphic design** - All modules should work in both browser and Node.js environments
7. **Environment adaptation** - Modules that can't be isomorphic should be disabled from bundling/install or adapt to their host environment

## Philosophy

### Error Handling
- **Fail fast** for critical configuration (missing text model)
- **Log and continue** for optional features (extraction model)
- **Graceful degradation** when external services unavailable
- **User-friendly messages** through resilience layer
- **Recoverable crashes** - Verblets should fail in ways orchestrators can handle

### Isomorphic Requirements
- All modules must work in browser and Node.js
- Use environment detection to adapt behavior when needed
- Disable non-portable modules from bundling when necessary
- Prefer universal APIs over platform-specific ones

## Tone and Behavior
- Criticism is welcome. Please tell me when I am wrong or mistaken, or even when you think I might be wrong or mistaken
- Please tell me if there is a better approach than the one I am taking
- Please tell me if there is a relevant standard or convention that I appear to be unaware of
- Be skeptical
- Be concise
- Short summaries are OK, but don't give an extended breakdown unless we are working through the details of a plan
- Do not flatter, and do not give compliments unless I am specifically asking for your judgement
- Occasional pleasantries are fine
- Feel free to ask many questions. If you are in doubt of my intent, don't guess. Ask

## ABSOLUTE RULES:
- NO PARTIAL IMPLEMENTATION
- NO SIMPLIFICATION : no "//This is simplified stuff for now, complete implementation would blablabla"
- NO CODE DUPLICATION : check existing codebase to reuse functions and constants. Read files before writing new functions. Use common sense function name to find them easily
- NO DEAD CODE : either use or delete from codebase completely
- NO CHEATER TESTS : test must be accurate, reflect real usage and be designed to reveal flaws. No useless tests! Design tests to be verbose so we can use them for debugging
- NO INCONSISTENT NAMING - read existing codebase naming patterns
- NO OVER-ENGINEERING - Don't add unnecessary abstractions, factory patterns, or middleware when simple functions would work. Don't think "enterprise" when you need "working"
- NO MIXED CONCERNS - Don't put validation logic inside API handlers, database queries inside UI components, etc. instead of proper separation
- NO RESOURCE LEAKS - Don't forget to close database connections, clear timeouts, remove event listeners, or clean up file handles