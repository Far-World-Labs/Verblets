# Maturity Audit Scorecards
> Generated 2026-02-21
> 50 chains audited, 719 dimension evaluations

## Tier 1 — Design Fitness

| Chain | Tier | architectural-fitness | composition-fit | design-efficiency | generalizability | strategic-value | Avg |
|-------|------|---|---|---|---|---|-----|
| ai-arch-expect | development | 2 | 1 | 1 | 3 | 4 | 2.2 |
| anonymize | standard | 2 | 2 | 2 | 4 | 3 | 2.6 |
| category-samples | standard | 3 | 2 | 3 | 4 | 3 | 3.0 |
| central-tendency | standard | 4 | 4 | 4 | 4 | 3 | 3.8 |
| collect-terms | standard | 3 | 2 | 4 | 4 | 2 | 3.0 |
| conversation | standard | 3 | 1 | 3 | 4 | 3 | 2.8 |
| conversation-turn-reduce | internal | 3 | 2 | 3 | 3 | 2 | 2.6 |
| date | standard | 3 | 2 | 3 | 4 | 3 | 3.0 |
| detect-patterns | standard | 3 | 2 | 3 | 4 | 3 | 3.0 |
| detect-threshold | standard | 3 | 3 | 2 | 4 | 3 | 3.0 |
| disambiguate | standard | 3 | 2 | 3 | 4 | 2 | 2.8 |
| dismantle | standard | 2 | 1 | 2 | 4 | 3 | 2.4 |
| document-shrink | standard | 1 | 1 | 1 | 3 | 3 | 1.8 |
| entities | core | 3 | 4 | 3 | 3 | 3 | 3.2 |
| expect | standard | 2 | 2 | 2 | 3 | 4 | 2.6 |
| extract-blocks | standard | 2 | 1 | 2 | 4 | 3 | 2.4 |
| extract-features | standard | 4 | 3 | 4 | 4 | 3 | 3.6 |
| filter | core | 3 | 2 | 3 | 3 | 3 | 2.8 |
| filter-ambiguous | standard | 3 | 3 | 3 | 3 | 2 | 2.8 |
| find | standard | 3 | 2 | 3 | 4 | 3 | 3.0 |
| glossary | standard | 3 | 2 | 3 | 4 | 2 | 2.8 |
| group | core | 3 | 2 | 3 | 4 | 3 | 3.0 |
| intersections | standard | 3 | 2 | 3 | 4 | 3 | 3.0 |
| join | standard | 3 | 2 | 3 | 4 | 3 | 3.0 |
| list | standard | 3 | 2 | 3 | 4 | 3 | 3.0 |
| llm-logger | standard | 2 | 1 | 1 | 3 | 3 | 2.0 |
| map | core | 2 | 1 | 2 | 3 | 3 | 2.2 |
| people | standard | 4 | 1 | 4 | 4 | 2 | 3.0 |
| pop-reference | standard | 3 | 1 | 3 | 3 | 1 | 2.2 |
| questions | standard | 3 | 2 | 3 | 4 | 3 | 3.0 |
| reduce | core | 3 | 2 | 4 | 4 | 3 | 3.2 |
| relations | standard | 2 | 4 | 2 | 3 | 3 | 2.8 |
| scale | standard | 3 | 4 | 3 | 4 | 3 | 3.4 |
| scan-js | development | 3 | 1 | 3 | 2 | 2 | 2.2 |
| score | core | 4 | 3 | 2 | 3 | 3 | 3.0 |
| set-interval | standard | 3 | 1 | 3 | 4 | 3 | 2.8 |
| socratic | standard | 3 | 1 | 3 | — | 3 | 2.5 |
| sort | core | 3 | 2 | 3 | — | 3 | 2.8 |
| split | standard | 3 | 2 | 3 | 4 | 3 | 3.0 |
| summary-map | standard | 3 | 2 | 3 | 4 | 3 | 3.0 |
| tag-vocabulary | standard | 2 | 2 | 2 | 4 | 3 | 2.6 |
| tags | standard | 2 | 4 | 2 | 4 | 3 | 3.0 |
| test | development | 3 | 2 | 3 | 4 | 3 | 3.0 |
| test-analysis | internal | 1 | 1 | 1 | 1 | 2 | 1.2 |
| test-analyzer | internal | 3 | 1 | 3 | 1 | 4 | 2.4 |
| themes | standard | 3 | 1 | 4 | 4 | 2 | 2.8 |
| timeline | standard | 2 | 1 | 2 | 4 | 3 | 2.4 |
| to-object | standard | 3 | 1 | 3 | 4 | 3 | 2.8 |
| truncate | standard | 3 | 2 | 3 | 4 | 2 | 2.8 |
| veiled-variants | standard | 3 | 1 | 3 | 3 | 1 | 2.2 |

### Design Alerts

These chains score below 2.0 on design fitness. NFR hardening (Tier 2) should wait until design issues are addressed.

- **document-shrink**: avg 1.8 — consider redesign before hardening
- **test-analysis**: avg 1.2 — consider redesign before hardening

## Tier 2 — Implementation Quality

| Chain | Tier | api-surface | browser-server | code-quality | composability | documentation | errors-retry | events | logging | prompt-engineering | testing | token-management | Avg |
|-------|------|---|---|---|---|---|---|---|---|---|---|---|-----|
| ai-arch-expect | development | 2 | 0 | 3 | 2 | 3 | 0 | 0 | 0 | — | 1 | 0 | 1.1 |
| anonymize | standard | 4 | 0 | 3 | 4 | 3 | 2 | 1 | 0 | — | 4 | 0 | 2.1 |
| category-samples | standard | 2 | 0 | 3 | 2 | 3 | 3 | 1 | 0 | 2 | 2 | 0 | 1.6 |
| central-tendency | standard | 1 | — | — | 2 | 3 | — | — | — | 3 | 2 | — | 2.2 |
| collect-terms | standard | 2 | 0 | — | 2 | 3 | 0 | 0 | 0 | 0 | 4 | 1 | 1.2 |
| conversation | standard | — | 0 | — | 2 | 3 | 0 | 0 | 1 | 0 | 4 | 0 | 1.1 |
| conversation-turn-reduce | internal | 1 | — | — | — | 1 | — | — | — | 0 | 2 | — | 1.0 |
| date | standard | 1 | 0 | — | 2 | 3 | 1 | 1 | 4 | 3 | 4 | 0 | 1.9 |
| detect-patterns | standard | 1 | 0 | 3 | 2 | 3 | 0 | 0 | 0 | 3 | 4 | 0 | 1.5 |
| detect-threshold | standard | 1 | 0 | 3 | 2 | 3 | 1 | 0 | 0 | 3 | 2 | 1 | 1.5 |
| disambiguate | standard | 2 | 0 | 2 | 2 | 3 | 1 | 2 | 0 | 3 | 4 | 1 | 1.8 |
| dismantle | standard | 1 | 0 | — | 2 | 3 | 1 | 1 | 0 | 4 | 4 | 1 | 1.7 |
| document-shrink | standard | 1 | 0 | — | 2 | 3 | 0 | 0 | 0 | — | 4 | 1 | 1.2 |
| entities | core | 4 | 0 | 4 | 4 | 4 | 1 | 3 | 0 | 3 | 4 | 0 | 2.5 |
| expect | standard | 2 | 2 | 3 | 2 | 3 | 0 | 0 | 0 | — | 4 | 0 | 1.6 |
| extract-blocks | standard | 2 | 0 | 3 | 2 | 3 | 1 | 3 | 3 | 3 | 2 | 1 | 2.1 |
| extract-features | standard | 2 | 0 | 3 | 2 | 3 | 0 | 0 | 4 | 0 | 2 | 0 | 1.5 |
| filter | core | 1 | 0 | 3 | 2 | 3 | 2 | 3 | 2 | 3 | 4 | 2 | 2.3 |
| filter-ambiguous | standard | 1 | 0 | — | — | 2 | 0 | 0 | 0 | 0 | 2 | 1 | 0.7 |
| find | standard | 1 | 0 | 3 | 2 | 3 | 2 | 3 | 0 | — | 4 | 2 | 2.0 |
| glossary | standard | 2 | 0 | — | — | 3 | 0 | 0 | 0 | 3 | 3 | 1 | 1.3 |
| group | core | 1 | 0 | — | 2 | 3 | 1 | 4 | 2 | 2 | 4 | 2 | 2.1 |
| intersections | standard | 1 | 0 | 3 | 2 | 3 | 1 | 1 | 0 | 3 | 2 | 0 | 1.5 |
| join | standard | 1 | 0 | 3 | — | 3 | 1 | 1 | 0 | 0 | 4 | 0 | 1.3 |
| list | standard | 2 | 0 | 3 | 2 | 4 | 1 | 1 | 0 | 3 | 4 | 0 | 1.8 |
| llm-logger | standard | 2 | 0 | 3 | 2 | 3 | 0 | 0 | 0 | — | 2 | 0 | 1.2 |
| map | core | 1 | 0 | — | 2 | 3 | 3 | 3 | 3 | 1 | 2 | 2 | 2.0 |
| people | standard | 1 | 0 | 2 | 1 | 3 | 1 | 0 | 0 | 3 | 4 | 0 | 1.4 |
| pop-reference | standard | 1 | 0 | 3 | 2 | 3 | 1 | 1 | 0 | 3 | 4 | 0 | 1.6 |
| questions | standard | — | 0 | — | 2 | 3 | 1 | 0 | 0 | 3 | 4 | 1 | 1.6 |
| reduce | core | 1 | 0 | — | 2 | 3 | 1 | 3 | 0 | 3 | 4 | 2 | 1.9 |
| relations | standard | 4 | — | — | 4 | 4 | — | — | — | — | 4 | — | 4.0 |
| scale | standard | 4 | 0 | 3 | 4 | 4 | 1 | 0 | 0 | 3 | 2 | 0 | 1.9 |
| scan-js | development | — | 0 | 3 | 2 | 3 | 1 | 0 | 0 | 3 | 2 | 0 | 1.4 |
| score | core | 3 | — | — | 3 | 4 | — | — | — | — | 2 | — | 3.0 |
| set-interval | standard | 1 | 0 | 3 | 2 | 3 | 1 | 1 | 1 | 2 | 2 | 0 | 1.5 |
| socratic | standard | 1 | 0 | — | 2 | 3 | 1 | 4 | 4 | 3 | 4 | 1 | 2.3 |
| sort | core | 2 | 1 | 2 | 2 | 3 | 1 | 2 | 1 | 3 | 4 | 1 | 2.0 |
| split | standard | 1 | 0 | 3 | 1 | 3 | 1 | 1 | 1 | 3 | 4 | 1 | 1.7 |
| summary-map | standard | 1 | 0 | 3 | 2 | 3 | 0 | 0 | 0 | 2 | 4 | 1 | 1.5 |
| tag-vocabulary | standard | 2 | — | — | — | 3 | — | — | — | 4 | 4 | — | 3.3 |
| tags | standard | 4 | — | — | 4 | 4 | — | — | — | — | 4 | — | 4.0 |
| test | development | 1 | 0 | — | — | 3 | 1 | 0 | 0 | 3 | 4 | 0 | 1.3 |
| test-analysis | internal | 1 | 0 | 3 | 2 | 0 | 0 | 1 | 3 | 0 | 2 | 0 | 1.1 |
| test-analyzer | internal | 1 | 0 | 3 | 1 | 0 | 1 | 1 | 1 | 0 | 2 | 0 | 0.9 |
| themes | standard | 1 | 0 | — | 2 | 3 | 0 | 0 | 0 | 0 | 4 | 0 | 1.0 |
| timeline | standard | 1 | — | — | 2 | 3 | — | — | — | 3 | 4 | — | 2.6 |
| to-object | standard | 1 | 0 | 3 | 2 | 2 | 1 | 1 | 1 | 3 | 4 | 0 | 1.6 |
| truncate | standard | 1 | 0 | 3 | 2 | 3 | 0 | 0 | 0 | — | 4 | 1 | 1.4 |
| veiled-variants | standard | 1 | — | — | 2 | 3 | — | — | — | 2 | 2 | — | 2.0 |

## Detail

### ai-arch-expect (development)

#### Design Fitness

**architectural-fitness** — Level 2
- Evidence: At 622 lines in a single file with multiple exports and bespoke parallel processing logic, the design is adequate but somewhat complex. It reimplements batch processing and concurrency control rather than fully leveraging existing library primitives, indicating some unnecessary complexity.
- Gap: Refactor to better leverage existing batch processing chains and decompose responsibilities to reduce complexity.
- Next: Extract batch processing and concurrency management into reusable components or compose existing chains to simplify architecture.

**composition-fit** — Level 1
- Evidence: The chain uses other chains internally (reduce) but reimplements batch processing and parallel orchestration logic itself. It is a black box with multiple exports but does not fully embody the library's spec/apply and instruction builder composition patterns.
- Gap: Redesign to expose a cleaner composable interface and leverage existing primitives for batch processing and scoring.
- Next: Refactor to implement spec/apply pattern and use instruction builders to integrate with core collection chains.

**design-efficiency** — Level 1
- Evidence: 622 lines for a single module with multiple exports and bespoke concurrency and batch management indicates significant strain. The code includes many helper functions and reimplements functionality available elsewhere, suggesting the design is fighting the implementation.
- Gap: Simplify design to reduce LOC and helper functions by leveraging existing library capabilities and clearer abstractions.
- Next: Refactor to reduce code duplication and complexity by composing existing chains and minimizing bespoke orchestration code.

**generalizability** — Level 3
- Evidence: The chain uses natural language instructions and works with file, JSON, and data contexts, showing clean abstraction boundaries. It does not appear locked to a specific runtime or framework and accepts configurable concurrency and bulk sizes, supporting cross-domain applicability.
- Gap: Further decouple from file system specifics to increase adaptability to other data sources.
- Next: Abstract file system dependencies to allow use with arbitrary data sources or in browser environments.

**strategic-value** — Level 4
- Evidence: The chain ai-arch-expect is a 622 LOC module providing AI-powered architectural testing and validation, enabling novel workflows such as dynamic test titles, coverage assertions, and configurable parallel processing. It unlocks new feedback loops for AI-driven architecture analysis, a transformative capability in AI pipelines.
- Next: Promote usage and integration in AI development workflows to maximize impact.


#### Implementation Quality

**api-surface** — Level 2
- Evidence: Exports eachFile, eachDir, fileContext, jsonContext, dataContext, listDir, countItems, aiArchExpect with documented usage in README
- Gap: No instruction builders or spec/apply split exports
- Next: Implement instruction builders and spec/apply split exports to enhance API composability

**browser-server** — Level 0
- Evidence: Uses 'node:fs' and 'node:path' imports directly, no use of 'lib/env'
- Gap: Refactor to use 'lib/env' for environment detection and support browser environment
- Next: Replace direct 'node:' imports with environment-abstracted imports from 'lib/env'

**code-quality** — Level 3
- Evidence: Clear separation of concerns with pure functions like createBatches, processBatchResults; consistent naming; no dead code
- Gap: Further modularization and composability to reach reference-quality
- Next: Extract more composable internals and document transformations explicitly

**composability** — Level 2
- Evidence: Exports multiple context builders (fileContext, jsonContext, dataContext) and uses internal chain composition (eachFile, eachDir) but no spec/apply split
- Gap: Lacks spec/apply function split and factory functions
- Next: Introduce spec/apply split functions and factory functions to improve composability

**documentation** — Level 3
- Evidence: README has sections: Key Features, Usage with code examples, Configuration Options, Context Functions, Chunk Processing Metadata
- Gap: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- Next: Add detailed architecture overview, edge case handling, performance considerations, and composition guidance to README

**errors-retry** — Level 0
- Evidence: No import or usage of 'lib/retry'; error handling is basic try/catch without retry logic
- Gap: Add retry logic with 'lib/retry' and define failure modes
- Next: Incorporate 'lib/retry' with conditional retry policies and structured error handling

**events** — Level 0
- Evidence: No import of 'lib/progress-callback' or usage of event emission functions
- Gap: Implement event emission using 'lib/progress-callback' with standard events
- Next: Add 'onProgress' callback support and emit start, complete, and step events via 'lib/progress-callback'

**logging** — Level 0
- Evidence: No import of 'lib/lifecycle-logger' or usage of createLifecycleLogger or logger calls
- Gap: Add lifecycle logging using 'lib/lifecycle-logger' with logStart and logResult
- Next: Import 'lib/lifecycle-logger' and instrument key functions with createLifecycleLogger and logStart/logResult calls

**testing** — Level 1
- Evidence: Has index.examples.js with example tests but no spec tests or aiExpect usage
- Gap: Missing unit tests and aiExpect coverage
- Next: Add unit tests and integrate aiExpect for semantic validation

**token-management** — Level 0
- Evidence: No use of 'lib/text-batch' or token-budget-aware batching; batching is by item count only
- Gap: Implement token-budget-aware batching using 'createBatches' from 'lib/text-batch'
- Next: Integrate token budget calculations and auto-skip for oversized items in batching logic


### anonymize (standard)

#### Design Fitness

**architectural-fitness** — Level 2
- Evidence: At 410 lines in a single module with no use of other chains, the implementation is somewhat complex and may include bespoke infrastructure rather than building on existing primitives. The design could be simplified or decomposed.
- Gap: Refactor to leverage existing batch processing chains (map, filter, reduce) and reduce bespoke coordination logic.
- Next: Decompose the chain into smaller composable parts using library primitives.

**composition-fit** — Level 2
- Evidence: Exports spec/apply pattern and instruction builders, but does not use other library chains internally and appears as a monolith. Could be expressed as a composition of existing primitives for better fit.
- Gap: Refactor to build on core batch processing chains and enable internal composition.
- Next: Rewrite internal logic to use map, filter, reduce chains rather than bespoke batch processing.

**design-efficiency** — Level 2
- Evidence: 410 lines for a single module with multiple exports and no internal use of other chains suggests moderate complexity. The code may include helper functions and some duplicated logic, indicating room for efficiency improvements.
- Gap: Reduce code size by decomposing responsibilities and reusing existing library functions.
- Next: Identify and extract reusable components to simplify the main abstraction and reduce LOC.

**generalizability** — Level 4
- Evidence: The chain accepts natural language instructions and works with any text input, with no hard dependencies on specific frameworks or data formats. It is isomorphic and adaptable to new use cases without modification.
- Next: Maintain abstraction boundaries to preserve full generalizability.

**strategic-value** — Level 3
- Evidence: The anonymize chain is a core capability frequently needed in AI pipelines for privacy and data protection, enabling workflows that remove personal style and references from text. It supports multiple anonymization methods and integrates with LLMs, making it broadly useful.
- Next: Promote usage in more AI pipelines to leverage its core capability.


#### Implementation Quality

**api-surface** — Level 4
- Evidence: Exports anonymizeMethod, anonymizeSpec, mapInstructions, filterInstructions, reduceInstructions, findInstructions, groupInstructions, applyAnonymization, createAnonymizer, anonymize; no default export

**browser-server** — Level 0
- Evidence: No usage of 'lib/env' or runtime environment detection; no browser/server environment handling.
- Gap: Use 'lib/env' for environment detection to support both browser and server.
- Next: Refactor environment-dependent code to use 'lib/env' and add graceful degradation for browser/server.

**code-quality** — Level 3
- Evidence: Clear separation of concerns with extracted validators (validateInput), stage prompt builders, and core anonymize function; no dead code; consistent naming.
- Gap: Further modularize and document transformations for reference-quality example.
- Next: Extract more pure functions and add detailed documentation for each processing stage.

**composability** — Level 4
- Evidence: Exports anonymizeSpec() and applyAnonymization() split; exports createAnonymizer factory; exports multiple instruction builders: mapInstructions, filterInstructions, reduceInstructions, findInstructions, groupInstructions

**documentation** — Level 3
- Evidence: README has API usage example with import statement and method descriptions for STRICT, BALANCED, LIGHT; README includes usage example with anonymizeMethod and method parameter; README describes chain purpose and supported methods
- Gap: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- Next: Add detailed architecture section, edge cases, performance notes, and composition guidance to README

**errors-retry** — Level 2
- Evidence: Uses 'lib/retry' for retry logic; has input validation via validateInput throwing errors; uses default retry policy.
- Gap: Add multi-level retry with conditional retry policies and attach error context to results.
- Next: Enhance retry logic with conditional retry and enrich error information for better observability.

**events** — Level 1
- Evidence: Imports include 'onProgress' config param; passes onProgress to inner retry calls but does not emit events directly.
- Gap: Emit standardized lifecycle events (start, complete, step) using 'lib/progress-callback'.
- Next: Implement event emission calls such as emitStart, emitComplete around main processing steps.

**logging** — Level 0
- Evidence: Imports do not include 'lib/lifecycle-logger'; no usage of createLifecycleLogger or logger.info() found.
- Gap: Add lifecycle logging using 'lib/lifecycle-logger' with logStart and logResult.
- Next: Import 'lib/lifecycle-logger' and implement createLifecycleLogger with logStart/logResult calls in core functions.

**testing** — Level 4
- Evidence: Has index.spec.js with unit tests and index.examples.js using aiExpect

**token-management** — Level 0
- Evidence: No usage of 'lib/text-batch' or createBatches; no token budget or chunking logic present.
- Gap: Implement token-budget-aware batching using 'createBatches' for large inputs.
- Next: Integrate 'createBatches' to split input text respecting token budgets before processing.


### category-samples (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: At 142 LOC, the module is concise and focused; uses existing list chain for core generation; clear separation of prompt building and retry logic; no unnecessary abstractions.
- Gap: Minor simplifications possible in retry logic to reduce complexity.
- Next: Refactor retry mechanism to leverage shared retry utilities if available.

**composition-fit** — Level 2
- Evidence: Builds on the list chain for sample generation but does not expose spec/apply pattern or instruction builders for batch chains; acts as a pipeline step but limited composability.
- Gap: Expose spec/apply interfaces and instruction builders to enable composition with other chains.
- Next: Refactor to provide instruction builders and spec/apply exports for integration with map, filter, and reduce chains.

**design-efficiency** — Level 3
- Evidence: Implementation is clean and proportional to problem complexity; limited helper functions; no duplicated logic; configuration parameters are reasonable.
- Gap: Could reduce configuration complexity by consolidating related options.
- Next: Simplify configuration interface by grouping related parameters and documenting defaults clearly.

**generalizability** — Level 4
- Evidence: Accepts natural language instructions and category names; no hard dependencies on specific runtimes or data formats; uses generic LLM models; isomorphic design.

**strategic-value** — Level 3
- Evidence: Enables generation of representative samples across categories using AI, supporting educational content and marketing workflows; useful in AI pipelines for content creation; frequently needed by developers.
- Gap: Could increase frequency of use by expanding integration with other chains for broader workflows.
- Next: Develop additional instruction builders to integrate category-samples with other batch processing chains.


#### Implementation Quality

**api-surface** — Level 2
- Evidence: Exports SAMPLE_GENERATION_PROMPT, buildSeedGenerationPrompt, categorySamples (default export), accepts config params context, count, diversityLevel, llm, maxAttempts, retryDelay, onProgress, now
- Gap: No instruction builders or spec/apply split
- Next: Implement instruction builders and spec/apply function split to enhance API composability

**browser-server** — Level 0
- Evidence: No usage of lib/env or runtime environment detection; no isomorphic environment handling
- Gap: Use lib/env for environment detection to support both browser and server
- Next: Refactor environment reads to use lib/env and add tests for browser/server compatibility

**code-quality** — Level 3
- Evidence: Clear function separation (buildSeedGenerationPrompt, categorySamples), descriptive naming, no dead code, consistent style
- Gap: Further modularization and composability to reach reference-quality
- Next: Extract more pure functions and improve composability for easier testing and maintenance

**composability** — Level 2
- Evidence: No spec/apply split, no instruction builders, no factory functions; max level capped at 2 per deterministic ceiling
- Gap: Missing spec/apply split and instruction builders for higher composability
- Next: Refactor to export spec/apply functions and instruction builders to improve composability

**documentation** — Level 3
- Evidence: README has API section with parameter table for categorySamples(categories, context, config), multiple usage examples including Educational Content Creation and Marketing Campaign Ideas, behavioral notes on diversity and context
- Gap: Lacks comprehensive architecture section, edge cases, performance notes, and composition guidance
- Next: Add architecture overview, edge case handling, performance considerations, and guidance on composing with other chains in README

**errors-retry** — Level 3
- Evidence: Imports 'lib/retry', uses retry() with custom retryCondition callback to retry on specific error messages
- Gap: Add custom error types, structured error context, and attach logs for richer error handling
- Next: Define custom error classes and enhance retry logic with error context and logging

**events** — Level 1
- Evidence: Imports 'onProgress' in config and passes it through to inner calls (list, retry) but does not emit own events
- Gap: Emit standard lifecycle events (start, complete, step) using lib/progress-callback
- Next: Integrate event emission calls like emitStart, emitComplete around main processing steps

**logging** — Level 0
- Evidence: No import of 'lib/lifecycle-logger' or usage of createLifecycleLogger or logger methods
- Gap: Add lifecycle logging with createLifecycleLogger and logStart/logResult calls
- Next: Import 'lib/lifecycle-logger' and instrument key functions with createLifecycleLogger and logStart/logResult

**prompt-engineering** — Level 2
- Evidence: Uses extracted prompt builder function 'buildSeedGenerationPrompt' to construct the prompt from a template literal 'SAMPLE_GENERATION_PROMPT'. No use of promptConstants from constants.js is observed. No system prompt, temperature setting, or response_format usage is present. The chain uses a shared 'list' module for generation and a retry utility. Prompt is constructed via template literal replacements, not inline concatenation.
- Gap: Missing system prompt usage, temperature tuning, and response_format with JSON schemas to reach level 3.
- Next: Introduce system prompts and specify temperature and response_format with JSON schema in the prompt call to improve prompt engineering maturity.

**testing** — Level 2
- Evidence: Has index.examples.js using aiExpect, no spec tests
- Gap: Lacks unit tests covering edge cases and error paths
- Next: Add unit tests with vitest covering edge cases and error handling

**token-management** — Level 0
- Evidence: No usage of lib/text-batch or createBatches for token budget management
- Gap: Implement token-budget-aware batching using createBatches
- Next: Integrate createBatches to manage token budgets and avoid oversized inputs


### central-tendency (standard)

#### Design Fitness

**architectural-fitness** — Level 4
- Evidence: The chain is 167 LOC, uses the map chain for batch processing, and cleanly separates instruction building and processing phases. It avoids bespoke infrastructure and has proportional complexity.
- Next: Continue leveraging existing primitives and maintain clear modular design.

**composition-fit** — Level 4
- Evidence: The chain builds on the library's core map primitive, uses spec/apply pattern, and provides instruction builders, fitting fully into the library's composition philosophy.
- Next: Promote as a composition citizen and enable integration with other chains.

**design-efficiency** — Level 4
- Evidence: At 167 LOC with 2 files and minimal helpers, the implementation is clean and proportional to the problem complexity, with no evident workarounds or duplicated logic.
- Next: Maintain minimal and clear codebase to preserve design efficiency.

**generalizability** — Level 4
- Evidence: The chain uses natural language instructions and works with any text input, with no hard dependencies on specific runtimes or data formats. It is isomorphic and adaptable to new use cases.
- Next: Ensure continued abstraction from specific contexts to preserve generality.

**strategic-value** — Level 3
- Evidence: The chain is a core capability frequently needed in AI pipelines for evaluating category centrality using batch processing. It enables reliable evaluation of graded typicality across large datasets, a non-trivial and valuable AI feature.
- Next: Maintain and promote usage as a core batch processing tool for category evaluation.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default `centralTendency`, named export `centralTendencyRetry`, uses config params chunkSize (batchSize), maxAttempts, logger, onProgress, now
- Gap: No instruction builders or spec/apply split
- Next: Implement instruction builders and spec/apply function split for composability

**composability** — Level 2
- Evidence: Uses internal map chain for batch processing, but no spec/apply split or instruction builders exported
- Gap: No exported spec/apply functions or instruction builders
- Next: Export spec/apply functions and instruction builders to improve composability

**documentation** — Level 3
- Evidence: README has Overview, Basic Usage, Parameters, Return Value, Cognitive Science Applications, Integration with Other Chains sections
- Gap: Missing architecture section, edge cases, performance notes, composition guidance
- Next: Add comprehensive architecture and performance notes, edge cases, and composition guidance to README

**prompt-engineering** — Level 3
- Evidence: Uses a shared prompt constant CENTRAL_TENDENCY_PROMPT with template literal replacements for variables (context, coreFeatures, outputRequirements). Uses a structured response_format with a JSON schema (centralTendencyResultsJsonSchema). Uses a system prompt pattern by building instructions with context and core features. Temperature is not explicitly set, so default is used. Uses map infrastructure for batch processing and retry logic. No use of asXML or promptConstants from constants.js directly, but uses a core prompt constant from verblets. No multi-stage pipeline or advanced tuning.
- Gap: Explicit temperature tuning and multi-stage prompt pipelines are missing.
- Next: Add explicit temperature setting and consider splitting the prompt into multi-stage pipeline for improved control.

**testing** — Level 2
- Evidence: Has index.examples.js using aiExpect, no spec tests
- Gap: No unit tests covering edge cases or error paths
- Next: Add unit tests with edge case and error path coverage


### collect-terms (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: The design is clean and proportional to the problem, with 55 LOC and clear phases: chunking, term extraction, deduplication, scoring, and selection. It builds on existing primitives (list and score chains) rather than reimplementing batch processing.
- Gap: Minor improvements could be made to further simplify chunking or unify processing steps.
- Next: Review chunking logic for potential simplification or reuse from other chains.

**composition-fit** — Level 2
- Evidence: collect-terms uses other chains internally (list and score) but does not expose a spec/apply interface or instruction builders itself. It works as a pipeline step but is not fully composable within the library's patterns.
- Gap: Expose spec/apply pattern and instruction builders to become a full composition citizen.
- Next: Refactor to provide spec/apply exports and instruction builders for integration with map, filter, and reduce chains.

**design-efficiency** — Level 4
- Evidence: At 55 LOC with minimal helper functions and no complex workarounds, the implementation is minimal and proportional to the problem complexity.

**generalizability** — Level 4
- Evidence: The module accepts any text input and uses natural language instructions, with no hard dependencies on specific runtimes or data formats. It is isomorphic and context-agnostic.

**strategic-value** — Level 2
- Evidence: collect-terms is a useful tool for extracting key search terms from text, enabling improved document retrieval and search relevance. It is moderately sized (55 LOC) and complements other chains in the library, but it is not a core primitive like map or filter.
- Gap: Increase its integration with other core chains to enable more frequent use in AI pipelines.
- Next: Refactor to expose spec/apply pattern or instruction builders to enhance composability and reuse.


#### Implementation Quality

**api-surface** — Level 2
- Evidence: Exports default 'collectTerms', destructures shared config params 'chunkLen', 'topN', 'llm'
- Gap: No instruction builders or spec/apply split
- Next: Implement instruction builders and spec/apply split for the chain

**browser-server** — Level 0
- Evidence: No use of 'lib/env' or runtime environment detection
- Gap: Use 'lib/env' for environment detection to support both browser and server
- Next: Integrate 'lib/env' and runtime environment checks

**composability** — Level 2
- Evidence: Composes other chains internally by calling 'list' and 'score' chains
- Gap: No exported spec/apply functions or instruction builders
- Next: Export spec/apply functions and instruction builders to improve composability

**documentation** — Level 3
- Evidence: README has API section 'collectTerms(text, config)' with parameter table for 'chunkLen', 'topN', 'llm', multiple usage examples including Technical Documentation, Research Papers, Legal Documents, and Best Practices section
- Gap: Missing architecture section, edge cases, performance notes, and composition guidance
- Next: Add architecture overview, edge case handling, performance considerations, and composition guidance to README

**errors-retry** — Level 0
- Evidence: No error handling or retry logic detected
- Gap: Add basic retry using 'lib/retry' with default 429-only policy
- Next: Implement retry logic with 'lib/retry' and add error handling

**events** — Level 0
- Evidence: No import of 'lib/progress-callback' or event emission detected
- Gap: Implement event emission using progress-callback standard events
- Next: Add 'lib/progress-callback' import and emit start/complete events

**logging** — Level 0
- Evidence: No import of 'lib/lifecycle-logger' or usage of logging functions
- Gap: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- Next: Import 'lib/lifecycle-logger' and implement structured lifecycle logging

**prompt-engineering** — Level 0
- Evidence: Inline template literals used directly in calls to the 'list' and 'score' functions without any shared prompt utilities or constants. No use of asXML or other prompt helper modules. No system prompts, temperature settings, or response_format usage detected.
- Gap: Missing use of shared prompt utilities such as asXML for variable wrapping, promptConstants, system prompts, temperature tuning, and response_format usage.
- Next: Refactor prompts to use asXML for variable wrapping and incorporate promptConstants to improve prompt modularity and maintainability.

**testing** — Level 4
- Evidence: Has 'index.spec.js' with unit tests and 'index.examples.js' using 'aiExpect'

**token-management** — Level 1
- Evidence: Manual chunking by character count in splitIntoChunks function
- Gap: Use 'createBatches' for token-budget-aware splitting
- Next: Replace manual chunking with 'createBatches' from 'lib/text-batch'


### conversation (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: At 249 LOC across 2 files, the design is proportional to the problem complexity. It uses existing chains like conversationTurnReduce and p-limit for concurrency control, avoiding reimplementation of batch processing. The code has clear phases: initialization, turn ordering, and message generation.
- Gap: Minor simplifications could be made to reduce complexity in turn policy handling.
- Next: Refactor turn policy logic to streamline order determination and reduce conditional branches.

**composition-fit** — Level 1
- Evidence: The chain uses other chains internally (conversationTurnReduce) but acts as a black box orchestrator rather than exposing a composable spec/apply interface. It does not build on core primitives like map, filter, or reduce directly.
- Gap: Refactor to expose spec/apply pattern and instruction builders to align with library composition philosophy.
- Next: Decompose conversation into smaller chains using spec/apply and instruction builders to enable composition with other library primitives.

**design-efficiency** — Level 3
- Evidence: The implementation is clean and proportional to the problem complexity with 249 LOC and 2 files. It uses helper libraries appropriately and avoids unnecessary complexity or excessive helper functions.
- Gap: Could reduce some configuration complexity and helper function count for improved clarity.
- Next: Simplify configuration parameters and consolidate helper functions where possible to improve maintainability.

**generalizability** — Level 4
- Evidence: The chain accepts natural language instructions and speaker metadata, works with any text data, and has no hard dependencies on specific runtimes or data formats. It is isomorphic and configurable, making it fully general and context-agnostic.

**strategic-value** — Level 3
- Evidence: The conversation chain enables realistic multi-speaker transcript generation with intelligent turn-taking and contextual responses, a core capability useful in AI pipelines for dialogue simulation and testing. It is moderately sized (249 LOC) and used as a standard chain in the library, indicating frequent developer use.
- Gap: Could increase strategic value by enabling more novel workflows or tighter integration with other chains for feedback loops.
- Next: Explore adding features for dynamic conversation adaptation or integration with scoring chains to enhance feedback-driven dialogue generation.


#### Implementation Quality

**browser-server** — Level 0
- Evidence: No usage of `lib/env` or environment detection; no `process.env` usage
- Gap: Use `lib/env` for environment reads to support both browser and server
- Next: Integrate `lib/env` for environment detection and adapt code accordingly

**composability** — Level 2
- Evidence: No spec/apply split exports, no instruction builders, but internal composition via conversationTurnReduce and configurable speakFn/bulkSpeakFn
- Gap: Lacks explicit spec/apply split and instruction builders
- Next: Refactor to export spec/apply functions and add instruction builders to reach next composability level

**documentation** — Level 3
- Evidence: README has Usage section with example, Constructor Parameters section listing config params weights, minSpeakers, maxSpeakers, and detailed Features and Use Cases sections
- Gap: Missing architecture section, edge cases, performance notes, and composition guidance
- Next: Add comprehensive architecture and performance documentation, include edge cases and composition guidance in README

**errors-retry** — Level 0
- Evidence: No usage of `lib/retry` or retry logic; errors propagate raw
- Gap: Add basic retry with default 429-only policy
- Next: Implement retry logic using `lib/retry` with default policy to handle transient errors

**events** — Level 0
- Evidence: No import of `lib/progress-callback` or usage of event emission functions
- Gap: Accepts `onProgress` and emits standard lifecycle events
- Next: Add support for `onProgress` callback and emit standard events like start, complete, step

**logging** — Level 1
- Evidence: Uses `console.warn` in `run` method for error logging, no import of `lib/lifecycle-logger`
- Gap: Accepts `logger` config and uses `logger?.info()` inline
- Next: Add `logger` parameter to config and replace `console.warn` with `logger?.info()` calls

**prompt-engineering** — Level 0
- Evidence: No prompt imports or usage of shared prompt utilities; prompts appear to be constructed via raw string concatenation or inline code logic; no use of asXML or promptConstants; no system prompts, temperature settings, or response_format usage detected.
- Gap: Missing use of shared prompt utilities such as asXML for variable wrapping, promptConstants for reusable fragments, system prompts, temperature tuning, and response_format for structured output.
- Next: Refactor prompt construction to use asXML for variable wrapping and integrate promptConstants to modularize prompt fragments.

**testing** — Level 4
- Evidence: Has index.spec.js with unit tests, index.examples.js using aiExpect

**token-management** — Level 0
- Evidence: No token management code or usage of `createBatches` or similar
- Gap: Implement token-budget-aware input splitting
- Next: Integrate `createBatches` or similar token management utilities to handle input size


### conversation-turn-reduce (internal)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: At 68 lines, the module is concise and focused, using the map chain internally without reimplementing batch processing. The design is proportional to the problem with clear phases.
- Gap: None; design is clean and proportional.
- Next: Maintain current design; monitor for complexity growth.

**composition-fit** — Level 2
- Evidence: The module uses the map chain internally but is an internal helper not designed as a composable pipeline step itself; it acts as a black box within the conversation chain.
- Gap: Expose a cleaner composable interface to allow use as a pipeline step or composition citizen.
- Next: Refactor to provide a composable function interface compatible with other library chains.

**design-efficiency** — Level 3
- Evidence: The implementation is concise (68 LOC), with no helper functions or complex imports, proportional to the problem complexity.
- Gap: None; implementation is efficient and straightforward.
- Next: Continue to keep implementation minimal and focused.

**generalizability** — Level 3
- Evidence: The module uses natural language instructions and works with generic speaker descriptions and conversation history, without hard dependencies on specific runtimes or data formats.
- Gap: Could improve by decoupling further from conversation-specific data structures to serve broader contexts.
- Next: Abstract speaker and history inputs to more generic forms to enhance applicability.

**strategic-value** — Level 2
- Evidence: This internal helper module supports multi-speaker conversation generation, enabling a useful but specialized feature within the conversation chain. It is not directly used by developers but underpins a real problem solution, indicating moderate frequency and utility.
- Gap: Increase direct usability or expose more general interfaces to broaden developer reach.
- Next: Refactor to expose composable interfaces or integrate with other chains to increase strategic value.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default function `conversationTurnReduce` only
- Gap: No named exports or shared config destructuring
- Next: Add named exports and document shared config parameters

**documentation** — Level 1
- Evidence: README exists with basic description and internal usage example
- Gap: Missing API section with parameter table and shared config reference
- Next: Add detailed API section with parameter table and shared config documentation

**prompt-engineering** — Level 0
- Evidence: The chain uses inline template literals for prompt construction, such as concatenating history messages and speaker descriptions directly in the source code. There are no imports of promptConstants or prompt helper modules like asXML. No system prompts, temperature settings, or response_format usage are present.
- Gap: Missing use of shared prompt utilities like asXML for variable wrapping, promptConstants for reusable fragments, system prompts, temperature tuning, and response_format for structured output.
- Next: Refactor prompt construction to use asXML for variable wrapping and incorporate promptConstants to improve prompt modularity and maintainability.

**testing** — Level 2
- Evidence: Has `index.spec.js` with unit tests and `index.examples.js` without aiExpect
- Gap: No aiExpect coverage for semantic validation
- Next: Add aiExpect assertions in example tests for semantic validation


### date (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: At 255 lines of code across 2 files, the design is proportional to the complexity of date extraction and normalization. It uses clear phases such as prompt building, extraction, validation, and retry logic without reimplementing batch processing primitives.

**composition-fit** — Level 2
- Evidence: The chain exposes a clean function interface for date extraction but does not build on the library's core batch processing primitives (map, filter, reduce) or spec/apply patterns, limiting its composability within the library.
- Gap: Refactor to leverage spec/apply pattern and integrate with batch processing chains to improve composability.
- Next: Decompose the chain into spec and apply components and create instruction builders to enable composition with other chains.

**design-efficiency** — Level 3
- Evidence: The implementation is efficient with 255 LOC and a manageable number of helper functions. The code complexity aligns with the genuine complexity of date extraction, retry, and validation logic.

**generalizability** — Level 4
- Evidence: The chain accepts natural language instructions and works with any text input without hard dependencies on specific runtimes or data formats, making it fully general and context-agnostic.

**strategic-value** — Level 3
- Evidence: The 'date' chain is a core capability frequently needed in AI pipelines for extracting and normalizing dates from text, enabling workflows that require temporal understanding. It is used across various projects as indicated by its standard tier and integration in the portfolio.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default function 'date' only, no named exports or instruction builders
- Gap: No instruction builders or spec/apply split exports
- Next: Introduce instruction builders and split spec/apply functions to enhance API composability

**browser-server** — Level 0
- Evidence: No usage of `lib/env` or runtime environment detection; no browser/server compatibility code
- Gap: Add environment detection using `lib/env` to support both browser and server environments
- Next: Integrate `lib/env` for environment checks and ensure graceful degradation in browser and server

**composability** — Level 2
- Evidence: No spec/apply split exports; chain composes other chains internally as per source imports (e.g., 'bool' chain), but no exported composability interfaces
- Gap: Lacks exported spec/apply split functions and instruction builders
- Next: Export spec/apply split functions and instruction builders to improve composability beyond internal use

**documentation** — Level 3
- Evidence: README has API section with parameter table listing 'text', 'instructions', 'config' including 'format', 'timezone', 'includeTime', 'llm'; multiple usage examples for document processing, event planning, content analysis; behavioral notes on intelligent format recognition, relative date processing, confidence scoring, timezone support
- Gap: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- Next: Add detailed architecture overview, edge case handling, performance considerations, and guidance on composing this chain with others

**errors-retry** — Level 1
- Evidence: Imports `retry` from `lib/retry`, uses `retry` with `maxAttempts` and `retryOnAll: true` for retrying date extraction
- Gap: No input validation or defined failure modes beyond retry; no custom error types or error context attached
- Next: Add input validation and structured error handling with custom error types and context

**events** — Level 1
- Evidence: Accepts `onProgress` in config but only passes it to `retry` call's onProgress parameter
- Gap: Does not emit standard lifecycle events (start, complete, step) via `lib/progress-callback`
- Next: Implement standard event emission using `lib/progress-callback` for start, complete, and step events

**logging** — Level 4
- Evidence: Imports `createLifecycleLogger` from `lib/lifecycle-logger`, uses `createLifecycleLogger(logger, 'chain:date')`, calls `logStart`, `logEvent`, `logResult`

**prompt-engineering** — Level 3
- Evidence: Uses extracted prompt builder functions buildExpectationPrompt, buildDatePrompt, buildValidationPrompt; uses promptConstants including asDate, asUndefinedByDefault, contentIsQuestion, explainAndSeparate, explainAndSeparatePrimitive, asWrappedArrayJSON, asJSON, asWrappedValueJSON; uses response_format with JSON schemas dateValueSchema and dateExpectationsSchema; uses system prompt patterns via contentIsQuestion and promptConstants; temperature setting not explicitly set (default used); response_format used consistently for structured output; lifecycle logger used for prompt analysis and logging.
- Gap: No explicit temperature tuning or multi-stage prompt pipelines with frequency/presence penalty tuning.
- Next: Introduce temperature tuning and multi-stage prompt pipelines with penalty tuning to reach level 4.

**testing** — Level 4
- Evidence: Has 'index.spec.js' with unit tests and 'index.examples.js' using 'aiExpect' for semantic validation

**token-management** — Level 0
- Evidence: No usage of `createBatches` or token-budget-aware splitting; no token management code
- Gap: Implement token-budget-aware input splitting using `createBatches`
- Next: Add token-aware batching to manage input size and cost effectively


### detect-patterns (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: At 128 LOC and 2 files, the design is clean and proportional; it builds on the reduce chain primitive rather than reimplementing batch processing, with clear phases in the main function.

**composition-fit** — Level 2
- Evidence: detect-patterns uses the reduce chain internally and exposes a clean async function interface, but does not expose spec/apply or instruction builders for further composition.
- Gap: Expose spec/apply pattern and instruction builders to integrate with other collection chains for full composition fit.
- Next: Refactor to provide spec/apply exports and instruction builders enabling use with map, filter, and reduce chains.

**design-efficiency** — Level 3
- Evidence: With 128 LOC and minimal helper functions, the implementation is efficient and proportional to the problem complexity, avoiding unnecessary complexity or workarounds.

**generalizability** — Level 4
- Evidence: The chain accepts generic object arrays and natural language instructions, with no hard dependencies on specific runtimes or data formats, making it fully general and context-agnostic.

**strategic-value** — Level 3
- Evidence: detect-patterns enables identifying recurring data patterns, a core AI data analysis task; it is a standard tier chain used in pipelines for pattern discovery, supporting workflows previously impractical without LLMs.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default function detectPatterns only, no named exports
- Gap: No instruction builders or spec/apply split
- Next: Introduce instruction builders and spec/apply split exports to improve composability and API clarity

**browser-server** — Level 0
- Evidence: No usage of 'lib/env' or environment detection
- Gap: Use 'lib/env' for environment detection to support both browser and server
- Next: Refactor to use 'lib/env' for environment reads instead of direct environment checks

**code-quality** — Level 3
- Evidence: Clean, well-structured code with clear function separation (e.g., filterObject, detectPatterns), no dead code
- Gap: Improve to reference-quality with comprehensive documentation and example usage
- Next: Add detailed documentation and examples to reach reference-quality

**composability** — Level 2
- Evidence: No spec/apply split exports, no instruction builders; limited to max level 2 per ceiling
- Gap: Missing spec/apply split and instruction builders
- Next: Refactor to export spec/apply functions and instruction builders to reach level 3 composability

**documentation** — Level 3
- Evidence: README has Usage section with import example, Example: Community Garden Success Stories section with detailed example, Parameters and Returns sections
- Gap: Missing architecture section, edge cases, performance notes, composition guidance
- Next: Add comprehensive architecture and performance notes, edge cases, and composition guidance to README

**errors-retry** — Level 0
- Evidence: No error handling or retry logic observed
- Gap: Add basic retry logic using 'lib/retry' with default policies
- Next: Implement retry mechanism with error handling and retry policies

**events** — Level 0
- Evidence: No imports from 'lib/progress-callback', no event emission
- Gap: Implement event emission using 'lib/progress-callback'
- Next: Add 'onProgress' support and emit standard lifecycle events

**logging** — Level 0
- Evidence: No imports from 'lib/lifecycle-logger', no logger usage
- Gap: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- Next: Import 'lib/lifecycle-logger' and implement structured lifecycle logging

**prompt-engineering** — Level 3
- Evidence: Uses a response_format with a JSON schema (PATTERN_RESPONSE_FORMAT) for structured output; employs a system prompt style instruction in the 'patternInstructions' template literal; uses the 'reduce' chain with options including llm and responseFormat; no promptConstants or asXML usage detected; temperature setting not explicitly set (defaults likely used).
- Gap: Does not use promptConstants or extracted prompt builder functions; no multi-stage prompt pipelines or temperature tuning beyond defaults.
- Next: Integrate promptConstants for reusable prompt fragments and consider explicit temperature tuning to improve prompt control.

**testing** — Level 4
- Evidence: Has index.spec.js with unit tests and index.examples.js using aiExpect

**token-management** — Level 0
- Evidence: No usage of 'lib/text-batch' or token budget management
- Gap: Implement token-budget-aware input splitting using createBatches
- Next: Integrate 'lib/text-batch' createBatches for token-aware batching


### detect-threshold (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: The design is clean and proportional to the problem complexity, with clear phases: statistics calculation, data enrichment, batch analysis via reduce chain, and final recommendation. It builds on the library's reduce primitive and avoids bespoke infrastructure.
- Gap: Minor simplifications could be made to reduce LOC or helper functions, but overall design is sound.
- Next: Review helper functions for potential consolidation to streamline codebase.

**composition-fit** — Level 3
- Evidence: The chain composes with the library's reduce primitive for batch processing and uses natural language instructions, fitting well into the spec/apply pattern. However, it does not export spec/apply interfaces itself, limiting full composition citizenship.
- Gap: Expose spec/apply interfaces and instruction builders to fully align with library composition patterns.
- Next: Refactor to provide spec/apply exports and instruction builders for integration with other collection chains.

**design-efficiency** — Level 2
- Evidence: At 275 LOC with a single main export and multiple helper functions, the implementation shows moderate complexity. Some complexity arises from managing batch processing and LLM interactions, but the design mostly works without excessive workarounds.
- Gap: Reduce helper function count and simplify batch processing logic to improve efficiency.
- Next: Audit code to identify and refactor redundant helpers and streamline batch data handling.

**generalizability** — Level 4
- Evidence: The chain accepts generic data arrays and natural language goals, uses no hard dependencies on specific frameworks or data formats, and relies on the core reduce chain pattern, making it fully general and context-agnostic.

**strategic-value** — Level 3
- Evidence: The detect-threshold chain addresses a core capability in AI pipelines by analyzing numeric distributions to recommend adaptive thresholds, enabling nuanced risk management workflows. It is moderately sized (275 LOC) and complements other chains without overlapping, indicating frequent developer use for data-driven decision making.
- Gap: Could increase transformative impact by enabling more novel feedback loops or automation patterns.
- Next: Explore integration with real-time monitoring or adaptive feedback systems to enhance strategic value.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default function detectThreshold only, no named exports or instruction builders
- Gap: No instruction builders or spec/apply split exports
- Next: Introduce instruction builders and split spec/apply functions to improve composability and API clarity

**browser-server** — Level 0
- Evidence: No use of 'lib/env' or runtime environment detection; no isomorphic environment handling
- Gap: Use 'lib/env' for environment detection to support both browser and server
- Next: Refactor environment checks to use 'lib/env' proxy and runtime.isBrowser/runtime.isNode

**code-quality** — Level 3
- Evidence: Clear function separation (calculateStatistics, detectThreshold), descriptive naming, no dead code, extracted pure functions
- Gap: Further modularization and composability for reference-quality code
- Next: Refactor to separate orchestration and core logic into composable modules

**composability** — Level 2
- Evidence: No spec/apply split or instruction builders, but composes other chains internally (imports reduce, callLlm, retry) as chain-of-chains
- Gap: Missing spec/apply split exports and instruction builders
- Next: Refactor to export spec/apply functions and instruction builders to reach level 3 composability

**documentation** — Level 3
- Evidence: README has Usage section with example usage, API section documenting detectThreshold({ data, targetProperty, goal, [options] }) with parameter descriptions and return value
- Gap: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- Next: Add detailed architecture overview, edge case handling, performance considerations, and guidance on composing this chain with others in README

**errors-retry** — Level 1
- Evidence: Imports 'lib/retry' and uses retry() with default 429-only policy; basic input validation with throw
- Gap: Add multi-level retry, conditional retry, and attach error context
- Next: Enhance retry logic with conditional retry and attach error context to results

**events** — Level 0
- Evidence: No import of 'lib/progress-callback' or calls to emit events; onProgress is accepted but only passed through
- Gap: Emit standard lifecycle events using 'lib/progress-callback' emitters
- Next: Integrate 'lib/progress-callback' and emit start, complete, and step events during processing

**logging** — Level 0
- Evidence: No import of 'lib/lifecycle-logger' or usage of createLifecycleLogger or logger methods
- Gap: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- Next: Import 'lib/lifecycle-logger' and implement createLifecycleLogger with logStart and logResult calls

**prompt-engineering** — Level 3
- Evidence: Uses asXML for variable wrapping (from ../../prompts/wrap-variable.js), uses response_format with JSON schemas for both reduce and final LLM calls, uses retry and callLlm utilities, includes detailed prompt instructions with structured JSON schema for accumulator and threshold results, no explicit system prompt or temperature setting found.
- Gap: Missing explicit system prompt and temperature tuning to reach level 4.
- Next: Introduce a system prompt to set the LLM role and tune temperature and frequency/presence penalties for improved prompt control.

**testing** — Level 2
- Evidence: Has index.examples.js using aiExpect, but no spec tests
- Gap: Lacks unit tests covering edge cases and error paths
- Next: Add unit tests with vitest covering edge cases and error handling to improve test coverage

**token-management** — Level 1
- Evidence: Manual chunking of dataStrings with ITEMS_PER_LINE = 20; no use of createBatches or token-budget-aware splitting
- Gap: Implement token-budget-aware batching using createBatches
- Next: Replace manual chunking with createBatches from 'lib/text-batch' for token-aware input splitting


### disambiguate (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: At 124 LOC, the chain is concise and focused, with clear phases: getMeanings and scoring. It builds on existing 'score' chain rather than reimplementing batch processing.
- Gap: Minor simplifications could be made but overall design is proportional and clean.
- Next: Review for any redundant code or helper functions to streamline further.

**composition-fit** — Level 2
- Evidence: Exposes a clean function interface (getMeanings, disambiguate) and uses the 'score' chain internally, but does not itself expose spec/apply or instruction builders for further composition.
- Gap: Refactor to expose spec/apply pattern and instruction builders to align fully with library composition patterns.
- Next: Modularize disambiguate to provide spec/apply exports and instruction builders for use in collection chains.

**design-efficiency** — Level 3
- Evidence: Implementation is efficient and proportional to problem complexity with 124 LOC, minimal helper functions, and no evident workarounds or duplicated logic.

**generalizability** — Level 4
- Evidence: The chain accepts natural language instructions and works with any text input without hard dependencies on specific runtimes or data formats, making it fully general and context-agnostic.

**strategic-value** — Level 2
- Evidence: Disambiguate is a useful tool solving a real problem of resolving ambiguous terms in context, with moderate frequency of use as indicated by its standard tier and 124 LOC module size.
- Gap: Increase frequency of use by enabling broader integration or novel workflows.
- Next: Develop additional pipeline integrations or use cases to increase adoption.


#### Implementation Quality

**api-surface** — Level 2
- Evidence: Exports `getMeanings` and default export `disambiguate`, accepts shared config params `model`, `llm`, `maxAttempts`, `onProgress`, `now`
- Gap: No instruction builders or spec/apply split
- Next: Implement instruction builders and spec/apply function split to enhance API composability

**browser-server** — Level 0
- Evidence: No usage of 'lib/env' or runtime environment detection; no isomorphic environment handling
- Gap: Use 'lib/env' for environment detection to support both browser and server
- Next: Refactor environment reads to use 'lib/env' proxy and runtime.isBrowser/runtime.isNode

**code-quality** — Level 2
- Evidence: Clear naming, extracted pure functions like createModelOptions; no dead code; some duplication of createModelOptions with other chains
- Gap: Extract duplicated createModelOptions to shared utility; improve separation of concerns
- Next: Refactor createModelOptions into shared utility to reduce duplication and improve modularity

**composability** — Level 2
- Evidence: Composes other chains internally by using `score` chain, but no spec/apply split or instruction builders
- Gap: Missing spec/apply split and instruction builders for composability level 3
- Next: Refactor to export spec/apply functions and instruction builders to improve composability

**documentation** — Level 3
- Evidence: README has API section with `disambiguate({ term, context, ...config })` and `getMeanings(term, config)`, multiple usage examples, and behavioral notes in 'How It Works' section
- Gap: Missing comprehensive architecture, edge cases, performance notes, and composition guidance
- Next: Add architecture overview, edge case handling, performance considerations, and composition guidance to README

**errors-retry** — Level 1
- Evidence: Imports 'lib/retry' and uses retry() with default 429-only policy; no input validation or custom error handling
- Gap: Add input validation, defined failure modes, and enhanced retry strategies
- Next: Implement input validation and multi-level retry with error context attachment

**events** — Level 2
- Evidence: Imports 'lib/progress-callback' and calls 'emitStepProgress' to emit standard step events
- Gap: Emit batch-level events such as batchStart, batchProcessed, batchComplete
- Next: Implement batch-level event emission using progress-callback's batch event functions

**logging** — Level 0
- Evidence: Imports do not include 'lib/lifecycle-logger'; no usage of createLifecycleLogger or logStart/logResult
- Gap: Add lifecycle logging using 'lib/lifecycle-logger' with logStart and logResult
- Next: Import 'lib/lifecycle-logger' and instrument key functions with createLifecycleLogger and logStart/logResult

**prompt-engineering** — Level 3
- Evidence: Uses promptConstants.onlyJSONStringArray for prompt framing; uses response_format with JSON schema (disambiguateMeaningsSchema) in createModelOptions; employs retry wrapper for callLlm; no explicit system prompt or temperature setting found; response_format usage is consistent and structured.
- Gap: Missing explicit system prompt and temperature tuning for finer control.
- Next: Introduce system prompt to set role and context, and tune temperature parameter for improved prompt control.

**testing** — Level 4
- Evidence: Has `index.spec.js` with unit tests and `index.examples.js` using `aiExpect`

**token-management** — Level 1
- Evidence: Uses model.budgetTokens(prompt) for model-aware budget calculation
- Gap: Implement proportional multi-value budget management with auto-summarization
- Next: Add multi-value budget management and auto-summarization to improve token efficiency


### dismantle (standard)

#### Design Fitness

**architectural-fitness** — Level 2
- Evidence: At 389 LOC across 2 files, the chain is moderately complex. It does not reimplement batch primitives but has some complexity in managing LLM calls and tree construction, indicating adequate but not minimal design.
- Gap: Simplify the decomposition and enhancement phases to reduce code complexity and improve clarity.
- Next: Refactor makeNode and makeSubtree functions to streamline recursive tree building.

**composition-fit** — Level 1
- Evidence: The chain does not use or expose the library's batch processing primitives (map, filter, reduce) and implements its own orchestration for tree building, indicating limited composition fit.
- Gap: Refactor to build on existing batch processing chains and expose spec/apply patterns to improve composability.
- Next: Decompose dismantle into smaller chains that leverage map/filter primitives for subcomponent processing.

**design-efficiency** — Level 2
- Evidence: 389 LOC for a single export with multiple helper functions and complex LLM retry logic suggests moderate complexity; some helper functions may indicate the abstraction could be improved.
- Gap: Reduce helper function count and simplify retry and prompt construction logic to improve efficiency.
- Next: Consolidate prompt generation and retry logic into reusable utilities to reduce code duplication.

**generalizability** — Level 4
- Evidence: The chain uses natural language instructions and LLM calls without hard dependencies on specific runtimes or data formats, making it fully general and adaptable to new use cases.

**strategic-value** — Level 3
- Evidence: The dismantle chain enables breaking down complex systems into component trees using LLMs, a core capability useful in AI pipelines for system analysis and decomposition. It is frequently used as a foundational tool for hierarchical component extraction.
- Next: Promote usage examples to increase adoption in diverse AI workflows.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports `simplifyTree`, `dismantle` with default export present
- Gap: Missing documented shared config destructuring and instruction builders
- Next: Document shared config parameters and add instruction builders for API exports

**browser-server** — Level 0
- Evidence: No import or usage of 'lib/env' or runtime environment detection
- Gap: Use 'lib/env' for environment reads to support isomorphic operation
- Next: Refactor environment-dependent code to use 'lib/env' proxy

**composability** — Level 2
- Evidence: Exports `simplifyTree` and `dismantle`, no spec/apply split, no instruction builders, no factory functions
- Gap: No spec/apply split or instruction builders to enable higher composability
- Next: Implement spec/apply function split and instruction builders to improve composability

**documentation** — Level 3
- Evidence: README has API section with parameter table and multiple examples including usage of dismantle and simplifyTree, behavioral notes on ChainTree methods
- Gap: Lacks comprehensive architecture section, edge cases, performance notes, and composition guidance
- Next: Add architecture overview, edge case handling, performance considerations, and composition guidance to README

**errors-retry** — Level 1
- Evidence: Imports 'lib/retry' and uses retry() with default retry policy, no custom error handling or multi-level retry
- Gap: Add input validation, conditional retry, and error context attachment
- Next: Implement input validation and enhance retry strategy with conditional logic and error context

**events** — Level 1
- Evidence: Imports 'lib/retry' and accepts 'onProgress' parameter, passes it to retry calls
- Gap: Emit standard lifecycle events (start, complete, step) via progress-callback
- Next: Use 'lib/progress-callback' to emit standard events during processing

**logging** — Level 0
- Evidence: No import of 'lib/lifecycle-logger' or usage of createLifecycleLogger or logger calls
- Gap: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- Next: Import 'lib/lifecycle-logger' and instrument key functions with createLifecycleLogger and logStart/logResult

**prompt-engineering** — Level 4
- Evidence: The chain uses extracted prompt builder functions subComponentsPrompt and componentOptionsPrompt that incorporate promptConstants such as asJSON and asWrappedArrayJSON. It sets temperature explicitly (0.7 for decompose, 0.3 for enhance), uses response_format with JSON schemas (subComponentsSchema and componentOptionsSchema), and applies frequencyPenalty tuning (0.7 and 0.5). The chain implements a multi-stage prompt pipeline with separate decompose and enhance stages, each with tailored prompts and model configurations. System prompts are not explicitly shown but the prompt functions encapsulate detailed instructions. The chain also uses shared prompt utilities from prompts/index.js and applies retry logic for robustness.

**testing** — Level 4
- Evidence: Has `index.spec.js` with unit tests and `index.examples.js` using `aiExpect`

**token-management** — Level 1
- Evidence: Uses model.budgetTokens() for model-aware budget calculation in defaultDecompose and defaultEnhance
- Gap: Implement proportional multi-value budget management with auto-summarization
- Next: Add multi-value budget management and auto-summarization features


### document-shrink (standard)

#### Design Fitness

**architectural-fitness** — Level 1
- Evidence: At 632 LOC with a single export and multiple helper functions, the implementation is large relative to the core idea of document shrinking, indicating some architectural strain and potential overcomplexity.
- Gap: Refactor to decompose the monolithic implementation into smaller composable chains or leverage existing primitives more fully.
- Next: Extract adaptive chunking, scoring, and compression into separate composable chains or utilities.

**composition-fit** — Level 1
- Evidence: Although document-shrink uses other chains like score and map internally, it acts as a sealed black box without exposing composable interfaces, limiting its integration into larger pipelines.
- Gap: Redesign to expose spec/apply patterns and instruction builders to enable composition with other library chains.
- Next: Refactor to split document-shrink into composable steps that can be orchestrated externally.

**design-efficiency** — Level 1
- Evidence: High LOC count (632) for a single export and multiple helper functions suggests significant complexity and possible friction in the design, with complex token-budget arithmetic indicating the design is fighting the implementation.
- Gap: Simplify token budget management and reduce internal complexity by leveraging existing abstractions.
- Next: Implement a dedicated token budget manager and modularize compression and scoring logic.

**generalizability** — Level 3
- Evidence: The chain works with generic text input and uses natural language instructions, with no hard dependencies on specific runtimes or data formats, making it broadly applicable across domains.

**strategic-value** — Level 3
- Evidence: document-shrink is a core capability frequently needed in AI pipelines for document summarization and query-focused content reduction, enabling workflows that handle large documents adaptively.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports no default export, only named exports (none listed explicitly)
- Gap: No default export and no documented instruction builders or spec/apply split
- Next: Add a default export and document all exports with shared config destructuring

**browser-server** — Level 0
- Evidence: No usage of 'lib/env' or runtime environment detection; no isomorphic environment handling
- Gap: Use 'lib/env' for environment detection to support both browser and server
- Next: Refactor environment checks to use 'lib/env' proxy and runtime.isBrowser/runtime.isNode

**composability** — Level 2
- Evidence: No spec/apply split exports, no instruction builders; composability capped at level 2 per ceiling
- Gap: Missing spec/apply split and instruction builders for composability level 3
- Next: Implement spec/apply split functions and instruction builders to improve composability

**documentation** — Level 3
- Evidence: README has Usage, Options, How it works sections with detailed API parameters targetSize, tokenBudget, chunkSize, llm
- Gap: Missing architecture section, edge cases, performance notes, composition guidance
- Next: Add comprehensive architecture and performance documentation to README

**errors-retry** — Level 0
- Evidence: No try/catch or retry logic; errors propagate raw without handling
- Gap: Add basic retry logic using 'lib/retry' with default 429-only policy
- Next: Implement error handling with retry wrappers around async calls like collectTerms and score

**events** — Level 0
- Evidence: No import of 'lib/progress-callback' or calls to emit events; accepts onProgress but only passes through
- Gap: Emit standard lifecycle events using 'lib/progress-callback' emitters
- Next: Integrate 'lib/progress-callback' and emit start, complete, and step events during processing

**logging** — Level 0
- Evidence: No import of 'lib/lifecycle-logger' or usage of createLifecycleLogger or logger methods
- Gap: Add lifecycle logging using 'lib/lifecycle-logger' with logStart and logResult
- Next: Import 'lib/lifecycle-logger' and instrument main functions with createLifecycleLogger and logStart/logResult calls

**testing** — Level 4
- Evidence: Has index.spec.js with unit tests and index.examples.js using aiExpect

**token-management** — Level 1
- Evidence: Manual chunking by character count in createChunks; no use of createBatches or token-budget-aware splitting
- Gap: Use 'createBatches' from 'lib/text-batch' for token-budget-aware chunking
- Next: Replace manual chunking with 'createBatches' to manage token budgets automatically


### entities (core)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: At 296 lines, the chain has a clean design proportional to the problem complexity. It uses spec/apply pattern and clear phases without unnecessary abstractions.

**composition-fit** — Level 4
- Evidence: Follows the spec/apply pattern and provides instruction builders for all collection chains, enabling full composition and novel workflows by combining with other chains.

**design-efficiency** — Level 3
- Evidence: LOC is proportional to problem complexity (~296 lines), with a manageable number of helper functions and no evident workarounds or duplicated logic.

**generalizability** — Level 3
- Evidence: The chain accepts natural language instructions and works with any text input, with no hard dependencies on specific runtimes or data formats, making it general purpose across domains.

**strategic-value** — Level 3
- Evidence: Entities chain is a core capability frequently used in AI pipelines, enabling entity extraction workflows that are common and essential. It integrates with collection chains and supports specification-based extraction, which is powerful.


#### Implementation Quality

**api-surface** — Level 4
- Evidence: Exports 'entitySpec', 'applyEntities', 'extractEntities', 'mapInstructions', 'filterInstructions', 'reduceInstructions', 'findInstructions', 'groupInstructions', 'createEntityExtractor'; no default export; instruction builders accept { specification, processing? } as per README.

**browser-server** — Level 0
- Evidence: No usage of 'lib/env' or runtime environment detection, no browser/server environment handling
- Gap: Use 'lib/env' for environment detection to support both browser and server
- Next: Integrate 'lib/env' and add environment checks to enable isomorphic support

**code-quality** — Level 4
- Evidence: Well-structured code with clear separation of concerns, consistent instruction builder pattern, factory with Object.defineProperty for introspection, clean spec/apply split

**composability** — Level 4
- Evidence: Exports 'entitySpec()' and 'applyEntities()' split; provides instruction builders 'mapInstructions', 'filterInstructions', 'findInstructions', 'groupInstructions', 'reduceInstructions'; exports factory function 'createEntityExtractor'.

**documentation** — Level 4
- Evidence: README has API section listing default export 'entities(prompt, config)', exports 'extractEntities', 'entitySpec', 'applyEntities', 'createEntityExtractor', and instruction builders 'mapInstructions', 'filterInstructions', 'findInstructions', 'groupInstructions', 'reduceInstructions'; documents shared config params 'llm', 'maxAttempts', 'onProgress', 'now'; includes multiple usage examples, advanced usage, performance notes, and composition guidance.

**errors-retry** — Level 1
- Evidence: Imports 'lib/retry' and uses retry() with default 429-only policy, no custom error handling or multi-level retry
- Gap: Add input validation, conditional retry, and defined failure modes
- Next: Enhance retry logic with input validation and conditional retry policies, attach error context to results

**events** — Level 3
- Evidence: Imports 'lib/progress-callback' and calls emitStepProgress in extractEntities
- Gap: Implement phase-level events for multi-phase operations
- Next: Add phase-level event emission using emitPhaseProgress or similar in multi-phase functions like reduceInstructions or groupInstructions

**logging** — Level 0
- Evidence: Imports do not include 'lib/lifecycle-logger', no usage of createLifecycleLogger or logger calls
- Gap: Add lifecycle logging using createLifecycleLogger with logStart and logResult
- Next: Import 'lib/lifecycle-logger' and implement createLifecycleLogger with logStart/logResult in core functions like entitySpec and applyEntities

**prompt-engineering** — Level 3
- Evidence: Uses asXML for variable wrapping extensively (e.g., asXML(prompt, { tag: 'entity-instructions' })), uses promptConstants.onlyJSON in prompts, employs system prompts (e.g., specSystemPrompt in entitySpec), and configures response_format with JSON schema in applyEntities (modelOptions.response_format with json_schema referencing entityResultSchema).
- Gap: Missing multi-stage prompt pipelines and advanced tuning like frequency/presence penalty to reach level 4.
- Next: Implement multi-stage prompt pipelines and tune frequency/presence penalties for improved prompt control.

**testing** — Level 4
- Evidence: Has 'index.spec.js' with unit tests and 'index.examples.js' using 'aiExpect'.

**token-management** — Level 0
- Evidence: No usage of 'lib/text-batch' or createBatches, no token budget management observed
- Gap: Implement token-budget-aware input splitting using createBatches
- Next: Integrate 'lib/text-batch' and use createBatches to manage token budgets for input processing


### expect (standard)

#### Design Fitness

**architectural-fitness** — Level 2
- Evidence: The chain has 415 lines of code across 2 files, which is relatively large. It includes complex features like code context extraction, git path resolution, and LLM-based advice generation, indicating some architectural complexity. It does not reimplement batch processing primitives but has some complexity that might be reduced.
- Gap: Reduce complexity by modularizing or simplifying code context and introspection features.
- Next: Refactor code context and introspection logic into smaller composable modules to improve clarity and reduce LOC.

**composition-fit** — Level 2
- Evidence: The chain does not use other chains internally and does not expose spec/apply or instruction builders. It is a standalone module providing a pipeline step (expectation assertion) but is not designed as a composable chain within the library's batch processing primitives.
- Gap: Refactor to expose spec/apply pattern and integrate with existing batch processing chains for better composability.
- Next: Design and implement spec generation and application steps to enable composition with map, filter, and reduce chains.

**design-efficiency** — Level 2
- Evidence: At 415 LOC with multiple helper functions and complex features, the implementation shows moderate complexity. Some helper functions handle file context and introspection, which may be simplified. The code is proportional to the problem but could be more efficient.
- Gap: Simplify helper functions and reduce code duplication to improve efficiency.
- Next: Audit helper functions for overlap and refactor to reduce LOC and improve clarity.

**generalizability** — Level 3
- Evidence: The chain uses environment variables for modes and works with any text input for assertions. It does not appear locked to a specific test framework or runtime, though it uses Node.js APIs for file and git operations, which may limit browser use.
- Gap: Abstract file system and git operations to enable isomorphic usage beyond Node.js.
- Next: Create adapters for file and git operations to support browser or other runtimes.

**strategic-value** — Level 4
- Evidence: The 'expect' chain is described as advanced intelligent assertions with debugging features, environment modes, and structured results, enabling powerful AI assertion workflows previously impossible. It is used for content quality assurance with debugging and integrates deeply with developer workflows, making it transformative.


#### Implementation Quality

**api-surface** — Level 2
- Evidence: Exports `expect`, `aiExpect`, `expectSimple` with documented API in README
- Gap: No instruction builders or spec/apply split exports
- Next: Introduce instruction builders and spec/apply split exports to enhance API composability

**browser-server** — Level 2
- Evidence: Imports 'lib/env' and uses 'env' proxy for environment reads
- Gap: Add tests for both browser and server environments and implement graceful degradation
- Next: Write cross-environment tests and handle missing features gracefully

**code-quality** — Level 3
- Evidence: Clear function separation (e.g., getDisplayPath, getCodeContext), consistent camelCase naming, no dead code
- Gap: Improve composability and explicit transformations for reference-quality code
- Next: Refactor to further separate concerns and enhance composability

**composability** — Level 2
- Evidence: Exports `expect`, `aiExpect`, `expectSimple` but no spec/apply split or factory functions
- Gap: Lacks spec/apply split and instruction builders for higher composability
- Next: Refactor to export spec/apply functions and instruction builders to improve composability

**documentation** — Level 3
- Evidence: README has API Reference section with detailed usage examples, environment variable modes, advanced features, and best practices
- Gap: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- Next: Add architecture overview, edge case handling, performance considerations, and guidance on composing with other chains in README

**errors-retry** — Level 0
- Evidence: No import or usage of 'lib/retry'; no error handling or retry logic observed
- Gap: Add basic retry logic and error handling using 'lib/retry' with default policies
- Next: Implement retry mechanism and structured error handling

**events** — Level 0
- Evidence: No import of 'lib/progress-callback' and no event emission functions detected
- Gap: Add event emission using 'lib/progress-callback' with standard events like start and complete
- Next: Integrate 'lib/progress-callback' and emit lifecycle events during processing

**logging** — Level 0
- Evidence: Imports include 'lib/logger' but no import of 'lib/lifecycle-logger'; no usage of createLifecycleLogger or logStart/logResult found
- Gap: Implement lifecycle logging using 'lib/lifecycle-logger' with logStart and logResult
- Next: Refactor to use 'createLifecycleLogger' and lifecycle logging methods for structured logs

**testing** — Level 4
- Evidence: Has `index.spec.js` with unit tests and `index.examples.js` using `aiExpect`

**token-management** — Level 0
- Evidence: No usage of 'lib/text-batch' or 'createBatches' for token budget management
- Gap: Implement token-budget-aware input splitting using 'createBatches' or similar
- Next: Integrate token budget management to handle large inputs efficiently


### extract-blocks (standard)

#### Design Fitness

**architectural-fitness** — Level 2
- Evidence: At 251 LOC across 2 files, the design is adequate but somewhat complex; it does not build on existing batch primitives like map or filter, instead implementing bespoke windowing and retry logic.
- Gap: Refactor to leverage existing batch processing chains and reduce bespoke coordination code.
- Next: Decompose window processing into compositions of map and filter chains to simplify architecture.

**composition-fit** — Level 1
- Evidence: The chain does not use other chains internally and implements its own batch processing and retry logic, making it a standalone monolith rather than a composable pipeline step.
- Gap: Refactor to build on library primitives like map, filter, and retry chains to improve composability.
- Next: Extract batch window processing as a composition of existing chains to enable pipeline integration.

**design-efficiency** — Level 2
- Evidence: The 251 LOC and multiple internal imports indicate moderate complexity; some helper functions and bespoke retry and progress logic suggest the design could be more efficient.
- Gap: Simplify code by reducing helper functions and leveraging existing library utilities for retry and progress.
- Next: Refactor to minimize helper functions and reuse existing library components for common concerns.

**generalizability** — Level 4
- Evidence: The chain accepts natural language instructions and processes arbitrary text input with optional runtime dependencies, making it fully general and context-agnostic.

**strategic-value** — Level 3
- Evidence: extract-blocks is a core capability frequently needed in AI pipelines for processing unstructured text into structured blocks, enabling workflows like log analysis and event extraction that are otherwise complex.


#### Implementation Quality

**api-surface** — Level 2
- Evidence: Exports `extractBlocks` as default export, accepts config params `windowSize`, `overlapSize`, `maxParallel`, `maxAttempts`, `logger`, `llm`, `onProgress`, `now`
- Gap: No instruction builders or spec/apply split
- Next: Implement instruction builders and spec/apply function split

**browser-server** — Level 0
- Evidence: No imports or usage of `lib/env` or environment detection patterns
- Gap: No environment abstraction or detection for browser/server compatibility
- Next: Integrate `lib/env` usage to support isomorphic environment detection and handling

**code-quality** — Level 3
- Evidence: Clean separation of concerns, extracted pure functions like `buildBlockExtractionPrompt`, clear naming, no dead code
- Gap: Could improve with more explicit transformations and composable internals for reference-quality
- Next: Refactor to increase modularity and composability to reach reference-quality level

**composability** — Level 2
- Evidence: Exports single default function `extractBlocks`, no spec/apply split or instruction builders
- Gap: No spec/apply split or instruction builders to reach level 3
- Next: Refactor to export spec/apply functions and instruction builders

**documentation** — Level 3
- Evidence: README has Usage section with example code, Parameters section listing config params including windowSize, overlapSize, maxParallel
- Gap: Missing architecture section, edge cases, performance notes, composition guidance
- Next: Add comprehensive architecture and performance notes to README

**errors-retry** — Level 1
- Evidence: Imports `lib/retry` and uses `retry` function with default retry policy
- Gap: No input validation, no multi-level or conditional retry, no error context attachment
- Next: Implement input validation and enhanced retry strategies with error context

**events** — Level 3
- Evidence: Imports `lib/progress-callback`, calls `emitBatchStart`, `emitBatchProcessed`, and `emitBatchComplete`
- Gap: No phase-level event emissions for multi-phase operations
- Next: Add phase-level event emissions to support multi-phase lifecycle tracking

**logging** — Level 3
- Evidence: Imports `lib/lifecycle-logger`, uses `createLifecycleLogger`, calls `logStart`, `logResult`, and `info` methods on lifecycleLogger
- Gap: Missing full lifecycle logging features like `logConstruction`, `logProcessing`, `logEvent`, and child loggers
- Next: Implement additional lifecycle logging methods such as `logConstruction` and `logEvent` to reach level 4

**prompt-engineering** — Level 3
- Evidence: Uses asXML for variable wrapping in buildBlockExtractionPrompt (e.g., asXML(instructions, { tag: 'instructions' }) and asXML(numberedLines, { tag: 'window' })), uses a JSON schema response_format (blockExtractionSchema) in llmConfig, no explicit system prompt or temperature setting found, uses retry and parallelBatch utilities for robust LLM calls.
- Gap: No explicit system prompt or temperature tuning present.
- Next: Introduce a system prompt to set the LLM role and purpose, and tune temperature settings for better control.

**testing** — Level 2
- Evidence: Has `index.spec.js` with unit tests and `index.examples.js` with example tests, no aiExpect usage
- Gap: No aiExpect or property-based tests
- Next: Add aiExpect semantic validation tests to example tests

**token-management** — Level 1
- Evidence: No use of `createBatches` or token-budget-aware splitting; uses manual chunking by lines
- Gap: Lacks model-aware token budget management and automatic batching
- Next: Adopt `createBatches` or similar token-budget-aware batching to improve token management


### extract-features (standard)

#### Design Fitness

**architectural-fitness** — Level 4
- Evidence: The implementation is concise (71 LOC), uses existing library primitives (map, score), and has a clear, proportional design with sequential feature processing and lifecycle logging. It avoids reimplementing batch processing and has a clean top-level function.

**composition-fit** — Level 3
- Evidence: The chain composes existing library primitives (map, score) and exposes a clean function interface that can be used as a pipeline step. It orchestrates other chains but does not itself export spec/apply or instruction builders, so it is a strong but not full composition citizen.
- Gap: Expose spec/apply pattern or instruction builders to increase composability.
- Next: Refactor to export spec/apply functions or instruction builders to better integrate with library composition patterns.

**design-efficiency** — Level 4
- Evidence: At 71 LOC with a single export and minimal helper functions, the implementation is minimal and the design makes the implementation straightforward and obvious.

**generalizability** — Level 4
- Evidence: The chain accepts generic items and feature definitions with operations, uses natural language instructions, and has no hard dependencies on specific runtimes or data formats, making it fully general and context-agnostic.

**strategic-value** — Level 3
- Evidence: The chain extract-features is a core capability frequently needed in AI pipelines to extract multiple features from data items using existing chains like map and score. It enables workflows that combine multiple feature extractions in parallel, which is a common developer need.


#### Implementation Quality

**api-surface** — Level 2
- Evidence: Exports `extractFeatures` as named and default export, accepts config param `logger`
- Gap: No instruction builders or spec/apply split
- Next: Implement instruction builders and spec/apply split for composability

**browser-server** — Level 0
- Evidence: No use of `lib/env` or environment detection code
- Gap: Use `lib/env` for environment detection to support both browser and server
- Next: Refactor to use `lib/env` for environment reads instead of direct environment access

**code-quality** — Level 3
- Evidence: Clear function `extractFeatures`, well-structured sequential processing, descriptive variable names
- Gap: No explicit mention of composable internals or extracted pure functions
- Next: Extract pure functions for feature operation processing to improve composability

**composability** — Level 2
- Evidence: Composes other chains internally (map, score) as shown in README examples
- Gap: No exported spec/apply functions or instruction builders
- Next: Add spec/apply split exports and instruction builders

**documentation** — Level 3
- Evidence: README has API section with parameter table for extractFeatures(items, features, config), multiple examples including usage and design notes
- Gap: Missing architecture section, edge cases, performance notes, and composition guidance
- Next: Add comprehensive architecture and performance notes to README

**errors-retry** — Level 0
- Evidence: No error handling or retry logic observed
- Gap: Add basic retry logic using `lib/retry`
- Next: Implement retry with default 429-only policy using `lib/retry`

**events** — Level 0
- Evidence: No import of `lib/progress-callback`, no event emission code
- Gap: Add event emission using `lib/progress-callback`
- Next: Import and use `lib/progress-callback` to emit lifecycle events

**logging** — Level 4
- Evidence: Imports `lib/lifecycle-logger`, uses `createLifecycleLogger`, calls `logStart`, `logEvent`, `info`, `logResult`

**prompt-engineering** — Level 0
- Evidence: No prompt imports or usage of shared prompt utilities; no asXML wrapping; no promptConstants used; no system prompts; no temperature settings; no response_format usage; prompt is implemented as inline code without prompt engineering patterns.
- Gap: Use of asXML for variable wrapping to improve prompt structure.
- Next: Refactor prompt to use asXML for variable wrapping to reach level 1.

**testing** — Level 2
- Evidence: Has `index.examples.js` using `aiExpect`, no spec tests
- Gap: Missing unit tests covering edge cases and error paths
- Next: Add unit tests with edge case and error path coverage

**token-management** — Level 0
- Evidence: No use of `createBatches` or token budget management
- Gap: Implement token-budget-aware batching using `createBatches`
- Next: Integrate `createBatches` to manage token budgets for input processing


### filter (core)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: The chain has 239 lines of code spread over 2 files, which is proportional to the complexity of semantic filtering with batch processing, retry logic, and progress callbacks. It builds on existing primitives like listBatch and does not reimplement batch processing. The design is clean and the processing steps are clear from the top-level function.

**composition-fit** — Level 2
- Evidence: The filter chain exposes a clean function interface accepting items and instructions and returning filtered items, fitting well as a pipeline step. However, it does not internally compose other library chains like map or score, nor does it export spec/apply or instruction builders, limiting its composition integration.
- Gap: Increase internal use of library primitives and expose spec/apply pattern or instruction builders to enhance composability.
- Next: Refactor filter to leverage spec/apply pattern and provide instruction builders to enable richer composition with other chains.

**design-efficiency** — Level 3
- Evidence: At 239 lines with 2 files and moderate helper functions, the implementation is clean and proportional to the problem complexity. It uses retry, batching, and progress callbacks effectively without excessive complexity or workarounds.

**generalizability** — Level 3
- Evidence: The filter chain accepts natural language instructions and works with any text input. It has no hard dependencies on specific frameworks or data formats and is isomorphic (browser + Node.js).

**strategic-value** — Level 3
- Evidence: The filter chain is a core capability frequently needed in AI pipelines, enabling semantic filtering of arrays using natural language instructions. It is part of the core batch processing chains (map, filter, reduce, group, sort) which are high-value by definition.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports `filterOnce` only, no default export
- Gap: No instruction builders or spec/apply split exports
- Next: Implement instruction builders and spec/apply split exports to improve composability and API clarity

**browser-server** — Level 0
- Evidence: No usage of 'lib/env' or environment detection patterns found
- Gap: No environment abstraction or detection for browser/server
- Next: Integrate 'lib/env' usage to support isomorphic environment detection

**code-quality** — Level 3
- Evidence: Clean concern separation, isolated response format, clear naming conventions, no dead code, extracted pure functions like 'filterInstructions'
- Gap: Minor use of magic numbers in logging previews (e.g., 'substring(0, 50)', 'substring(0, 500)')
- Next: Replace magic numbers with named constants for clarity

**composability** — Level 2
- Evidence: Exports `filterOnce` only; no spec/apply split or instruction builders; composability capped at level 2 per ceiling
- Gap: Lacks spec/apply split functions and instruction builders
- Next: Introduce spec/apply split functions and instruction builders to enhance composability

**documentation** — Level 3
- Evidence: README has API section with parameter table documenting chain-specific config params `batchSize`, `maxParallel`, `listStyle`, `autoModeThreshold`, `responseFormat` and references shared config params `llm`, `maxAttempts`, `onProgress`, `now`, `logger`; multiple usage examples and behavioral notes present
- Gap: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- Next: Add architecture overview, edge case handling, performance considerations, and composition guidance to README

**errors-retry** — Level 2
- Evidence: Imports 'retry' from 'lib/retry' and uses it with a retry wrapper around 'listBatch' calls; input validation present via schema import; failure mode is rethrowing errors after retries exhausted
- Gap: No multi-level retry, conditional retry, or error context attached to results
- Next: Enhance retry strategy with conditional retry and attach error context to results

**events** — Level 3
- Evidence: Imports from 'lib/progress-callback' including 'emitBatchStart', 'emitBatchComplete', 'emitBatchProcessed', 'createBatchProgressCallback', 'createBatchContext' and calls these functions to emit batch-level events
- Gap: No phase-level events for multi-phase operations
- Next: Implement phase-level event emission for multi-phase operations if applicable

**logging** — Level 2
- Evidence: Accepts 'logger' config, uses 'logger?.info()' inline calls such as 'logger.info('Filter chain starting')', 'logger.info('Batches created')', 'logger.info(`Processing batch ${batchIndex}`)', 'logger.info(`Calling listBatch for batch ${batchIndex}`)', 'logger.info(`Batch ${batchIndex} response received`)', 'logger.info(`Batch ${batchIndex} processed`)', 'logger.info('Filter chain complete')'
- Gap: Does not use 'createLifecycleLogger' with 'logStart'/'logResult' framing
- Next: Refactor to use 'createLifecycleLogger' for structured lifecycle logging

**prompt-engineering** — Level 3
- Evidence: Uses asXML for variable wrapping in filterInstructions function ("${asXML(instructions, { tag: 'filtering-criteria' })}"). Uses responseFormat with JSON schema (filterResponseFormat) for structured output. Uses retry logic with listBatch call, passing prompt and options including llm and responseFormat. No explicit system prompt or temperature setting found in the source code, but response_format usage and JSON schema validation are present.
- Gap: Missing explicit system prompt and temperature tuning to reach level 4.
- Next: Introduce a system prompt to set the LLM role and purpose, and tune temperature or penalties for improved output control.

**testing** — Level 4
- Evidence: Has `index.spec.js` with unit tests and `index.examples.js` using `aiExpect`

**token-management** — Level 2
- Evidence: Uses 'createBatches' from 'lib/text-batch' for token-budget-aware splitting
- Gap: No model-aware budget calculation or proportional multi-value budget management
- Next: Implement model-aware budget calculation to improve token management


### filter-ambiguous (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: At 50 LOC, the chain is concise and focused; it builds on existing primitives like 'score' and 'list' chains without reimplementing batch processing; clear phases of scoring sentences, listing ambiguous terms, and rescoring terms.
- Gap: Minor simplifications possible but overall design is proportional and clean.
- Next: Document processing phases clearly to aid maintainability.

**composition-fit** — Level 3
- Evidence: Builds on library primitives 'score' and 'list' chains; does not reimplement batch processing; exposes a clean async function interface suitable for pipeline integration.
- Gap: Could expose spec/apply pattern or instruction builders to increase composability.
- Next: Refactor to provide instruction builders and spec/apply exports for better composition.

**design-efficiency** — Level 3
- Evidence: Implementation is concise (50 LOC) with no helper functions; uses existing chains to avoid duplication; no evident workarounds or complexity beyond problem scope.
- Gap: No significant gaps; design and implementation are well aligned.
- Next: Maintain current simplicity and monitor for complexity growth as features expand.

**generalizability** — Level 3
- Evidence: Operates on generic text input with natural language instructions; no hard dependencies on specific frameworks or data formats; uses optional LLM parameter.
- Gap: Could improve by supporting non-text data or more diverse input formats.
- Next: Add support for structured text inputs or metadata to enhance applicability.

**strategic-value** — Level 2
- Evidence: Provides a useful tool to identify ambiguous terms in text, enabling improved text clarity; moderate frequency expected as a specialized filter; enables workflows for ambiguity detection not trivial before.
- Gap: Increase generality and integration to broaden use cases beyond text ambiguity detection.
- Next: Explore expanding applicability to other data types or integrate with more pipelines.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default function filterAmbiguous, no named exports
- Gap: No documented named exports or instruction builders
- Next: Introduce named exports and document shared config destructuring

**browser-server** — Level 0
- Evidence: No use of 'lib/env' or environment detection, no browser/server compatibility code
- Gap: Use 'lib/env' for environment detection to support both browser and server
- Next: Integrate 'lib/env' and add environment checks for isBrowser/isNode

**documentation** — Level 2
- Evidence: README has basic description and example usage of filterAmbiguous(text, { topN: 3 })
- Gap: Missing API section with parameter table and shared config reference
- Next: Add detailed API section with parameter table and reference to shared config documentation

**errors-retry** — Level 0
- Evidence: No error handling or retry logic present
- Gap: Add basic retry with 'lib/retry' and error handling
- Next: Implement try/catch with retry logic using 'lib/retry'

**events** — Level 0
- Evidence: No import of 'lib/progress-callback', no event emission
- Gap: Accept 'onProgress' and emit standard lifecycle events
- Next: Add 'onProgress' callback and emit start/complete events

**logging** — Level 0
- Evidence: No import of 'lib/lifecycle-logger', no logger usage
- Gap: Add logger parameter and use 'logger?.info()' or lifecycle logger
- Next: Add a 'logger' config parameter and use it for inline info logging

**prompt-engineering** — Level 0
- Evidence: The chain 'filter-ambiguous' uses inline template literals for prompts such as 'How ambiguous or easily misinterpreted is this sentence?' and 'Score how ambiguous the term is within the sentence.' There are no imports from promptConstants, no use of asXML or other prompt helper modules, no system prompts, no temperature settings, and no response_format usage.
- Gap: Missing use of prompt helper utilities like asXML for variable wrapping, promptConstants for standardized prompt fragments, system prompts, temperature tuning, and response_format usage.
- Next: Refactor prompts to use asXML for variable wrapping and incorporate promptConstants to standardize prompt fragments.

**testing** — Level 2
- Evidence: Has index.spec.js with unit tests and index.examples.js without aiExpect
- Gap: No aiExpect coverage for semantic validation
- Next: Add aiExpect assertions in example tests for semantic validation

**token-management** — Level 1
- Evidence: Manual chunking by splitting text by '
' and slicing topN results
- Gap: Use 'createBatches' for token-budget-aware splitting
- Next: Replace manual chunking with 'createBatches' for token management


### find (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: At 195 LOC across 2 files, the design is clean and proportional to the problem complexity. It builds on existing primitives like listBatch and parallelBatch without bespoke infrastructure.

**composition-fit** — Level 2
- Evidence: The chain exposes a clean function interface and uses library primitives like listBatch internally, but does not itself expose spec/apply or instruction builders for further composition.
- Gap: Expose spec/apply pattern and instruction builders to integrate with other collection chains for full composition fit.
- Next: Refactor to provide spec/apply exports and instruction builders to enable composition with other chains.

**design-efficiency** — Level 3
- Evidence: The implementation is concise (195 LOC), uses a moderate number of imports, and the code structure is clear without excessive helpers or workarounds.

**generalizability** — Level 4
- Evidence: The chain accepts natural language instructions and works with any text array input, with no hard dependencies on specific runtimes or data formats, making it fully general and context-agnostic.

**strategic-value** — Level 3
- Evidence: The 'find' chain is a core capability frequently needed in AI pipelines for searching arrays with AI-powered reasoning. It enables natural language search over lists, a common and powerful feature.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default `find`, named export `findOnce`
- Gap: No documented instruction builders or spec/apply split
- Next: Implement and document instruction builders and spec/apply split exports

**browser-server** — Level 0
- Evidence: No import or usage of 'lib/env' or runtime environment detection
- Gap: Add environment detection using 'lib/env' to support both browser and server
- Next: Use 'lib/env' to detect environment and adapt behavior accordingly

**code-quality** — Level 3
- Evidence: Clear function separation, descriptive variable names, no dead code, use of extracted pure functions like createBatches, retry, parallelBatch
- Gap: Could improve with more explicit transformations and composable internals
- Next: Refactor to separate concerns further and enhance composability

**composability** — Level 2
- Evidence: Exports `findOnce` and default `find`, composes other chains internally (uses listBatch, createBatches, retry, parallelBatch) but no spec/apply split
- Gap: No spec/apply split functions or instruction builders for multiple chains
- Next: Introduce spec/apply split functions and instruction builders to improve composability

**documentation** — Level 3
- Evidence: README has API section with parameter table listing `array`, `criteria`, `config` with `chunkSize` and `llm`, multiple usage examples including Document Search
- Gap: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- Next: Add architecture overview, edge case handling, performance considerations, and composition guidance to README

**errors-retry** — Level 2
- Evidence: Imports retry from 'lib/retry' and uses retry with maxAttempts=3, continues on error without throwing
- Gap: No multi-level retry, conditional retry, or error context attached to results
- Next: Enhance retry strategy with conditional retry and attach error context to results

**events** — Level 3
- Evidence: Imports from 'lib/progress-callback' and calls to emitBatchStart, emitBatchProcessed, emitBatchComplete
- Gap: No phase-level events for multi-phase operations
- Next: Implement phase-level event emission using emitPhaseProgress or similar

**logging** — Level 0
- Evidence: No import of 'lib/lifecycle-logger' or usage of createLifecycleLogger or logger calls
- Gap: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- Next: Import 'lib/lifecycle-logger' and implement lifecycle logging with logStart and logResult calls

**testing** — Level 4
- Evidence: Has `index.spec.js` with unit tests and `index.examples.js` using `aiExpect`

**token-management** — Level 2
- Evidence: Uses createBatches from 'lib/text-batch' for token-budget-aware splitting
- Gap: No model-aware budget calculation or proportional multi-value budget management
- Next: Implement model-aware budgetTokens calculation and proportional budget management


### glossary (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: The chain is 112 LOC, uses existing map and sort chains for batch processing and ranking, and has clear phases: sentence splitting, batching, mapping, deduplication, and sorting.
- Gap: Minor simplifications possible but overall design is proportional and clean.
- Next: Refactor to expose spec/apply pattern for clearer intent and reuse.

**composition-fit** — Level 2
- Evidence: The chain uses map and sort internally but does not expose spec/apply or instruction builders, limiting its composability as a pipeline step.
- Gap: Refactor to follow spec/apply pattern and provide instruction builders to become a full composition citizen.
- Next: Implement spec generation and apply functions and export instruction builders for map and sort.

**design-efficiency** — Level 3
- Evidence: At 112 LOC with a single main export and no helper functions, the implementation is clean and proportional to the problem complexity.

**generalizability** — Level 4
- Evidence: The chain accepts any text input, uses natural language instructions, and depends only on general-purpose libraries (compromise, map, sort). It is runtime agnostic and context-agnostic.

**strategic-value** — Level 2
- Evidence: The glossary chain is a useful tool that extracts technical terms from text, enabling glossary sidebars for dense articles. It is moderately sized (112 LOC) and used in standard tier, indicating moderate frequency and real problem solving.
- Gap: Increase integration with other chains to enable more novel workflows.
- Next: Add spec/apply pattern and instruction builders to enhance composability and reuse.


#### Implementation Quality

**api-surface** — Level 2
- Evidence: Exports default glossary function; config params maxTerms, batchSize, overlap, chunkSize, sortBy destructured in function signature
- Gap: No instruction builders or spec/apply split exports
- Next: Implement instruction builders and spec/apply split exports to enhance API surface

**browser-server** — Level 0
- Evidence: No usage of `lib/env` or environment detection; uses only standard imports like `compromise` and local modules
- Gap: Use `lib/env` for environment detection to support both browser and server
- Next: Refactor environment checks to use `lib/env` proxy instead of direct environment assumptions

**documentation** — Level 3
- Evidence: README has API section with parameter table documenting chain-specific config params maxTerms, batchSize, overlap, chunkSize, sortBy; includes multiple examples and behavioral notes
- Gap: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- Next: Add architecture overview, edge case handling, performance considerations, and composition guidance to README

**errors-retry** — Level 0
- Evidence: No error handling or retry logic observed; no try/catch or use of `lib/retry`
- Gap: Add basic retry logic with `lib/retry` and error handling
- Next: Implement retry mechanism for transient errors using `lib/retry` with default policies

**events** — Level 0
- Evidence: No imports related to event emission such as `lib/progress-callback` and no event emission code
- Gap: Add event emission using `lib/progress-callback` with standard events
- Next: Accept `onProgress` callback and emit standard lifecycle events during processing

**logging** — Level 0
- Evidence: No imports related to logging such as `lib/lifecycle-logger` or usage of `createLifecycleLogger`
- Gap: Add lifecycle logging with `createLifecycleLogger` and use `logStart` and `logResult`
- Next: Import `lib/lifecycle-logger` and instrument main functions with lifecycle logging calls

**prompt-engineering** — Level 3
- Evidence: The chain uses a response_format with a JSON schema (GLOSSARY_RESPONSE_FORMAT) for structured output, as seen in the map call. It uses a system prompt style instruction embedded in the 'instructions' template literal. Temperature is not explicitly set, so default is used. No promptConstants or asXML wrapping are used.
- Gap: No use of promptConstants, asXML wrapping, or temperature tuning to reach level 4.
- Next: Introduce promptConstants usage and asXML wrapping for variables, and tune temperature settings for improved prompt control.

**testing** — Level 3
- Evidence: Has index.spec.js with unit tests and index.examples.js using aiExpect
- Gap: No property-based or regression tests
- Next: Add property-based and regression tests to improve test coverage

**token-management** — Level 1
- Evidence: Manual chunking of text into batches by sentence count (batchSize) without use of `createBatches` or token budget awareness
- Gap: Implement token-budget-aware batching using `createBatches` from `lib/text-batch`
- Next: Replace manual sentence batching with `createBatches` to manage token budgets automatically


### group (core)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: At 247 LOC, the chain has a clean design proportional to the problem complexity. It clearly separates the two phases (category discovery and assignment) and builds on existing primitives like reduce and parallelBatch without bespoke infrastructure.

**composition-fit** — Level 2
- Evidence: The chain composes existing library primitives such as reduce, parallelBatch, and listBatch, but does not expose spec/apply or instruction builders for other chains. It works as a pipeline step but is not a full composition citizen enabling novel workflows.
- Gap: Expose spec/apply pattern and instruction builders to integrate with other collection chains.
- Next: Refactor to provide spec/apply exports and instruction builders for better composability.

**design-efficiency** — Level 3
- Evidence: The implementation is efficient with 247 LOC and moderate helper functions. It uses existing library utilities for batching, retry, and progress reporting, avoiding duplicated logic or excessive complexity.

**generalizability** — Level 4
- Evidence: The chain accepts natural language instructions and works with any text input list, with no hard dependencies on specific runtimes or data formats. It is isomorphic and context-agnostic, suitable for broad use cases.

**strategic-value** — Level 3
- Evidence: The 'group' chain is a core batch processing chain with 247 LOC, used to organize arrays into logical groups via AI-powered categorization. It enables workflows that developers frequently need in AI pipelines, such as categorization and grouping, which were previously impractical at scale.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default 'group' function only, no instruction builders or spec/apply split
- Gap: No instruction builders or spec/apply split exports
- Next: Implement and export instruction builders and spec/apply split functions to improve composability

**browser-server** — Level 0
- Evidence: No import or usage of 'lib/env' or environment abstraction; no evidence of isomorphic environment handling.
- Gap: Add environment abstraction using 'lib/env' to support both browser and server environments.
- Next: Refactor environment-dependent code to use 'lib/env' for isomorphic compatibility.

**composability** — Level 2
- Evidence: Composes other chains internally (uses 'reduce', 'listBatch', 'parallelBatch' chains), but no spec/apply split or instruction builders exported
- Gap: No exported spec/apply split functions or instruction builders
- Next: Export spec/apply split functions and instruction builders to reach level 3 composability

**documentation** — Level 3
- Evidence: README has API section with parameter table listing 'topN', 'categoryPrompt', shared config reference to 'llm', 'maxAttempts', 'onProgress', 'now', multiple usage examples, and behavioral notes
- Gap: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- Next: Add architecture overview, edge case handling, performance considerations, and composition guidance to README

**errors-retry** — Level 1
- Evidence: Imports 'lib/retry' and uses 'retry()' with default retry policy for batch calls.
- Gap: No input validation, no multi-level or conditional retry, no error context attached.
- Next: Add input validation and enhance retry logic with conditional retry and error context attachment.

**events** — Level 4
- Evidence: Imports 'lib/progress-callback' and uses 'emitPhaseProgress', 'emitBatchStart', 'emitBatchProcessed', 'emitBatchComplete' indicating phase-level and batch-level event emission.

**logging** — Level 2
- Evidence: Imports do not include 'lib/lifecycle-logger', but the chain accepts a 'logger' config parameter and uses 'logger?.info()' inline as per rubric example for level 2.
- Gap: Does not use 'createLifecycleLogger' with 'logStart'/'logResult' framing.
- Next: Integrate 'createLifecycleLogger' and use 'logStart' and 'logResult' for structured lifecycle logging.

**prompt-engineering** — Level 2
- Evidence: Uses asXML for variable wrapping from '../../prompts/wrap-variable.js'. Extracted prompt builder functions like createCategoryDiscoveryPrompt and createAssignmentInstructions are used. The chain uses promptConstants indirectly by importing prompts, though specific constants are not explicitly named in the source. Temperature settings are not explicitly set, implying default usage. No system prompts or response_format usage detected.
- Gap: Missing system prompts, explicit temperature tuning, and response_format usage with JSON schemas to reach level 3.
- Next: Introduce system prompts and define response_format with JSON schemas for output structuring.

**testing** — Level 4
- Evidence: Has 'index.spec.js' with unit tests, 'index.examples.js' using 'aiExpect' for semantic validation

**token-management** — Level 2
- Evidence: Uses 'createBatches' from 'lib/text-batch' for token-budget-aware splitting.
- Gap: Does not implement model-aware budget calculation or proportional multi-value budget management.
- Next: Implement model-aware budget calculation and proportional multi-value budget management.


### intersections (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: Code is 257 LOC, proportional to problem complexity; uses existing primitives like commonalities and combinations; clear phases in processing combinations and batching.
- Gap: Minor complexity in batch processing could be simplified further.
- Next: Review batch processing logic for simplification opportunities.

**composition-fit** — Level 2
- Evidence: Does not expose spec/apply pattern; uses other chains internally (commonalities) but is a black box; batch processing is implemented internally rather than composed from primitives.
- Gap: Refactor to use and expose library's spec/apply and instruction builder patterns for full composition.
- Next: Modularize chain to separate spec generation and application, enabling composition with other chains.

**design-efficiency** — Level 3
- Evidence: 257 LOC with a single main export; uses helper functions appropriately; no excessive complexity or workarounds noted.
- Gap: Could reduce LOC by leveraging more existing primitives for batch processing.
- Next: Refactor batch processing to reuse existing library batch primitives to reduce code size.

**generalizability** — Level 4
- Evidence: Accepts arbitrary category arrays and natural language instructions; no hard dependencies on specific runtimes or data formats; uses standard LLM calls.

**strategic-value** — Level 3
- Evidence: Enables intersection analysis across multiple categories with AI reasoning, supporting workflows that require complex multi-category insights; used in standard tier with 257 LOC, indicating moderate complexity and utility.
- Gap: Could increase frequency of use by integrating more tightly with other core chains or exposing spec/apply patterns.
- Next: Refactor to expose spec/apply interfaces to enhance composability and reuse.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default `intersections` only, no named exports or instruction builders
- Gap: No instruction builders or spec/apply split
- Next: Introduce instruction builders and split spec/apply functions to enhance API surface

**browser-server** — Level 0
- Evidence: No import or usage of 'lib/env' or runtime environment detection
- Gap: Use 'lib/env' for environment detection to support isomorphic operation
- Next: Add 'lib/env' import and replace direct environment checks with env proxy usage

**code-quality** — Level 3
- Evidence: Clear function separation (processCombo, createModelOptions, validateIntersectionResults), consistent naming, no dead code
- Gap: Further modularization and composability for reference-quality implementation
- Next: Refactor to extract smaller composable units and improve documentation for reference quality

**composability** — Level 2
- Evidence: No spec/apply split or instruction builders, but composes other chains internally (e.g., uses `commonalities` chain)
- Gap: Lacks spec/apply split and instruction builders for composability
- Next: Implement spec/apply split and instruction builders to improve composability

**documentation** — Level 3
- Evidence: README has API section with `intersections(categories, config)`, multiple usage examples, and detailed features
- Gap: Missing architecture section, edge cases, performance notes, and composition guidance
- Next: Add comprehensive architecture and performance documentation, including edge cases and composition guidance

**errors-retry** — Level 1
- Evidence: Imports 'lib/retry' and uses retry() with default 429-only policy, no custom error handling or validation
- Gap: Add input validation and defined failure modes beyond basic retry
- Next: Implement input validation and enhanced retry strategies with error context

**events** — Level 1
- Evidence: Imports 'onProgress' config param and passes it through to retry and commonalities calls, but no direct event emission
- Gap: Emit standard lifecycle events (start, complete, step) using lib/progress-callback
- Next: Integrate event emission calls like emitStart, emitComplete around processing steps

**logging** — Level 0
- Evidence: No import of 'lib/lifecycle-logger' or usage of createLifecycleLogger or logger methods
- Gap: Add lifecycle logging with createLifecycleLogger and logStart/logResult calls
- Next: Import 'lib/lifecycle-logger' and implement structured lifecycle logging in the chain

**prompt-engineering** — Level 3
- Evidence: Uses asXML for variable wrapping (asXML(categories.join(' | '), { tag: 'categories' })), uses promptConstants (asJSON, asWrappedArrayJSON, strictFormat, contentIsQuestion), employs response_format with JSON schemas in llmConfig (type: 'json_schema', json_schema: intersectionElementsSchema), and uses retry with callLlm for LLM calls. No explicit system prompt or temperature tuning observed.
- Gap: Missing system prompt usage and explicit temperature tuning to reach level 4.
- Next: Introduce system prompts to set LLM behavior and tune temperature or penalties for improved response control.

**testing** — Level 2
- Evidence: Has `index.examples.js` with example tests using `aiExpect`, no spec tests
- Gap: No unit tests covering edge cases or error paths
- Next: Add unit tests with edge case and error path coverage alongside existing example tests

**token-management** — Level 0
- Evidence: No usage of 'lib/text-batch' or createBatches for token budget management
- Gap: Implement token-budget-aware batching using createBatches
- Next: Integrate 'lib/text-batch' createBatches to manage token budgets in batch processing


### join (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: At 151 lines, the chain has a clean design proportional to the problem, with clear phases: windowing, per-window merging, and stitching. It uses existing utilities like windowFor and retry without unnecessary abstractions.

**composition-fit** — Level 2
- Evidence: The chain uses library utilities like windowFor and retry but does not build on core batch processing chains (map, filter, reduce) or spec/apply patterns, and acts as a pipeline step rather than a full composition citizen.
- Gap: Refactor to leverage existing batch processing chains and spec/apply patterns to improve composability.
- Next: Decompose join into smaller chains using map and reduce primitives to enable composition with other library chains.

**design-efficiency** — Level 3
- Evidence: With 151 lines and limited helper functions, the implementation is clean and proportional to the complexity of windowed AI merging and stitching logic.

**generalizability** — Level 4
- Evidence: The chain accepts natural language instructions and works with any text fragments, with no hard dependencies on specific runtimes or data formats, making it fully general and context-agnostic.

**strategic-value** — Level 3
- Evidence: The join chain is a core capability frequently needed in AI pipelines for merging text fragments into coherent narratives, enabling workflows like document synthesis and story merging that were previously impractical.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default function 'join' only, no named exports or instruction builders
- Gap: No instruction builders or spec/apply split exports
- Next: Introduce instruction builders and split spec/apply functions to enhance API composability

**browser-server** — Level 0
- Evidence: No import or usage of 'lib/env' or runtime environment detection
- Gap: Use 'lib/env' for environment reads to support both browser and server
- Next: Refactor to use 'lib/env' for environment detection instead of direct Node/browser assumptions

**code-quality** — Level 3
- Evidence: Clear function structure, extracted pure functions (e.g., retry calls), descriptive variable names, no dead code
- Gap: Could improve separation of concerns and composability for reference-quality
- Next: Refactor to separate orchestration and processing logic into composable units

**documentation** — Level 3
- Evidence: README has API section 'join(fragments, prompt, config)' with parameter table including 'windowSize', 'overlapPercent', 'styleHint', 'maxRetries', references shared config 'llm', 'onProgress', 'now', multiple usage examples, and behavioral notes on windowed processing and stitching
- Gap: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- Next: Add detailed architecture overview, edge case handling, performance considerations, and guidance on composing with other chains

**errors-retry** — Level 1
- Evidence: Imports 'lib/retry' and uses retry() with maxRetries parameter, basic retry implementation
- Gap: Add input validation and defined failure modes beyond basic retry
- Next: Implement input validation and handle failure modes explicitly

**events** — Level 1
- Evidence: Imports 'onProgress' config param and passes it to retry calls, but no direct event emission
- Gap: Emit standard events (start, complete, step) via progress-callback
- Next: Use 'lib/progress-callback' to emit standard lifecycle events

**logging** — Level 0
- Evidence: No import of 'lib/lifecycle-logger', no usage of createLifecycleLogger or logger calls
- Gap: Accepts 'logger' config and uses logger?.info() inline
- Next: Add 'logger' parameter and use logger?.info() for inline logging

**prompt-engineering** — Level 0
- Evidence: The join chain uses inline template literals for prompt construction, e.g., the 'instruction' variable is built via string interpolation combining the 'prompt' parameter, optional 'styleHint', and fragment lists. There is no usage of shared prompt utilities such as promptConstants or asXML wrapping. No system prompts, temperature settings, or response_format usage are present. The chain directly calls callLlm with constructed prompt strings and uses retry for robustness.
- Gap: Missing use of shared prompt utilities like promptConstants, asXML wrapping, system prompts, temperature tuning, and response_format usage.
- Next: Refactor prompt construction to use shared promptConstants and asXML for variable wrapping to improve maintainability and prompt engineering maturity.

**testing** — Level 4
- Evidence: Has 'index.spec.js' with unit tests, 'index.examples.js' using 'aiExpect' for semantic validation

**token-management** — Level 0
- Evidence: No usage of 'lib/text-batch' or 'createBatches' for token-budget-aware splitting
- Gap: Implement token-budget-aware batching using 'createBatches'
- Next: Integrate 'createBatches' to manage token budgets for input splitting


### list (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: At 220 lines of code, the chain has a clean design proportional to the problem complexity. It uses retry logic and streaming generation appropriately without unnecessary abstractions. The processing steps are clear from the top-level function.

**composition-fit** — Level 2
- Evidence: The chain exposes a clean function interface (generateList) that can be used as a pipeline step. However, it does not build on the library's core primitives like map, filter, or reduce internally, nor does it export spec/apply patterns, limiting its composability.
- Gap: Refactor to build on existing batch processing chains and adopt spec/apply pattern to improve composability.
- Next: Decompose the chain to use map/filter primitives and export spec/apply interfaces for integration with other chains.

**design-efficiency** — Level 3
- Evidence: The implementation is efficient and clean with LOC proportional to the problem complexity. It uses a manageable number of helper functions and imports, and the code structure supports streaming and retry without excessive complexity.

**generalizability** — Level 4
- Evidence: The chain accepts natural language prompts and works with any text input, with no hard dependencies on specific frameworks or data formats. It is isomorphic and context-agnostic, suitable for broad use cases.

**strategic-value** — Level 3
- Evidence: The 'list' chain is a core capability frequently used in AI pipelines for generating contextual lists from natural language prompts, enabling workflows like brainstorming and streaming generation. It is widely applicable across domains as shown in the README use cases.


#### Implementation Quality

**api-surface** — Level 2
- Evidence: Exports `generateList` with documented config params `shouldSkip`, `shouldStop`, `model`, `maxAttempts`, `onProgress`, `now`, `_schema`, `llm`, `schema`
- Gap: Missing instruction builders and spec/apply split
- Next: Implement instruction builders and spec/apply function split for composability

**browser-server** — Level 0
- Evidence: No import or usage of 'lib/env' or runtime environment detection
- Gap: Use 'lib/env' for environment reads to support both browser and server
- Next: Refactor to use 'lib/env' for environment detection instead of direct process.env usage

**code-quality** — Level 3
- Evidence: Clean code with clear naming, extracted pure functions like createModelOptions, no dead code, consistent camelCase naming
- Gap: Further separation of concerns and composable internals for reference-quality
- Next: Refactor to improve composability and explicit transformations for reference-quality code

**composability** — Level 2
- Evidence: No spec/apply split exports; chain composes internally via `generateList` generator function
- Gap: Lacks spec/apply split and instruction builders
- Next: Add spec/apply split functions and instruction builders to improve composability

**documentation** — Level 4
- Evidence: README has API Reference section with detailed `list(prompt, config)` and `generateList(prompt, options)` descriptions, multiple usage examples including streaming and custom control logic, and structured output with schema

**errors-retry** — Level 1
- Evidence: Imports 'lib/retry' and uses retry() with default 429-only policy, basic try/catch around retry calls
- Gap: Add input validation, defined failure modes, and enhanced retry strategies
- Next: Implement input validation and conditional retry policies with error context

**events** — Level 1
- Evidence: Imports 'onProgress' in config and passes it through to retry calls but does not emit events directly
- Gap: Emit standard lifecycle events (start, complete, step) via progress-callback
- Next: Implement event emission using 'lib/progress-callback' to emit start and complete events

**logging** — Level 0
- Evidence: No import of 'lib/lifecycle-logger', no usage of createLifecycleLogger or logger.info
- Gap: Add lifecycle logger usage with logStart and logResult
- Next: Import 'lib/lifecycle-logger' and use createLifecycleLogger with logStart and logResult calls

**prompt-engineering** — Level 3
- Evidence: Uses imported prompt constants: onlyJSON, onlyJSONArray, contentIsTransformationSource from prompts/constants.js; uses prompt builder functions: asObjectWithSchemaPrompt, generateListPrompt from prompts/index.js; applies response_format with JSON schema (listResultSchema) in createModelOptions; uses retry wrapper for callLlm with structured prompts; constructs prompts with template literals combining constants and prompt builders; no explicit system prompt or temperature tuning observed; response_format is consistently applied for structured output.
- Gap: No explicit system prompt usage or temperature tuning; lacks multi-stage prompt pipelines and advanced tuning like frequency/presence penalties.
- Next: Introduce system prompts and temperature tuning to refine model behavior and consider multi-stage prompt pipelines for complex tasks.

**testing** — Level 4
- Evidence: Has `index.spec.js` with unit tests and `index.examples.js` using `aiExpect` for semantic validation

**token-management** — Level 0
- Evidence: No usage of 'lib/text-batch' or createBatches for token-budget-aware splitting
- Gap: Implement token-budget-aware input chunking using createBatches
- Next: Integrate 'lib/text-batch' createBatches to manage token budgets for inputs


### llm-logger (standard)

#### Design Fitness

**architectural-fitness** — Level 2
- Evidence: The module is large (652 LOC) and implements a bespoke ring buffer and parallel processing system rather than building on existing library primitives like map, filter, or reduce. This bespoke infrastructure adds complexity beyond the core idea of enhanced logging.
- Gap: Refactor to leverage existing batch processing chains and reduce bespoke coordination layers.
- Next: Extract batch processing logic to use core map/filter/reduce chains where possible.

**composition-fit** — Level 1
- Evidence: The module does not build on the library's core batch processing chains but implements its own ring buffer and processing orchestration. It is a standalone monolith without exposing composable primitives.
- Gap: Redesign to express processing as compositions of existing chains (map, filter, reduce) and expose spec/apply patterns.
- Next: Refactor to integrate with library's composition primitives and expose composable interfaces.

**design-efficiency** — Level 1
- Evidence: At 652 LOC with a single main export and multiple internal helpers, the module shows significant complexity and bespoke infrastructure. The many config parameters and custom ring buffer suggest the design is fighting the implementation.
- Gap: Simplify design by reducing bespoke infrastructure and leveraging existing library abstractions.
- Next: Reduce internal complexity by adopting core library primitives and simplifying configuration.

**generalizability** — Level 3
- Evidence: The design is general purpose for AI/LLM logging enhancement, using NDJSON and batch processing without hard dependencies on specific frameworks or runtimes. It can be adapted across domains needing enhanced logging.

**strategic-value** — Level 3
- Evidence: The llm-logger module provides an advanced logging system with AI enrichment capabilities, enabling developers to enhance logs with LLM-powered processors. It supports parallel processing, non-destructive enhancements, and batch NDJSON processing, which are valuable for AI/LLM applications. It is a core capability frequently needed in AI pipelines for logging and analysis.


#### Implementation Quality

**api-surface** — Level 2
- Evidence: Exports initLogger, log, createConsoleWriter, createFileWriter, createHostLoggerIntegration, createLLMLogger; README documents config params ringBufferSize, lanes, processors, flushInterval, immediateFlush, hostLogger
- Gap: No instruction builders or spec/apply split present
- Next: Implement instruction builders and spec/apply function split for API surface enhancement

**browser-server** — Level 0
- Evidence: No import or usage of 'lib/env' or runtime environment detection; no browser/server environment handling
- Gap: Use 'lib/env' for environment detection to support both browser and server
- Next: Integrate 'lib/env' and add environment checks for isBrowser and isNode

**code-quality** — Level 3
- Evidence: Clean code with clear naming, extracted pure functions like setAtPath, getAtPath, logsToNDJSON; no dead code; well-structured processing loops
- Gap: Further separation of concerns and composability could be improved
- Next: Refactor to separate concerns more explicitly and enhance composability of internals

**composability** — Level 2
- Evidence: Exports multiple factory functions like createConsoleWriter, createFileWriter, createHostLoggerIntegration; no spec/apply split or instruction builders
- Gap: Missing spec/apply function split and instruction builders for higher composability
- Next: Introduce spec/apply split functions and instruction builders to improve composability

**documentation** — Level 3
- Evidence: README has Basic Usage, Parameters, Return Value, Key Features, Log Processors, Lane Configuration, Advanced Usage sections with multiple code examples and behavioral notes
- Gap: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- Next: Add detailed architecture overview, edge case handling, performance considerations, and guidance on composition in README

**errors-retry** — Level 0
- Evidence: No import or usage of 'lib/retry'; error handling limited to try/catch in processor loop with simple retry via setTimeout
- Gap: Adopt structured retry logic with 'lib/retry' and defined failure modes
- Next: Use 'lib/retry' for robust retry strategies and improve error handling with custom error types

**events** — Level 0
- Evidence: No import of 'lib/progress-callback' and no event emission functions detected
- Gap: Add event emission using 'lib/progress-callback' with standard events
- Next: Import 'lib/progress-callback' and emit standard lifecycle events like start, complete, step

**logging** — Level 0
- Evidence: Imports 'lib/logger' but does not import 'lib/lifecycle-logger'; no usage of createLifecycleLogger or logStart/logResult
- Gap: Implement lifecycle logging using 'lib/lifecycle-logger' with logStart/logResult
- Next: Integrate 'lib/lifecycle-logger' and use createLifecycleLogger for structured lifecycle logging

**testing** — Level 2
- Evidence: Has index.spec.js with unit tests and index.examples.js with example tests; no aiExpect usage
- Gap: Lacks aiExpect coverage for semantic validation
- Next: Add aiExpect assertions in example tests to enhance test coverage and semantic validation

**token-management** — Level 0
- Evidence: No import or usage of 'lib/text-batch' or createBatches; no token budget management observed
- Gap: Implement token-budget-aware batching using 'lib/text-batch' createBatches
- Next: Integrate 'lib/text-batch' and use createBatches for token-aware input splitting


### map (core)

#### Design Fitness

**architectural-fitness** — Level 2
- Evidence: At 306 lines, the chain is moderately complex but includes bespoke batch processing, retry logic, and progress callbacks. It does not build on other library chains internally, indicating some unnecessary complexity and potential for simplification.
- Gap: Refactor to leverage existing library primitives for batch processing and retry to reduce bespoke infrastructure.
- Next: Extract batch processing and retry logic into reusable primitives or compose existing chains to simplify architecture.

**composition-fit** — Level 1
- Evidence: The chain does not use other chains internally and implements its own batch processing and retry logic, indicating it is a standalone monolith rather than a composition citizen.
- Gap: Redesign to build on existing library primitives (map, filter, reduce) and expose composable interfaces.
- Next: Refactor to express batch processing as a composition of existing chains and expose spec/apply patterns for integration.

**design-efficiency** — Level 2
- Evidence: With 306 lines and multiple internal helper imports, the implementation is moderately complex but mostly proportional to the problem complexity. Some complexity arises from bespoke retry and progress logic.
- Gap: Simplify by reducing bespoke logic and helper functions through reuse of existing abstractions.
- Next: Consolidate helper functions and reuse library utilities to streamline implementation.

**generalizability** — Level 3
- Evidence: The chain accepts natural language instructions and processes generic string lists without hard dependencies on specific runtimes or data formats, making it broadly applicable across domains.

**strategic-value** — Level 3
- Evidence: The map chain is a core capability frequently used in AI pipelines, as indicated by its role as a batch processing primitive and its presence in the core tier. It enables batch processing with retry and parallelism, supporting workflows that are common and essential.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports 'mapOnce' only, no default export, no instruction builders or spec/apply split
- Gap: No instruction builders or spec/apply split to reach level 2+
- Next: Implement instruction builders and spec/apply split exports

**browser-server** — Level 0
- Evidence: No usage of `lib/env` or environment detection patterns found in source code.
- Gap: No environment abstraction or detection for browser/server compatibility.
- Next: Integrate `lib/env` usage to detect runtime environment and enable isomorphic support.

**composability** — Level 2
- Evidence: Exports 'mapOnce' only; composability ceiling is level 2 as per deterministic ceiling; no spec/apply split or instruction builders
- Gap: No spec/apply split or instruction builders to reach level 3
- Next: Refactor to export spec/apply split functions and instruction builders to improve composability

**documentation** — Level 3
- Evidence: README has API section with parameter table listing 'batchSize', 'maxParallel', 'listStyle', 'autoModeThreshold', and references shared config params 'llm', 'maxAttempts', 'onProgress', 'now', 'logger'; multiple examples including usage and integration examples
- Gap: Missing architecture section, edge cases, performance notes, and composition guidance
- Next: Add comprehensive architecture and performance notes, edge case handling, and composition guidance to README

**errors-retry** — Level 3
- Evidence: Imports `retry` from `lib/retry`. Uses `retry()` for batch calls with maxAttempts. Implements multi-level retry: batch retry via `retry()`, item-level retry by retrying undefined items. Logs errors with `logger.error` before marking items undefined.
- Gap: No custom error types or structured error vocabulary with attached logs.
- Next: Define custom error classes and attach structured context and logs to errors for better observability.

**events** — Level 3
- Evidence: Imports from `lib/progress-callback`: `emitBatchStart`, `emitBatchComplete`, `emitBatchProcessed`, `createBatchProgressCallback`, `createBatchContext`. Calls `emitBatchStart`, `emitBatchProcessed`, `emitBatchComplete` with `onProgress` callback.
- Gap: No phase-level event emission for multi-phase operations.
- Next: Add phase-level event emissions to support multi-phase lifecycle tracking.

**logging** — Level 3
- Evidence: Imports `createLifecycleLogger` from `lib/lifecycle-logger`, uses `createLifecycleLogger(logger, 'chain:map')`, calls `logStart`, `logEvent`, `logResult` methods on lifecycleLogger.
- Gap: Missing full lifecycle logging features like `logConstruction`, child loggers.
- Next: Implement `logConstruction` and child loggers for full lifecycle coverage.

**prompt-engineering** — Level 1
- Evidence: Uses asXML for variable wrapping in the compiled prompt: asXML(instructions, { tag: 'transformation-instructions' }). The prompt is constructed as a template literal with embedded XML-wrapped instructions. No use of promptConstants, system prompts, temperature settings, or response_format detected. The chain uses shared prompt utility 'asXML' from prompts/wrap-variable.js.
- Gap: Missing extracted prompt builder functions and promptConstants usage to reach level 2.
- Next: Refactor prompt construction to use extracted prompt builder functions and incorporate promptConstants for reusable prompt fragments.

**testing** — Level 2
- Evidence: Has 'index.spec.js' with unit tests and 'index.examples.js' example tests; no aiExpect usage
- Gap: No aiExpect or property-based tests to reach level 3+
- Next: Add aiExpect semantic validation tests and cover edge cases

**token-management** — Level 2
- Evidence: Uses `createBatches` from `lib/text-batch` for token-budget-aware splitting of input list.
- Gap: No model-aware budget calculation or proportional multi-value budget management.
- Next: Implement model-aware token budget calculations and proportional budget management.


### people (standard)

#### Design Fitness

**architectural-fitness** — Level 4
- Evidence: The chain is concise (76 LOC across 2 files) and focused on a single responsibility: generating people profiles via LLM calls. It uses existing library functions (callLlm, retry) without reimplementing batch processing or scoring. The design is proportional and clear from the top-level function.

**composition-fit** — Level 1
- Evidence: The chain does not currently use or expose the library's core composition primitives (map, filter, reduce) or spec/apply patterns. It is a standalone function that calls the LLM directly and returns results, limiting its composability within the library.
- Gap: Refactor to use spec/apply pattern and integrate with batch processing chains to enable composition.
- Next: Extract specification generation and application phases to align with library composition patterns.

**design-efficiency** — Level 4
- Evidence: The implementation is minimal (76 LOC), with no unnecessary complexity or helper functions. It leverages existing library utilities effectively, resulting in clean and efficient code proportional to the problem complexity.

**generalizability** — Level 4
- Evidence: The chain accepts natural language descriptions and returns JSON objects representing people, making it adaptable to various contexts. It has no hard dependencies on specific runtimes or data formats and uses isomorphic LLM calls.

**strategic-value** — Level 2
- Evidence: The 'people' chain is a useful tool for generating artificial person profiles with consistent demographics and traits, enabling workflows like persona creation and test data generation. It is moderately sized (76 LOC) and used in standard tier, indicating moderate frequency and utility. However, it does not unlock entirely new workflows compared to core primitives like map or filter.
- Gap: Increase integration with other chains to enable more complex AI workflows involving personas.
- Next: Develop spec/apply pattern and instruction builders to allow composition with other collection chains.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default function `people` only, accepts shared config param `llm`.
- Gap: No instruction builders or spec/apply split exports.
- Next: Introduce instruction builders or spec/apply split exports to enhance API surface.

**browser-server** — Level 0
- Evidence: No usage of 'lib/env' or runtime environment detection; no browser/server compatibility code
- Gap: Use 'lib/env' for environment detection to support both browser and server
- Next: Refactor to use 'lib/env' for environment reads instead of direct Node or browser APIs

**code-quality** — Level 2
- Evidence: Clean, clear naming, no dead code, extracted pure functions (peopleList, retry wrapper), no magic numbers
- Gap: Improve structure by separating concerns and adding composable internals
- Next: Refactor to separate orchestration and core logic into smaller functions

**composability** — Level 1
- Evidence: Single default export `people` function, no spec/apply split or instruction builders.
- Gap: No internal composition of other chains or spec/apply split exports.
- Next: Refactor to expose spec/apply split functions or compose other chains internally to reach level 2 or higher.

**documentation** — Level 3
- Evidence: README has API section with parameter table for `people(description, count, config)`, multiple usage examples including LLM conversation roles, test data generation, user research personas, and scenario planning.
- Gap: Missing architecture section, edge cases, performance notes, and composition guidance.
- Next: Add comprehensive documentation covering architecture, edge cases, performance considerations, and guidance on composition with other chains.

**errors-retry** — Level 1
- Evidence: Imports 'lib/retry' and uses retry() with default 429-only policy
- Gap: Add input validation, defined failure modes, and error context attachment
- Next: Implement input validation and enhanced error handling with retry failure modes

**events** — Level 0
- Evidence: No import of 'lib/progress-callback' or calls to emit events
- Gap: Implement event emission using 'lib/progress-callback' and emit standard lifecycle events
- Next: Add 'onProgress' config and emit start/complete events during processing

**logging** — Level 0
- Evidence: No import of 'lib/lifecycle-logger' or usage of createLifecycleLogger or logger calls
- Gap: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- Next: Import 'lib/lifecycle-logger' and implement lifecycle logging in peopleList function

**prompt-engineering** — Level 3
- Evidence: Uses asXML for variable wrapping (asXML(description, { tag: 'description' })), uses response_format with JSON schema (response_format: { type: 'json_schema', json_schema: peopleListJsonSchema }), no explicit system prompt or temperature setting noted, uses shared utility 'asXML' from prompts/wrap-variable.js.
- Gap: Missing explicit system prompt and temperature tuning to reach level 4.
- Next: Add a system prompt to set context and tune temperature or penalties for improved control.

**testing** — Level 4
- Evidence: Has `index.spec.js` with unit tests and `index.examples.js` using `aiExpect`.

**token-management** — Level 0
- Evidence: No usage of 'lib/text-batch' or createBatches for token budget management
- Gap: Implement token-budget-aware batching using createBatches
- Next: Integrate 'lib/text-batch' createBatches to manage token budgets for input prompts


### pop-reference (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: At 132 LOC and a single file, the design is clean and proportional to the problem complexity. It does not reimplement batch processing or scoring primitives and has clear phases in the main function.
- Next: Maintain current architecture; consider minor refactors if complexity grows.

**composition-fit** — Level 1
- Evidence: The chain does not use other chains internally and lacks spec/apply pattern exports, making it a standalone utility rather than a composable pipeline step.
- Gap: Refactor to expose spec/apply pattern and build on existing library primitives like map or score.
- Next: Redesign pop-reference to integrate with core batch processing chains and expose instruction builders for composition.

**design-efficiency** — Level 3
- Evidence: With 132 LOC and limited helper functions, the implementation is efficient and proportional to the problem complexity without unnecessary complexity or workarounds.
- Next: Keep implementation minimal and clear as features evolve.

**generalizability** — Level 3
- Evidence: The chain accepts natural language instructions and works with any text input without hard dependencies on specific runtimes or data formats, making it general purpose across domains.
- Next: Ensure continued abstraction from specific contexts to maintain generalizability.

**strategic-value** — Level 1
- Evidence: The pop-reference chain is a niche utility with 132 LOC, providing metaphorical pop culture references for sentences. It is useful occasionally but not a core or transformative tool, as indicated by its limited exports and usage context.
- Gap: Increase frequency of use by broadening applicability or integrating with core workflows.
- Next: Explore ways to generalize pop-reference for more common AI feature pipelines or automate its integration in larger chains.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default function 'popReference' only; no instruction builders or spec/apply split
- Gap: No instruction builders or spec/apply split exports
- Next: Implement instruction builders and spec/apply split exports to improve composability and API clarity

**browser-server** — Level 0
- Evidence: No import or usage of 'lib/env' or runtime environment detection
- Gap: Use 'lib/env' for environment detection to support isomorphic operation
- Next: Refactor to use 'lib/env' for environment reads instead of direct process.env or node-only APIs

**code-quality** — Level 3
- Evidence: Clean, well-structured code with clear function separation (createModelOptions, popReference), descriptive variable names, no dead code
- Gap: Further separation of concerns and composability for reference-quality code
- Next: Refactor to isolate orchestration and core logic into composable functions

**composability** — Level 2
- Evidence: No spec/apply split exports; composability ceiling is level 2 as per deterministic ceiling
- Gap: Lacks spec/apply split and instruction builders for higher composability
- Next: Introduce spec/apply split functions and instruction builders to reach level 3 composability

**documentation** — Level 3
- Evidence: README has API section with parameter table documenting 'sentence', 'description', 'options' including 'include', 'referenceContext', 'referencesPerSource', 'llm'; multiple examples under 'Examples' section; behavioral notes in 'Notes' section
- Gap: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- Next: Add architecture overview, edge case handling, performance considerations, and composition guidance to README

**errors-retry** — Level 1
- Evidence: Imports 'lib/retry' and uses retry() with default maxAttempts, no custom retry conditions or error handling
- Gap: Add input validation, conditional retry logic, and defined failure modes
- Next: Implement input validation and enhance retry with conditional policies and error context

**events** — Level 1
- Evidence: Imports 'onProgress' in config and passes it through to retry call but does not emit own events
- Gap: Emit standard lifecycle events (start, complete, step) using 'lib/progress-callback'
- Next: Implement event emission calls such as emitStart, emitComplete around main processing steps

**logging** — Level 0
- Evidence: No import of 'lib/lifecycle-logger' or usage of createLifecycleLogger or logger methods
- Gap: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- Next: Import 'lib/lifecycle-logger' and implement structured lifecycle logging calls

**prompt-engineering** — Level 3
- Evidence: Uses asXML for variable wrapping (sentence, description, sources). Uses promptConstants.onlyJSON for output formatting. Uses response_format with JSON schema (popReferenceSchema) in createModelOptions. No explicit system prompt or temperature setting found. Prompt is a detailed template literal with structured instructions.
- Gap: No system prompt or temperature tuning used.
- Next: Introduce a system prompt to set the assistant's role and tune temperature for desired creativity or consistency.

**testing** — Level 4
- Evidence: Has 'index.spec.js' with unit tests and 'index.examples.js' using 'aiExpect' for semantic validation

**token-management** — Level 0
- Evidence: No usage of 'lib/text-batch' or createBatches for token budget management
- Gap: Implement token-budget-aware batching using createBatches
- Next: Integrate 'lib/text-batch' createBatches to manage input size and token budgets


### questions (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: At 203 LOC across 2 files, the design is proportional to the problem complexity. It cleanly separates phases: initial generation, iterative refinement, quality control, and termination. It uses retry and LLM call abstractions without unnecessary complexity.

**composition-fit** — Level 2
- Evidence: The chain exposes a clean function interface and works as a pipeline step, but it does not build on the library's core primitives like map, filter, or reduce. It orchestrates LLM calls directly rather than composing existing chains.
- Gap: Refactor to leverage existing batch processing chains (map, filter) and spec/apply patterns to improve composability.
- Next: Decompose the chain to use core collection chains for batch operations and integrate instruction builders for better composition fit.

**design-efficiency** — Level 3
- Evidence: The implementation is concise at 203 LOC with a small number of helper functions. The code is clean, with LOC proportional to the problem complexity, and no evident workarounds or duplicated logic.

**generalizability** — Level 4
- Evidence: The chain accepts natural language input and instructions, works with any text data, and uses isomorphic runtime dependencies. It has no hard coupling to specific frameworks or data formats, making it fully general and adaptable.

**strategic-value** — Level 3
- Evidence: The questions chain is a core capability frequently needed in AI pipelines for generating relevant, thought-provoking questions from text. It enables iterative exploration workflows that were previously impractical, supporting custom skip/stop logic and breadth control.


#### Implementation Quality

**browser-server** — Level 0
- Evidence: No usage of 'lib/env' or runtime environment detection; no browser/server compatibility code
- Gap: Use 'lib/env' for environment detection to support both browser and server
- Next: Refactor environment reads to use 'lib/env' and add graceful degradation for browser/server

**composability** — Level 2
- Evidence: Deterministic ceiling at level 2, no spec/apply split or instruction builders
- Gap: Lacks spec/apply split and instruction builders for higher composability
- Next: Refactor to export spec/apply functions and add instruction builders

**documentation** — Level 3
- Evidence: README has Usage, Parameters, Returns, Algorithm, Examples sections with detailed API and behavioral notes
- Gap: Missing architecture section, edge cases, performance notes, and composition guidance
- Next: Add comprehensive architecture and performance documentation, including edge cases and composition guidance

**errors-retry** — Level 1
- Evidence: Imports 'lib/retry' and uses retry() with default 429-only retry policy; no custom error handling or multi-level retry
- Gap: Add input validation, conditional retry, and defined failure modes
- Next: Enhance retry logic with input validation and conditional retry policies

**events** — Level 0
- Evidence: No import of 'lib/progress-callback' or calls to emit events; onProgress is accepted but only passed through to retry calls
- Gap: Emit standard lifecycle events (start, complete, step) using progress-callback
- Next: Integrate 'lib/progress-callback' and emit lifecycle events during chain execution

**logging** — Level 0
- Evidence: No import of 'lib/lifecycle-logger' or usage of createLifecycleLogger or logger calls
- Gap: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- Next: Import 'lib/lifecycle-logger' and instrument main functions with createLifecycleLogger and logStart/logResult calls

**prompt-engineering** — Level 3
- Evidence: Uses promptConstants such as asXML, asJSON, asWrappedArrayJSON for variable wrapping and JSON formatting. Employs system prompt patterns in pickInterestingQuestion and formatQuestionsPrompt functions. Sets temperature explicitly to 1 in llmConfig. Uses response_format with JSON schemas (questionsListSchema, selectedQuestionSchema) in llmConfig. Utilizes retry wrapper for LLM calls with labeled attempts. Imports shared prompt utilities from prompts/index.js.
- Gap: Missing multi-stage prompt pipelines and frequency/presence penalty tuning to reach level 4.
- Next: Implement multi-stage prompt pipelines and tune frequency/presence penalties for improved prompt control.

**testing** — Level 4
- Evidence: Has index.spec.js with unit tests and index.examples.js using aiExpect

**token-management** — Level 1
- Evidence: No use of createBatches; manual token budget calculation via model.budgetTokens but no batch splitting; uses retry and manual prompt chunking
- Gap: Implement token-budget-aware splitting using createBatches
- Next: Integrate 'lib/text-batch' createBatches for automatic token budget management


### reduce (core)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: The chain is implemented in 173 LOC across 2 files, which is under 200 lines and appropriate for the accumulator pattern complexity. It builds on the library's primitives (listBatch, retry, progress callbacks) without bespoke infrastructure or reimplementation of batch processing logic.

**composition-fit** — Level 2
- Evidence: The reduce chain exposes a clean function interface that works as a pipeline step accepting items and instructions and returning accumulated results. However, it does not use the spec/apply pattern internally or expose instruction builders, so it is not a full composition citizen.
- Gap: Adopt spec/apply pattern and provide instruction builders to better integrate with library composition primitives.
- Next: Refactor reduce to implement spec/apply pattern and export instruction builders for use with other collection chains.

**design-efficiency** — Level 4
- Evidence: The implementation is concise (158 LOC in main file), with minimal helper functions (schemas.js 15 LOC), and uses existing library utilities for batching, retry, and progress. The code is proportional to the accumulator pattern complexity.

**generalizability** — Level 4
- Evidence: The reduce chain accepts natural language instructions and works with any text input list, with no hard dependencies on specific runtimes or data formats. It is isomorphic and context-agnostic, making it fully general and adaptable.

**strategic-value** — Level 3
- Evidence: The reduce chain is a core capability frequently needed in AI pipelines, as it implements the accumulator pattern for batch processing. It is part of the core batch processing chains (map, filter, reduce, group, sort) which are high-value by definition.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default 'reduce' function only; config params destructured including 'initial', 'listStyle', 'autoModeThreshold', 'responseFormat', 'llm', 'maxAttempts', 'onProgress', 'now'
- Gap: No instruction builders or spec/apply split exports
- Next: Implement instruction builders and spec/apply split exports to enhance API composability

**browser-server** — Level 0
- Evidence: No import or usage of 'lib/env' or runtime environment detection; no browser/server compatibility code
- Gap: Add environment detection using 'lib/env' to support both browser and server
- Next: Use 'lib/env' to detect environment and adapt code accordingly

**composability** — Level 2
- Evidence: Composes other chains internally such as 'listBatch', 'createBatches', 'retry'; uses batch processing internally
- Gap: No exported spec/apply split functions or instruction builders
- Next: Export spec/apply split functions and instruction builders to improve composability

**documentation** — Level 3
- Evidence: README has API section with parameter table for 'initial', 'responseFormat', shared config params 'llm', 'maxAttempts', 'onProgress', 'now'; multiple usage examples including default accumulator behavior and structured output; behavioral notes on accumulator wrapping
- Gap: Missing architecture section, edge cases, performance notes, and composition guidance
- Next: Add architecture overview, edge case handling, performance considerations, and guidance on composing with other chains in README

**errors-retry** — Level 1
- Evidence: Imports 'lib/retry' and uses retry() with default maxAttempts; no custom error handling or multi-level retry
- Gap: Add input validation, conditional retry, and error context attachment
- Next: Enhance retry logic with conditional retry and attach error context to results

**events** — Level 3
- Evidence: Imports 'lib/progress-callback' and calls emitBatchStart, emitBatchProcessed, emitBatchComplete
- Gap: No phase-level events for multi-phase operations
- Next: Implement phase-level event emission for multi-phase operations using emitPhaseProgress or similar

**logging** — Level 0
- Evidence: No import of 'lib/lifecycle-logger' or usage of createLifecycleLogger or logger methods
- Gap: Add lifecycle logging using 'lib/lifecycle-logger' with logStart and logResult
- Next: Import 'lib/lifecycle-logger' and implement createLifecycleLogger with logStart/logResult calls

**prompt-engineering** — Level 3
- Evidence: Uses asXML for variable wrapping from prompts/wrap-variable.js; uses responseFormat with JSON schema (reduceAccumulatorJsonSchema) for output structuring; employs retry logic with labeled attempts; uses system-like prompt construction with detailed instructions in template literals; temperature setting is not explicitly set, implying default usage; response_format is used consistently in listBatchOptions.
- Gap: No explicit system prompt setting role or temperature tuning; no multi-stage prompt pipelines or advanced tuning like frequency/presence penalties.
- Next: Introduce explicit system prompts and tune temperature settings to improve prompt control and consistency.

**testing** — Level 4
- Evidence: Has 'index.spec.js' with unit tests and 'index.examples.js' using 'aiExpect' for semantic validation

**token-management** — Level 2
- Evidence: Uses 'createBatches' from 'lib/text-batch' for token-budget-aware splitting
- Gap: No model-aware budget calculation or proportional multi-value budget management
- Next: Implement model-aware token budget calculation and proportional budget management


### relations (standard)

#### Design Fitness

**architectural-fitness** — Level 2
- Evidence: At 416 lines of code in a single module with no use of other chains, the complexity is moderate but somewhat high relative to the core idea. The chain implements multiple phases (spec generation, apply, parsing) but could benefit from clearer decomposition or leveraging existing primitives more.
- Gap: Refactor to decompose the chain into smaller composable parts and leverage existing batch processing chains internally.
- Next: Extract batch processing steps into reusable chain compositions to reduce module complexity.

**composition-fit** — Level 4
- Evidence: The chain fully embraces the library's composition philosophy by exposing spec/apply functions and instruction builders for all batch processing chains (map, filter, reduce, find, group). It enables novel workflows by combining with other chains.

**design-efficiency** — Level 2
- Evidence: With 416 lines and multiple exports in a single file, the implementation shows moderate complexity. The number of helper functions and imports suggests some friction, but the design mostly works without severe strain.
- Gap: Simplify the implementation by reducing helper functions and splitting responsibilities to improve maintainability.
- Next: Refactor to modularize helper functions and clarify configuration parameters to reduce complexity.

**generalizability** — Level 3
- Evidence: The chain accepts natural language instructions and works with any text input, with optional entity disambiguation. It has no hard dependencies on specific runtimes or data formats, making it broadly applicable across domains.

**strategic-value** — Level 3
- Evidence: The relations chain is a core capability frequently needed in AI pipelines for extracting structured relationship tuples from text, enabling workflows that were previously impractical. It integrates with collection chains via spec/apply and instruction builders, indicating high utility.


#### Implementation Quality

**api-surface** — Level 4
- Evidence: Exports parseRDFLiteral, parseRelations, relationSpec, applyRelations, extractRelations, mapInstructions, filterInstructions, reduceInstructions, findInstructions, groupInstructions, createRelationExtractor

**composability** — Level 4
- Evidence: Exports relationSpec() and applyRelations() split; instruction builders mapInstructions, filterInstructions, reduceInstructions, findInstructions, groupInstructions; factory function createRelationExtractor

**documentation** — Level 4
- Evidence: README has Overview, Basic Usage, Entity Disambiguation, Predicate Specification, Advanced Features, Chain Operations sections with multiple examples and detailed API usage

**testing** — Level 4
- Evidence: Has index.spec.js with unit tests and index.examples.js using aiExpect


### scale (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: At 309 LOC, the design is proportional to the complex problem of conceptual scaling. It uses the spec/apply pattern and instruction builders clearly, without reimplementing batch processing. The code is modular with clear phases, matching the problem complexity.
- Next: Maintain modular design and clear separation of concerns.

**composition-fit** — Level 4
- Evidence: The scale chain fully embraces the library's composition philosophy by exposing spec/apply functions and instruction builders for all batch operations (map, filter, reduce, find, group). It enables novel workflows by combining with other chains and does not reimplement batch processing.
- Next: Encourage further composition with other chains to unlock new workflows.

**design-efficiency** — Level 3
- Evidence: With 309 LOC and 2 files, the implementation is clean and proportional to the problem complexity. It uses helper functions appropriately without excessive fragmentation. The design avoids workarounds and duplicated logic, balancing complexity and clarity.
- Next: Refactor minor helper functions if possible to reduce LOC without sacrificing clarity.

**generalizability** — Level 4
- Evidence: The chain accepts natural language instructions and arbitrary input items, with no hard dependencies on specific frameworks or data formats. It is isomorphic and adaptable to new use cases without modification, fitting the core verblets pattern.
- Next: Ensure continued abstraction from specific runtimes or data formats.

**strategic-value** — Level 3
- Evidence: The scale chain is a core spec/apply pattern module with 309 LOC and 2 files, widely used for AI-powered data transformation. It enables nuanced scaling workflows not possible with simple math, integrating with collection chains (map, filter, reduce, group, find). It is frequently used across projects as indicated by its exports and portfolio context.
- Next: Continue promoting usage and integration in AI pipelines.


#### Implementation Quality

**api-surface** — Level 4
- Evidence: Exports scaleSpec, applyScale, scaleItem, mapInstructions, filterInstructions, reduceInstructions, findInstructions, groupInstructions, createScale

**browser-server** — Level 0
- Evidence: No usage of 'lib/env' or runtime environment detection; no browser/server compatibility code
- Gap: Use 'lib/env' for environment detection to support both browser and server environments
- Next: Integrate 'lib/env' and add environment checks to enable isomorphic operation

**code-quality** — Level 3
- Evidence: Clean separation of concerns with extracted instruction builders, clear function naming, no dead code, use of async/await, and well-structured core functions like scaleSpec and applyScale
- Gap: Further modularize code for composability and add explicit transformation layers
- Next: Refactor to separate orchestration and core logic more distinctly and add composable internals

**composability** — Level 4
- Evidence: Exports scaleSpec() and applyScale() split; instruction builders mapInstructions, filterInstructions, reduceInstructions, findInstructions, groupInstructions; factory function createScale

**documentation** — Level 4
- Evidence: README has Usage, Collection Processing, Advanced Collection Operations, Supporting Utilities sections with multiple examples and integration guidance

**errors-retry** — Level 1
- Evidence: Imports 'lib/retry' and uses retry() with default 429-only policy, no input validation or multi-level retry
- Gap: Add input validation, conditional retry logic, and defined failure modes
- Next: Enhance retry strategy with input validation and error context attachment

**events** — Level 0
- Evidence: No import of 'lib/progress-callback', no event emission functions used
- Gap: Implement event emission using 'lib/progress-callback' to emit start, complete, and step events
- Next: Add 'lib/progress-callback' import and emit standard lifecycle events during scale operations

**logging** — Level 0
- Evidence: No import of 'lib/lifecycle-logger', no usage of createLifecycleLogger or logStart/logResult
- Gap: Add lifecycle logging using 'lib/lifecycle-logger' with logStart and logResult
- Next: Import 'lib/lifecycle-logger' and implement lifecycle logging in core functions like scaleSpec and applyScale

**prompt-engineering** — Level 3
- Evidence: Uses asXML for variable wrapping in prompts (e.g., asXML(prompt, { tag: 'scaling-instructions' })), uses promptConstants.onlyJSON for JSON output enforcement, employs system prompts (e.g., specSystemPrompt), and configures response_format with JSON schemas (scaleSpecificationJsonSchema, scaleResultSchema) in llmConfig.
- Gap: Missing multi-stage prompt pipelines and advanced tuning such as frequency/presence penalty.
- Next: Implement multi-stage prompt pipelines and tune frequency/presence penalties to improve prompt control.

**testing** — Level 2
- Evidence: Has index.spec.js with unit tests and index.examples.js using aiExpect
- Gap: Add unit tests covering edge cases and error paths
- Next: Expand unit tests to cover edge cases and error handling

**token-management** — Level 0
- Evidence: No usage of 'lib/text-batch' or createBatches for token budget management
- Gap: Implement token-budget-aware batching using 'createBatches' to manage input size
- Next: Integrate 'lib/text-batch' and apply token budget management in scaleSpec and applyScale


### scan-js (development)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: 111 lines of code focused on a single responsibility; uses existing library chains like 'sort' and 'search-js-files' without reimplementing batch processing; clear phases in top-level function.
- Gap: Minor simplifications possible but overall design is proportional and clean.
- Next: Review for any redundant abstractions and simplify where possible.

**composition-fit** — Level 1
- Evidence: Does not use spec/apply pattern; no exports of instruction builders; does not compose with core batch primitives; acts as a standalone internal utility.
- Gap: Refactor to expose spec/apply interfaces and instruction builders to integrate with library's composition model.
- Next: Decompose functionality into composable chains using spec/apply pattern and instruction builders.

**design-efficiency** — Level 3
- Evidence: 111 LOC with a single default export; limited helper functions; imports several internal libs appropriately; implementation matches problem complexity without evident workarounds.
- Gap: No significant design inefficiencies detected.
- Next: Maintain current design efficiency while refactoring for composition fit.

**generalizability** — Level 2
- Evidence: Module is specific to JavaScript codebases and uses AST traversal for JS functions; relies on internal conventions and specific data formats limiting broader applicability.
- Gap: Abstract analysis to support other languages or generic text inputs.
- Next: Extract language-agnostic analysis components to increase reuse across different codebases.

**strategic-value** — Level 2
- Evidence: Useful internal tool for automated code quality analysis of JavaScript functions, enabling AI-driven code review workflows; however, usage is niche and internal rather than broadly adopted.
- Gap: Increase general adoption by exposing capabilities for broader developer use beyond internal codebases.
- Next: Refactor to provide a public API for external projects to leverage the code analysis features.


#### Implementation Quality

**browser-server** — Level 0
- Evidence: Uses 'node:fs/promises' import indicating Node-only environment
- Gap: Use 'lib/env' for environment detection to support browser and server
- Next: Refactor to use 'lib/env' and avoid Node-only APIs for browser compatibility

**code-quality** — Level 3
- Evidence: Clean code with clear naming, extracted pure functions like 'visit', no dead code
- Gap: Further modularization and composability to reach reference-quality
- Next: Refactor to separate concerns more explicitly and improve composability

**composability** — Level 2
- Evidence: No spec/apply split or instruction builders, but composes other chains internally (uses search, sort chains)
- Gap: Missing spec/apply split and instruction builders
- Next: Implement spec/apply split functions and instruction builders for composability

**documentation** — Level 3
- Evidence: README has sections: Purpose, Internal Architecture, Features Analyzed, Technical Details, Note
- Gap: Missing explicit API section with parameter table and shared config references
- Next: Add an API section in README with parameter table and shared config documentation

**errors-retry** — Level 1
- Evidence: Imports 'lib/retry' and uses 'retry' function for basic retry logic
- Gap: Add input validation and defined failure modes beyond basic retry
- Next: Implement input validation and error handling strategies with retry and failure modes

**events** — Level 0
- Evidence: No import of 'lib/progress-callback' or usage of event emission functions
- Gap: Implement standardized event emission using 'lib/progress-callback'
- Next: Add 'onProgress' support and emit standard lifecycle events during processing

**logging** — Level 0
- Evidence: No import of 'lib/lifecycle-logger' or usage of createLifecycleLogger or logger calls
- Gap: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- Next: Import 'lib/lifecycle-logger' and implement structured lifecycle logging in main functions

**prompt-engineering** — Level 3
- Evidence: Uses imported prompt module 'codeFeaturesPrompt' for prompt construction; employs 'makeJSONSchema' for JSON schema generation; uses 'llm' call with 'response_format' specifying JSON schema with name 'code_features_analysis'; model options include modelName 'fastGood'; no explicit system prompt or temperature setting found; no use of promptConstants from constants.js detected.
- Gap: Missing explicit system prompt and temperature tuning; no use of promptConstants; no multi-stage prompt pipeline or penalty tuning.
- Next: Introduce explicit system prompt and temperature settings; incorporate promptConstants for reusable fragments to improve prompt engineering maturity.

**testing** — Level 2
- Evidence: Has index.examples.js using aiExpect, no spec tests
- Gap: No unit tests covering edge cases or error paths
- Next: Add unit tests with edge case and error path coverage

**token-management** — Level 0
- Evidence: No usage of 'createBatches' or token-budget-aware splitting
- Gap: Implement token-budget-aware input chunking using 'createBatches'
- Next: Integrate 'createBatches' for token-aware batching of inputs


### score (core)

#### Design Fitness

**architectural-fitness** — Level 4
- Evidence: The chain uses a spec/apply pattern that naturally enables composition, with clear phases and proportional complexity for the scoring problem. It builds on primitives like scaleSpec and batch processing without bespoke infrastructure.

**composition-fit** — Level 3
- Evidence: Exports spec/apply functions and instruction builders for map, filter, reduce, find, and group chains, following library composition patterns and enabling integration with other chains.

**design-efficiency** — Level 2
- Evidence: At 395 lines, the chain is relatively large for its core idea, with multiple imports and helper functions, indicating some complexity that might be reduced with further refactoring.
- Gap: Reduce code complexity and helper function count to improve maintainability.
- Next: Refactor batch processing and retry logic to simplify the main abstraction and reduce LOC.

**generalizability** — Level 3
- Evidence: The chain accepts natural language instructions and works with any text data, with no hard dependencies on specific frameworks or data formats, making it broadly applicable across domains.

**strategic-value** — Level 3
- Evidence: The score chain is a core capability frequently used in AI pipelines, enabling specification-based scoring across items. It integrates with all collection chains and supports workflows previously impractical without it.


#### Implementation Quality

**api-surface** — Level 3
- Evidence: Exports `scoreSpec`, `applyScore`, `scoreItem`, `mapScore`, `mapInstructions`, `filterInstructions`, `reduceInstructions`, `findInstructions`, `groupInstructions` with documented naming and spec/apply split.
- Gap: Missing factory functions and calibration utilities to reach level 4.
- Next: Add factory functions and calibration utilities exports to complete API surface.

**composability** — Level 3
- Evidence: Exports `scoreSpec()` and `applyScore()` split; provides instruction builders `mapInstructions`, `filterInstructions`, `reduceInstructions`, `findInstructions`, `groupInstructions` for multiple collection chains.
- Gap: No factory functions for full composability level 4.
- Next: Implement and export factory functions to enhance composability.

**documentation** — Level 4
- Evidence: README has API section listing default export `mapScore(list, instructions, config)`, functions `scoreItem`, `scoreSpec`, `applyScore`, and instruction builders `mapInstructions`, `filterInstructions`, `reduceInstructions`, `findInstructions`, `groupInstructions`. README includes usage examples, configuration details, architecture explanation, and composition guidance.

**testing** — Level 2
- Evidence: Has `index.spec.js` with unit tests and `index.examples.js` with example tests; no usage of `aiExpect`.
- Gap: Lacks `aiExpect` coverage and property-based or regression tests to reach level 3.
- Next: Add `aiExpect` semantic validation tests and cover edge cases and error paths.


### set-interval (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: 170 LOC focused on a single responsibility; clean design with clear phases (data retrieval, prompt processing, scheduling); no reimplementation of batch primitives; uses existing library functions for LLM calls and retries.
- Gap: Minor simplifications possible but overall proportional to problem complexity.
- Next: Review and refactor any minor helper functions for clarity.

**composition-fit** — Level 1
- Evidence: Does not build on core batch processing chains (map, filter, reduce); implements its own scheduling orchestration; no spec/apply pattern or instruction builders exposed; acts as a standalone utility.
- Gap: Refactor to leverage existing batch primitives and expose spec/apply interfaces to improve composability.
- Next: Decompose scheduling logic into composable chains using spec/apply pattern.

**design-efficiency** — Level 3
- Evidence: 170 LOC with a focused single export; minimal helper functions; code structure is clear and proportional to complexity; no evident workarounds or duplicated logic.

**generalizability** — Level 4
- Evidence: No hard dependencies on specific frameworks or data formats; accepts natural language prompts and arbitrary data; runtime dependencies are optional and swappable; isomorphic design suitable for various contexts.

**strategic-value** — Level 3
- Evidence: Enables AI-driven dynamic scheduling workflows previously impractical; useful for developers building self-tuning or creative interval timers; moderately frequent use as a standard tier chain.
- Gap: Could increase adoption by providing more out-of-the-box use cases or integrations.
- Next: Document additional example workflows and provide integration helpers.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default function setInterval, no named exports
- Gap: No instruction builders or spec/apply split
- Next: Introduce instruction builders and spec/apply split exports to improve composability and clarity

**browser-server** — Level 0
- Evidence: No usage of lib/env or runtime environment detection; uses setTimeout and Date which are available in both environments
- Gap: Use lib/env for environment reads to ensure isomorphic compatibility
- Next: Refactor environment detection to use lib/env proxy instead of direct global objects

**code-quality** — Level 3
- Evidence: Clear function separation (toMs, setInterval), descriptive variable names, no dead code, extracted pure functions
- Gap: Reference-quality example with comprehensive documentation and composable internals
- Next: Add detailed documentation and further modularize internal logic for composability

**composability** — Level 2
- Evidence: No spec/apply split or instruction builders, but composes other chains internally like numberWithUnits, number, date
- Gap: Missing spec/apply split and instruction builders for higher composability
- Next: Refactor to export spec/apply functions and instruction builders to enable better composition

**documentation** — Level 3
- Evidence: README has API Reference section with parameter table and example, multiple usage examples including Photography Alarm, behavioral notes in README
- Gap: Lacks comprehensive architecture section, edge cases, performance notes, and composition guidance
- Next: Add architecture overview, edge case handling, performance considerations, and composition guidance to README

**errors-retry** — Level 1
- Evidence: Imports retry from lib/retry and uses it with default 429-only policy; basic retry implemented
- Gap: Add input validation and defined failure modes beyond basic retry
- Next: Implement input validation and handle failure modes explicitly with error context

**events** — Level 1
- Evidence: Imports onProgress in config and passes it to retry call; no emission of standard events
- Gap: Emit standard lifecycle events (start, complete, step) via progress-callback
- Next: Implement emitting standard events using lib/progress-callback during key lifecycle points

**logging** — Level 1
- Evidence: Uses console.error for error logging in the catch block; no import or usage of lib/lifecycle-logger
- Gap: Accepts a logger config and uses logger.info() inline
- Next: Add a logger parameter and replace console.error with logger.info calls for inline logging

**prompt-engineering** — Level 2
- Evidence: Uses promptConstants: contentIsInstructions, explainAndSeparate, explainAndSeparatePrimitive; uses asXML from prompts/wrap-variable.js for variable wrapping; prompt constructed as template literal combining constants and asXML-wrapped variables; uses retry with callLlm for LLM invocation; no explicit system prompt or temperature setting; no response_format usage.
- Gap: Missing system prompts, temperature tuning, and response_format usage to reach level 3.
- Next: Introduce system prompts and set temperature explicitly; implement response_format with JSON schemas for structured output.

**testing** — Level 2
- Evidence: Has index.spec.js with unit tests and index.examples.js with example tests, no aiExpect usage
- Gap: No aiExpect or property-based tests for semantic validation
- Next: Add aiExpect assertions in example tests to improve semantic validation coverage

**token-management** — Level 0
- Evidence: No usage of createBatches or token-budget-aware splitting; entire prompt sent as is
- Gap: Implement token-budget-aware input splitting using createBatches
- Next: Integrate lib/text-batch createBatches to manage token budgets for prompt inputs


### socratic (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: At 273 LOC across 3 files, the design is proportional to the complexity of managing multi-turn Socratic questioning with retry, logging, and progress callbacks. It cleanly separates ask and answer phases and uses a class to encapsulate state.
- Gap: Could simplify by extracting some logic into reusable primitives or leveraging existing batch processing chains more.
- Next: Refactor to use existing map or reduce chains for iterative questioning steps to reduce bespoke orchestration code.

**composition-fit** — Level 1
- Evidence: The socratic chain does not use other chains internally and implements its own orchestration logic for multi-turn questioning rather than composing existing map/filter/reduce chains.
- Gap: Refactor to express the questioning steps as compositions of existing batch processing chains to align with library composition philosophy.
- Next: Decompose the socratic chain into spec/apply style components and use map or reduce chains to orchestrate question-answer turns.

**design-efficiency** — Level 3
- Evidence: The implementation is 273 LOC with a moderate number of helper functions and imports. The code is clean and proportional to the complexity of multi-turn LLM interaction with retry and logging.
- Gap: Could reduce LOC by leveraging existing library primitives for batch processing and progress management.
- Next: Refactor to reuse existing chain primitives for iteration and progress to reduce bespoke code.

**strategic-value** — Level 3
- Evidence: The socratic chain enables a core capability of generating progressive, thought-provoking questions using the Socratic method, which is useful for educational and problem-solving workflows. It is a unique tool not overlapping with core batch processing chains but complements them, enabling deeper AI-driven inquiry.
- Gap: Could increase frequency of use by integrating more tightly with other chains or expanding use cases.
- Next: Develop adapters or instruction builders to compose socratic with map/filter chains for broader pipeline integration.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default 'socratic'
- Gap: No additional exports or shared config destructuring documented
- Next: Document all exports and support shared config destructuring

**browser-server** — Level 0
- Evidence: No usage of `lib/env` or environment detection patterns found
- Gap: Add environment detection using `lib/env` to support both browser and server
- Next: Integrate `lib/env` for environment detection and adapt code for isomorphic compatibility

**composability** — Level 2
- Evidence: No spec/apply split or instruction builders; limited to max level 2 per ceiling
- Gap: Missing spec/apply split and instruction builders
- Next: Implement spec/apply split and instruction builders to improve composability

**documentation** — Level 3
- Evidence: README has API section 'socratic(topic, focus, config)' with parameter table and multiple usage examples
- Gap: Missing architecture section, edge cases, performance notes, and composition guidance
- Next: Add comprehensive architecture and performance documentation with edge cases and composition guidance

**errors-retry** — Level 1
- Evidence: Imports `retry` from `lib/retry` and uses it with default retry policy in `defaultAsk` and `defaultAnswer`
- Gap: Add input validation, conditional retry, and error context attachment
- Next: Enhance retry logic with input validation and attach error context for better observability

**events** — Level 4
- Evidence: Imports `emitStepProgress` from `lib/progress-callback`, calls `emitStepProgress` with detailed phase-level events like 'asking-question' and 'answering-question'

**logging** — Level 4
- Evidence: Imports `createLifecycleLogger` from `lib/lifecycle-logger`, uses `createLifecycleLogger` in constructor, calls `logStart`, `logEvent`, `logResult`, and `logger.info` throughout

**prompt-engineering** — Level 3
- Evidence: Uses extracted prompt builder functions buildAskPrompt and buildAnswerPrompt with template literals. Uses promptConstants explainAndSeparate and explainAndSeparatePrimitive in socratic-question-schema.js and socratic-answer-schema.js. Sets temperature explicitly to 0.7 in llmConfig. Uses response_format with JSON schemas socraticQuestionSchema and socraticAnswerSchema. Uses system prompt pattern via socraticGuidelines constant. Logger usage for prompt analysis and lifecycle logging present.
- Gap: Missing multi-stage prompt pipelines and frequency/presence penalty tuning to reach level 4.
- Next: Implement multi-stage prompt pipelines and tune frequency/presence penalties for improved prompt control.

**testing** — Level 4
- Evidence: Has 'index.spec.js' with unit tests and 'index.examples.js' using 'aiExpect'

**token-management** — Level 1
- Evidence: Uses model.budgetTokens for budget calculation but no use of `createBatches` for token-budget-aware splitting
- Gap: Implement token-budget-aware splitting using `createBatches`
- Next: Integrate `createBatches` to manage token budgets and split inputs accordingly


### sort (core)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: At 256 LOC, the design is proportional to the complex problem of AI-powered sorting. It uses clear phases (chunking, global competition, multi-iteration) and does not reimplement existing primitives but orchestrates LLM calls effectively.
- Next: Maintain clear modular phases and document architecture for maintainability.

**composition-fit** — Level 2
- Evidence: The sort chain exposes a clean function interface accepting items and instructions, fitting as a pipeline step. However, it does not build on other library primitives like map or filter internally, nor does it expose spec/apply patterns, limiting its composition integration.
- Gap: Refactor to leverage existing collection chains and spec/apply patterns to improve composability.
- Next: Decompose sorting logic to use map/filter primitives and expose spec/apply interfaces.

**design-efficiency** — Level 3
- Evidence: The implementation is clean and proportional to the problem complexity with 256 LOC and a manageable number of helper functions. It uses retry, progress callbacks, and chunking effectively without excessive workarounds.
- Next: Continue to monitor complexity as features evolve to maintain efficiency.

**strategic-value** — Level 3
- Evidence: The sort chain is a core capability frequently needed in AI pipelines, enabling sorting of massive datasets by nuanced semantic criteria that traditional algorithms cannot handle. It is part of the core batch processing chains and supports transformative workflows like curated learning paths.
- Next: Promote usage examples to highlight strategic value across domains.


#### Implementation Quality

**api-surface** — Level 2
- Evidence: Exports `defaultSortChunkSize`, `defaultSortExtremeK`, `defaultSortIterations`, `useTestSortPrompt`
- Gap: No instruction builders or spec/apply split
- Next: Implement instruction builders and spec/apply function split to improve composability and API clarity

**browser-server** — Level 1
- Evidence: Direct use of `process.env.VERBLETS_DEBUG` in code
- Gap: Does not use `lib/env` abstraction for environment detection
- Next: Refactor to use `lib/env` for environment variables to improve isomorphic compatibility

**code-quality** — Level 2
- Evidence: Clear function separation like `createModelOptions`, `sortBatch`, `extractExtremes`, uses Ramda's `splitEvery`, no dead code
- Gap: Some code duplication (e.g., `createModelOptions` pattern), uses `console.warn` instead of logger, minor magic numbers
- Next: Extract common utilities like `createModelOptions` and replace `console.warn` with logger calls

**composability** — Level 2
- Evidence: No spec/apply split or instruction builders found; exports constants and a test prompt function
- Gap: Missing spec/apply split and instruction builders
- Next: Refactor to export spec/apply functions and instruction builders to reach level 3 composability

**documentation** — Level 3
- Evidence: README has API section with parameter table documenting chain-specific config params `chunkSize`, `extremeK`, `iterations`, `selectBottom` and references shared config params `llm`, `maxAttempts`, `onProgress`, `now`
- Gap: Missing architecture section, edge cases, performance notes, and composition guidance
- Next: Add architecture overview, edge case handling, performance considerations, and composability guidance to README

**errors-retry** — Level 1
- Evidence: Imports `retry` from `lib/retry` and uses it with default retry policy for LLM calls
- Gap: No input validation, no multi-level or conditional retry, no error context attached
- Next: Implement input validation and enhance retry logic with conditional retry and error context

**events** — Level 2
- Evidence: Imports and calls `emitStart`, `emitComplete`, `emitStepProgress` from `lib/progress-callback`
- Gap: No batch-level or phase-level event emissions
- Next: Add batch-level events like `emitBatchStart` and `emitBatchComplete` for finer-grained progress tracking

**logging** — Level 1
- Evidence: Uses `console.warn` for warnings when sort mismatch occurs, checks `process.env.VERBLETS_DEBUG` for debug logging, no use of `lib/lifecycle-logger`
- Gap: No structured logging with `createLifecycleLogger` or `logger` parameter
- Next: Integrate `lib/lifecycle-logger` and replace `console.warn` with structured logger calls

**prompt-engineering** — Level 3
- Evidence: Uses imported prompt constant 'sortPromptInitial' from prompts/index.js; employs a JSON schema response_format with 'sortSchema' for structured output; sets response_format in createModelOptions function; no explicit system prompt or temperature setting found; uses retry wrapper for LLM calls; no use of asXML or promptConstants beyond imported prompt; no multi-stage prompt pipeline or penalty tuning.
- Gap: Missing explicit system prompt and temperature tuning; no multi-stage prompt pipelines or advanced prompt engineering patterns; no use of prompt fragment library beyond one imported prompt constant; no use of asXML or promptConstants for variable wrapping.
- Next: Introduce explicit system prompt and temperature settings; utilize more promptConstants and asXML for variable wrapping; consider multi-stage prompt pipelines and penalty tuning to advance to level 4.

**testing** — Level 4
- Evidence: Has `index.spec.js` with unit tests and `index.examples.js` using `aiExpect`

**token-management** — Level 1
- Evidence: Manual chunking of input list using Ramda's `splitEvery` for batch processing
- Gap: Does not use `createBatches` or token-budget-aware splitting
- Next: Adopt `createBatches` from `lib/text-batch` for token-aware batch splitting


### split (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: At 113 lines of code, the chain is concise and focused on its core task without unnecessary complexity. It uses existing library utilities like chunkSentences and retry, avoiding bespoke infrastructure.

**composition-fit** — Level 2
- Evidence: The chain exposes a clean function interface and can be used as a pipeline step, but it does not build on the library's core batch processing chains (map, filter, reduce) or spec/apply patterns, limiting its composability.
- Gap: Refactor to leverage existing batch processing primitives and spec/apply patterns to improve composability.
- Next: Decompose the split logic into spec generation and apply phases and integrate with map or filter chains where appropriate.

**design-efficiency** — Level 3
- Evidence: The implementation is clean and proportional to the problem complexity, with 113 LOC and a small number of helper functions. It avoids unnecessary complexity and workarounds.

**generalizability** — Level 4
- Evidence: The chain accepts any text input and natural language instructions, with no hard dependencies on specific frameworks or data formats, making it fully general and context-agnostic.

**strategic-value** — Level 3
- Evidence: The split chain enables developers to segment text into semantically meaningful sections using natural language instructions, a core capability frequently needed in AI pipelines for text processing and analysis.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default function split only; no instruction builders or spec/apply split
- Gap: No instruction builders or spec/apply split exports
- Next: Implement and export instruction builders and spec/apply split functions to improve composability and API clarity

**browser-server** — Level 0
- Evidence: No use of lib/env or runtime environment detection
- Gap: Use lib/env for environment detection to support both browser and server
- Next: Refactor to use lib/env for environment reads instead of direct environment checks

**code-quality** — Level 3
- Evidence: Clear function separation (buildPrompt, split), no dead code, descriptive naming, extracted pure functions
- Gap: Could improve with more explicit transformations and composable internals
- Next: Refactor to separate orchestration and core logic into composable functions

**composability** — Level 1
- Evidence: Accepts standard types (string input), returns string output; no spec/apply split or instruction builders; composability ceiling level 2
- Gap: Does not compose other chains internally or provide spec/apply split functions
- Next: Refactor to expose spec/apply split functions and integrate instruction builders to enable internal composition

**documentation** — Level 3
- Evidence: README has API section with parameter table for chain-specific params chunkLen, delimiter, targetSplitsPerChunk; references shared config params llm, maxAttempts, onProgress, now; includes usage example and detailed How It Works section
- Gap: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- Next: Add architecture overview, edge case handling, performance considerations, and guidance on composing this chain with others in README

**errors-retry** — Level 1
- Evidence: Uses lib/retry with default retry policy, no custom error handling or multi-level retry
- Gap: Add input validation, defined failure modes, and enhanced retry strategies
- Next: Implement input validation and conditional retry logic with error context

**events** — Level 1
- Evidence: Accepts onProgress in config and passes it to retry call, no lib/progress-callback import
- Gap: Emits standard lifecycle events using lib/progress-callback
- Next: Import lib/progress-callback and emit start, complete, step events during processing

**logging** — Level 1
- Evidence: Uses console.warn for error logging via options.logger?.warn, no lifecycle-logger import
- Gap: Accepts logger config and uses logger?.info() for inline logging
- Next: Add logger config parameter and replace console.warn with logger?.info() calls

**prompt-engineering** — Level 3
- Evidence: Uses wrapVariable from prompts/wrap-variable.js for variable wrapping, indicating use of shared prompt utilities. The prompt is built via a dedicated buildPrompt function, showing extracted prompt builder usage. Temperature is explicitly set to 0.1 in llmConfig for consistency tuning. No system prompt or response_format usage detected. The chain uses retry logic and chunkSentences utility, but these are not prompt engineering patterns. No promptConstants from constants.js are used.
- Gap: Missing system prompt usage and response_format with JSON schemas to reach level 4.
- Next: Introduce system prompts to set role and context explicitly, and implement response_format with JSON schema for structured output.

**testing** — Level 4
- Evidence: Has index.spec.js with unit tests and index.examples.js using aiExpect

**token-management** — Level 1
- Evidence: Manual chunking by character count using chunkSentences, no createBatches usage
- Gap: Use createBatches for token-budget-aware splitting
- Next: Integrate lib/text-batch createBatches for token-aware chunking


### summary-map (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: 227 LOC focused on summarization and token budget management, with clear separation of concerns and no reimplementation of batch primitives.

**composition-fit** — Level 2
- Evidence: Does not reimplement batch processing but acts as a standalone utility class rather than a composable chain; lacks spec/apply pattern and instruction builders.
- Gap: Refactor to expose spec/apply interfaces and integrate with library's batch processing chains.
- Next: Design spec/apply pattern and instruction builders to enable composition with other chains.

**design-efficiency** — Level 3
- Evidence: 227 LOC with focused functionality, moderate helper functions, and proportional complexity to the summarization and token budget problem.

**generalizability** — Level 4
- Evidence: Operates on generic text data with natural language instructions and no hard dependencies on specific frameworks or data formats.

**strategic-value** — Level 3
- Evidence: Enables efficient context management for LLM prompts by summarizing and compressing data collections, a core capability frequently needed in AI pipelines.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default class SummaryMap with constructor and methods like set() and pavedSummaryResult()
- Gap: No named exports, no instruction builders or spec/apply split
- Next: Introduce named exports for instruction builders or spec/apply functions to improve composability and API clarity

**browser-server** — Level 0
- Evidence: No usage of 'lib/env' or runtime environment detection; no isomorphic environment handling
- Gap: Use 'lib/env' for environment detection instead of direct process.env usage
- Next: Refactor environment reads to use 'lib/env' proxy for isomorphic support

**code-quality** — Level 3
- Evidence: Clean code structure with clear naming, extracted pure functions (e.g., summarize), no dead code, consistent camelCase
- Gap: Further separation of concerns and composability for reference-quality
- Next: Refactor to improve composability and explicit transformations

**composability** — Level 2
- Evidence: No spec/apply split or instruction builders, but chain composes internally by managing data compression and token budgets
- Gap: Lacks spec/apply function split and instruction builders
- Next: Implement spec/apply split functions and instruction builders to enhance composability

**documentation** — Level 3
- Evidence: README has API Reference section with constructor and method details, multiple usage examples including Basic Token Management, Advanced Usage, Privacy-Aware Processing, and Prompt Integration
- Gap: Missing architecture section, edge cases, performance notes, and composition guidance
- Next: Add comprehensive architecture and performance documentation, include edge cases and composition guidance in README

**errors-retry** — Level 0
- Evidence: No usage of retry logic or error handling patterns; no import or calls to 'lib/retry'
- Gap: Implement basic retry with 'lib/retry' and error handling
- Next: Add retry logic with default 429-only policy using 'lib/retry'

**events** — Level 0
- Evidence: No import of 'lib/progress-callback' or usage of event emission functions
- Gap: Implement event emission using 'lib/progress-callback' with standard events
- Next: Add onProgress callback support and emit start/complete events

**logging** — Level 0
- Evidence: No import of 'lib/lifecycle-logger' or usage of createLifecycleLogger or logger methods
- Gap: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- Next: Import 'lib/lifecycle-logger' and instrument key methods with lifecycle logging

**prompt-engineering** — Level 2
- Evidence: Uses the shared prompt constant 'basicSummarize' from prompts/index.js as a prompt builder function. Uses the 'tokenBudget' prompt constant for token budget instructions. Uses llm() function to invoke the model with modelOptions. No explicit system prompt or temperature setting is visible in the source code. No response_format usage detected. The chain uses shared prompt utilities like 'basicSummarize' and 'tokenBudget' rather than raw string concatenation.
- Gap: Missing system prompts, temperature tuning, and response_format usage to reach level 3.
- Next: Introduce system prompts and explicit temperature settings; implement response_format with JSON schemas for output structuring.

**testing** — Level 4
- Evidence: Has index.spec.js with unit tests and index.examples.js using aiExpect

**token-management** — Level 1
- Evidence: Manual token budget management via 'tokenBudget' from prompts and manual budget calculations; no use of 'createBatches'
- Gap: Adopt 'createBatches' for token-budget-aware splitting
- Next: Integrate 'createBatches' from 'lib/text-batch' for automated token management


### tag-vocabulary (standard)

#### Design Fitness

**architectural-fitness** — Level 2
- Evidence: At 285 lines in a single module with multiple exports, the design is adequate but somewhat complex. It does not reimplement batch processing primitives but could better decompose responsibilities. The phases of generation and refinement are clear but could be more modular.
- Gap: Refactor to separate concerns more cleanly and reduce module size for improved clarity.
- Next: Split generation and refinement logic into smaller modules or functions to improve maintainability and clarity.

**composition-fit** — Level 2
- Evidence: The chain does not use other chains internally and does not expose spec/apply or instruction builders, limiting its composability within the library's batch processing model.
- Gap: Expose spec/apply pattern and instruction builders to align with library composition philosophy.
- Next: Refactor to implement spec/apply exports and provide instruction builders for use with map, filter, and other collection chains.

**design-efficiency** — Level 2
- Evidence: The 285 LOC count with multiple exports and some helper functions suggests moderate complexity. The design mostly works but could be more efficient by reducing helper functions and simplifying configuration.
- Gap: Simplify API surface and reduce helper function count to improve design efficiency.
- Next: Review and consolidate helper functions and configuration parameters to streamline implementation.

**generalizability** — Level 4
- Evidence: The chain accepts natural language specifications and arbitrary sample arrays, with no hard dependencies on specific runtimes or data formats. It is isomorphic and adaptable to new use cases without modification.

**strategic-value** — Level 3
- Evidence: The chain provides a core capability for generating and refining tag vocabularies, a frequent need in AI pipelines for categorization and metadata extraction. It enables workflows that were previously impractical by automating vocabulary generation from samples.
- Gap: Could increase frequency of use by broadening integration with other chains or exposing more composable interfaces.
- Next: Develop instruction builders to better integrate with other collection chains for enhanced composability.


#### Implementation Quality

**api-surface** — Level 2
- Evidence: Exports 'computeTagStatistics', 'generateInitialVocabulary', 'refineVocabulary' (no default export), config params include 'topN', 'bottomN', 'problematicSampleSize', 'llm', 'maxAttempts', 'onProgress', 'now', 'tagger', 'sampleSize'
- Gap: No instruction builders or spec/apply split
- Next: Implement instruction builders and spec/apply function split to improve composability and API clarity

**documentation** — Level 3
- Evidence: README has Usage section with example code, Core Functions section documenting default export 'tagVocabulary', 'generateInitialVocabulary', and 'computeTagStatistics', plus detailed Iterative Refinement Process and Advanced Usage sections
- Gap: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- Next: Add architecture overview, edge case handling, performance considerations, and composition guidance to README

**prompt-engineering** — Level 4
- Evidence: Uses asXML for variable wrapping in prompts (e.g., asXML(tagSystemSpec, { tag: 'tag-system-specification' })), uses promptConstants.onlyJSON for JSON output enforcement, employs retry wrapper around callLlm with labeled attempts, sets response_format with JSON schema (tagVocabularyResultSchema) in llmConfig, uses multi-stage prompt pipeline with generateInitialVocabulary, tagger application, and refineVocabulary functions.

**testing** — Level 4
- Evidence: Has 'index.spec.js' with unit tests, 'index.examples.js' using 'aiExpect' for semantic validation


### tags (standard)

#### Design Fitness

**architectural-fitness** — Level 2
- Evidence: At 400 lines in a single module, the chain is relatively large, indicating some complexity. However, it builds on existing primitives like the map chain and uses a spec/apply pattern, showing adequate design. Some complexity may be due to handling flexible vocabularies and instructions, but the size suggests room for simplification or decomposition.
- Gap: Refactor to reduce module size by splitting responsibilities or simplifying complex logic.
- Next: Identify and extract helper functions or submodules to reduce LOC and improve clarity.

**composition-fit** — Level 4
- Evidence: The chain fully embraces the library's composition philosophy by using the spec/apply pattern, instruction builders, and leveraging the map chain for batch processing. It exposes composable functions and enables novel workflows by combining with other chains.

**design-efficiency** — Level 2
- Evidence: The chain's 400 LOC for a tagging module is moderate but somewhat high relative to the core idea. The code uses multiple helper functions and imports several internal libs, indicating some complexity. While the design mostly works, there may be unnecessary complexity or opportunities to streamline implementation.
- Gap: Simplify implementation to reduce LOC and helper function count, improving maintainability.
- Next: Review code to identify and remove redundant logic or consolidate helpers.

**generalizability** — Level 4
- Evidence: The chain accepts natural language instructions and arbitrary vocabularies, works with any item type (objects or strings), and has no hard dependencies on specific runtimes or data formats. It is isomorphic and context-agnostic, suitable for broad use cases.

**strategic-value** — Level 3
- Evidence: The tags chain is a core capability frequently used in AI pipelines for categorization and tagging tasks, enabling flexible vocabulary-based tagging with natural language instructions. It complements other core chains like map, filter, and score, and supports workflows previously impractical without such flexible tagging.


#### Implementation Quality

**api-surface** — Level 4
- Evidence: Exports 'tagSpec', 'applyTags', 'tagItem', 'mapTags', 'mapInstructions', 'filterInstructions', 'reduceInstructions', 'findInstructions', 'groupInstructions', 'createTagExtractor', 'createTagger', no default export

**composability** — Level 4
- Evidence: Exports spec/apply split: 'tagSpec()', 'applyTags()', instruction builders 'mapInstructions', 'filterInstructions', 'reduceInstructions', 'findInstructions', 'groupInstructions', factory functions 'createTagger', 'createTagExtractor'

**documentation** — Level 4
- Evidence: README has API section with Default Export 'tags(instructions, config)', Core Functions 'tagItem', 'mapTags', 'tagSpec', 'applyTags', 'createTagger', 'createTagExtractor', shared config params 'llm', 'maxAttempts', 'onProgress', 'now', multiple usage examples, vocabulary structure, collection processing, advanced usage, and instruction builders

**testing** — Level 4
- Evidence: Has 'index.spec.js' with unit tests, 'index.examples.js' using 'aiExpect'


### test (development)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: At 75 LOC across 2 files, the design is clean and proportional to the problem complexity. It uses existing library patterns like retry and LLM calls without bespoke infrastructure or reimplementing batch processing.

**composition-fit** — Level 2
- Evidence: The chain exposes a clean async function interface that can be used as a pipeline step, but it does not currently build on the library's core batch processing primitives (map, filter, reduce) or spec/apply patterns.
- Gap: Refactor to leverage core batch processing chains and spec/apply pattern to improve composability.
- Next: Decompose the chain to use map or filter primitives internally and expose spec/apply interfaces for integration with other chains.

**design-efficiency** — Level 3
- Evidence: The implementation is concise (75 LOC), with minimal helper functions and no evident workarounds or duplicated logic, indicating efficient design proportional to the problem.

**generalizability** — Level 4
- Evidence: The chain accepts natural language instructions and analyzes any code file text, with no hard dependencies on specific test frameworks or runtimes, making it fully general and context-agnostic.

**strategic-value** — Level 3
- Evidence: The 'test' chain enables AI-powered code inspection with actionable feedback, a core capability developers frequently need for quality assurance in AI pipelines. It supports focused analysis and error handling, making it broadly useful.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default function 'test' only, no named exports
- Gap: No instruction builders or spec/apply split
- Next: Introduce instruction builders and split spec/apply functions to enhance API surface

**browser-server** — Level 0
- Evidence: Imports 'node:fs/promises' indicating Node-only environment
- Gap: Use 'lib/env' for environment detection to support browser and server
- Next: Refactor to use 'lib/env' and avoid Node-only imports for isomorphic support

**documentation** — Level 3
- Evidence: README has API section with parameters 'path', 'instructions', usage examples showing expected outputs, and features section describing behavior
- Gap: Missing architecture section, edge cases, performance notes, and composition guidance
- Next: Add comprehensive documentation including architecture, edge cases, performance, and composition guidance

**errors-retry** — Level 1
- Evidence: Imports 'lib/retry' and uses retry() with default 429-only policy; no custom error handling
- Gap: Add input validation and defined failure modes beyond basic retry
- Next: Implement input validation and handle failure modes explicitly with retry and error context

**events** — Level 0
- Evidence: No import of 'lib/progress-callback' or calls to emit events; onProgress is accepted but only passed through
- Gap: Emit standard lifecycle events using 'lib/progress-callback'
- Next: Integrate 'lib/progress-callback' and emit start, complete, and step events during processing

**logging** — Level 0
- Evidence: No import of 'lib/lifecycle-logger' or usage of createLifecycleLogger or logger calls
- Gap: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- Next: Import 'lib/lifecycle-logger' and implement createLifecycleLogger with logStart and logResult calls

**prompt-engineering** — Level 3
- Evidence: Uses asXML for variable wrapping of 'code-to-analyze' variable; uses asJSON prompt constant; employs response_format with JSON schema 'testResultJsonSchema'; no explicit system prompt or temperature setting found in the source code; prompt is constructed as a template literal with embedded shared utilities; uses retry wrapper and llm call with structured output.
- Gap: Missing explicit system prompt and temperature tuning to reach level 4.
- Next: Introduce a system prompt to set the assistant's role and tune temperature settings for improved response control.

**testing** — Level 4
- Evidence: Has 'index.spec.js' with unit tests and 'index.examples.js' using 'aiExpect'

**token-management** — Level 0
- Evidence: No use of 'lib/text-batch' or createBatches; entire input sent as is
- Gap: Implement token-budget-aware input chunking using createBatches
- Next: Integrate 'lib/text-batch' createBatches to split input respecting token budgets


### test-analysis (internal)

#### Design Fitness

**architectural-fitness** — Level 1
- Evidence: The module is very large (4147 LOC) with many files and helpers, indicating high complexity. It implements bespoke event processing and coordination rather than building on existing library primitives, suggesting strained architecture.
- Gap: Simplify architecture by decomposing responsibilities and leveraging existing batch processing chains where possible.
- Next: Identify reusable components and refactor to use core library primitives like map, filter, reduce for processing steps.

**composition-fit** — Level 1
- Evidence: The chain does not use other chains internally and is a standalone monolith focused on test event processing. It does not expose composable interfaces or build on the library's batch primitives.
- Gap: Refactor to expose composable functions and leverage existing map/filter/reduce chains for processing.
- Next: Decompose the monolith into smaller chains that can be composed and reused in pipelines.

**design-efficiency** — Level 1
- Evidence: High LOC (4147) with many files and helpers indicates significant complexity and possible friction. The bespoke coordination and event processing suggest the design is fighting the implementation.
- Gap: Reduce complexity by simplifying abstractions and minimizing bespoke infrastructure.
- Next: Audit code for duplicated logic and refactor to use simpler, reusable abstractions.

**generalizability** — Level 1
- Evidence: Hard dependencies on Vitest test framework and Redis ring buffer lock this chain to a specific runtime and data format, limiting reuse in other contexts.
- Gap: Abstract away framework and runtime dependencies to support multiple test frameworks or generic event sources.
- Next: Introduce abstraction layers for event sources and storage to enable plugging in different frameworks or backends.

**strategic-value** — Level 2
- Evidence: The test-analysis chain is a large internal module (4147 LOC, 31 files) focused on test event processing and reporting for Vitest. It enables analysis workflows but is locked to a specific test framework and Redis, limiting frequency and generality. It solves a real problem but is niche compared to core batch chains.
- Gap: Increase general applicability beyond Vitest and Redis to broaden usage scenarios.
- Next: Refactor to decouple from Vitest and Redis dependencies to enable wider adoption.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default only from 'index.js'
- Gap: Add named exports with documented shared config destructuring
- Next: Introduce named exports and document config parameters clearly

**browser-server** — Level 0
- Evidence: No evidence of `lib/env` usage; uses Node-only APIs as indicated by Node-only design in observations.
- Gap: No cross-environment support; uses Node-only APIs.
- Next: Refactor to use `lib/env` for environment detection to support browser and server environments.

**code-quality** — Level 3
- Evidence: Large, well-structured codebase (4147 LOC) with clear separation of concerns in `processors/base-processor.js` and other modules; no dead code; consistent naming conventions.
- Gap: Could improve to reference-quality with exemplary documentation and composable internals.
- Next: Refine internal composability and add comprehensive documentation to reach level 4.

**composability** — Level 2
- Evidence: No spec/apply split exports found; default export only
- Gap: Implement spec/apply split and instruction builders
- Next: Refactor to export spec and apply functions separately and add instruction builders

**documentation** — Level 0
- Evidence: No README found
- Gap: Add a README with basic description
- Next: Create a README with an overview of the chain and its usage

**errors-retry** — Level 0
- Evidence: No evidence of retry logic or error handling libraries such as `lib/retry` used.
- Gap: No error handling or retry mechanisms implemented.
- Next: Implement basic retry logic using `lib/retry` with default policies to reach level 1.

**events** — Level 1
- Evidence: Imports `lib/progress-callback` but limited to max level 1 as per deterministic ceiling; likely only passes through `onProgress` without emitting standard events.
- Gap: Does not emit standard lifecycle events such as start, complete, or step.
- Next: Add emission of standard lifecycle events using `lib/progress-callback` to reach level 2.

**logging** — Level 3
- Evidence: Imports `lib/lifecycle-logger`, uses lifecycle logging patterns in `processors/base-processor.js` such as `logStart`, `logResult` framing implied by lifecycle methods like `initialize`, `shutdown`.
- Gap: Missing full lifecycle logging features like `logConstruction`, `logProcessing`, `logEvent`, and child loggers.
- Next: Implement full lifecycle logging with `logConstruction`, `logProcessing`, `logEvent`, and child loggers to reach level 4.

**prompt-engineering** — Level 0
- Evidence: No prompt imports detected; prompts appear to be inline strings or absent; no usage of promptConstants; no system prompts, temperature settings, or response_format usage found in the source code; chain uses no shared prompt utilities.
- Gap: Use of asXML for variable wrapping and shared prompt utilities is missing.
- Next: Refactor prompts to use asXML for variable wrapping and incorporate shared prompt utilities from src/prompts/ to improve maintainability and consistency.

**testing** — Level 2
- Evidence: Has 'index.examples.js' with example tests, no spec tests, no aiExpect usage
- Gap: Add unit tests and aiExpect coverage
- Next: Develop unit tests and integrate aiExpect assertions in example tests

**token-management** — Level 0
- Evidence: No imports or usage of `lib/text-batch` or `createBatches` detected.
- Gap: No token awareness or budget management implemented.
- Next: Integrate `createBatches` for token-budget-aware input splitting to reach level 2.


### test-analyzer (internal)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: 157 LOC single file focused on one core function; clear phases for log extraction, code window calculation, prompt construction; no reimplementation of batch primitives.
- Gap: Minor simplifications possible but overall design proportional to problem complexity.
- Next: Review helper functions for potential consolidation to improve clarity.

**composition-fit** — Level 1
- Evidence: Does not use or expose library's batch processing chains; standalone function with no spec/apply pattern or instruction builders.
- Gap: Refactor to leverage map/filter/reduce chains and expose spec/apply interfaces for composability.
- Next: Decompose analysis steps into composable chains and provide instruction builders.

**design-efficiency** — Level 3
- Evidence: 157 LOC with a few helper functions; implementation is straightforward and proportional to problem complexity; no excessive workarounds.
- Gap: Could reduce helper functions slightly for improved cohesion.
- Next: Consolidate small helper functions where appropriate to streamline code.

**generalizability** — Level 1
- Evidence: Tightly coupled to test logs with specific event types and file extraction; depends on vitest log conventions limiting reuse in other contexts.
- Gap: Abstract log format and event detection to support multiple test frameworks.
- Next: Refactor to accept generic test log schemas and configurable event predicates.

**strategic-value** — Level 4
- Evidence: Enables AI-driven test failure analysis unlocking new debugging workflows; highly valuable for developers automating test diagnostics.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default function 'analyzeTestError'
- Gap: Add named exports with documented shared config destructuring
- Next: Refactor to include named exports and document shared config parameters

**browser-server** — Level 0
- Evidence: No usage of lib/env or runtime environment detection
- Gap: No environment abstraction for browser/server compatibility
- Next: Use lib/env to detect environment and adapt code accordingly

**code-quality** — Level 3
- Evidence: Clear separation of pure functions (isEvent, getTestStart, calculateCodeWindow), descriptive naming, no dead code
- Gap: Could improve with more composable internals or explicit transformations
- Next: Refactor analyzeTestError into smaller composable functions for better structure

**composability** — Level 1
- Evidence: Single default export 'analyzeTestError', no spec/apply split or instruction builders
- Gap: Implement spec/apply split and instruction builders for composability
- Next: Introduce spec/apply functions and instruction builders to improve composability

**documentation** — Level 0
- Evidence: No README present
- Gap: Add a README with basic description
- Next: Create a README with an overview of the chain

**errors-retry** — Level 1
- Evidence: Imports lib/retry and uses retry() with default options, no custom retry conditions or error handling
- Gap: No input validation or defined failure modes beyond basic retry
- Next: Add input validation and define failure modes for retry logic

**events** — Level 1
- Evidence: Accepts onProgress in options and passes it to retry call, no import or usage of lib/progress-callback
- Gap: No emission of standard lifecycle events via progress-callback
- Next: Implement event emission using lib/progress-callback to emit start, complete, and step events

**logging** — Level 1
- Evidence: Uses console.error for error messages in analyzeTestError function, no import or usage of lib/lifecycle-logger or logger parameter
- Gap: No structured logging or logger parameter usage
- Next: Add a logger parameter and replace console.error with logger.info or lifecycle logger usage

**prompt-engineering** — Level 0
- Evidence: The chain uses a raw inline template literal prompt constructed directly in the source code without any use of shared prompt utilities or promptConstants. There is no usage of asXML for variable wrapping, no system prompt, no temperature setting, and no response_format usage. The prompt is built as a single string with embedded variables via template literals.
- Gap: Missing use of shared prompt utilities such as asXML for variable wrapping to reach level 1.
- Next: Refactor the prompt to use asXML for wrapping variables instead of raw string interpolation.

**testing** — Level 2
- Evidence: Has 'index.examples.js' using 'aiExpect', no spec tests
- Gap: Add unit tests covering edge cases and error paths
- Next: Develop unit tests to complement example tests and cover edge cases

**token-management** — Level 0
- Evidence: No usage of createBatches or token-budget-aware splitting
- Gap: No token budget management or chunking
- Next: Integrate createBatches for token-aware input chunking


### themes (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: The chain is concise (30 LOC), uses existing 'reduce' and 'shuffle' modules, and has clear processing phases (split, reduce, refine). It avoids unnecessary complexity and bespoke infrastructure.
- Gap: Minor improvements could be made by adopting spec/apply pattern for clearer intent.
- Next: Refactor to use spec/apply pattern to align with library design principles.

**composition-fit** — Level 1
- Evidence: The chain uses the 'reduce' chain internally but does not expose spec/apply or instruction builders, limiting its composability within the library's composition model.
- Gap: Expose spec/apply interfaces and instruction builders to enable composition with other chains.
- Next: Implement spec/apply pattern and provide instruction builders for integration.

**design-efficiency** — Level 4
- Evidence: At 30 LOC with minimal helper functions and clear logic, the implementation is minimal and proportional to the problem complexity.

**generalizability** — Level 4
- Evidence: The chain operates on generic text input, uses natural language prompts, and has no hard dependencies on specific runtimes or data formats, making it fully general and context-agnostic.

**strategic-value** — Level 2
- Evidence: The 'themes' chain provides a useful tool to extract and consolidate key themes from text, enabling thematic analysis workflows. It is moderately sized (30 LOC) and complements other chains but is not a core primitive like map or filter.
- Gap: Increase integration with other chains to enable broader workflow use cases.
- Next: Develop spec/apply pattern and instruction builders to enhance composability and reuse.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default function 'themes', no named exports, destructures shared config params chunkSize, topN, llm
- Gap: No documented named exports or instruction builders
- Next: Introduce and document named exports and instruction builders for better API clarity

**browser-server** — Level 0
- Evidence: No usage of 'lib/env' or environment detection patterns; no evidence of cross-environment support.
- Gap: Use 'lib/env' for environment detection to support both browser and server.
- Next: Refactor environment checks to use 'lib/env' proxy and runtime flags.

**composability** — Level 2
- Evidence: No spec/apply split, no instruction builders or factory functions; limited to internal composition via reduce chain
- Gap: Missing spec/apply split and instruction builders for higher composability
- Next: Implement spec/apply functions and instruction builders to enhance composability

**documentation** — Level 3
- Evidence: README has API usage example with import statement and usage of themes(text, config), describes parameters chunkSize, topN, llm
- Gap: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- Next: Add detailed architecture section and notes on edge cases and performance in README

**errors-retry** — Level 0
- Evidence: No try/catch blocks, no import or use of 'lib/retry', no error handling.
- Gap: Add basic error handling and retry logic using 'lib/retry' with default policies.
- Next: Wrap async calls with retry logic and error handling to improve robustness.

**events** — Level 0
- Evidence: No import of 'lib/progress-callback', no event emission found.
- Gap: Implement event emission using 'lib/progress-callback' to emit lifecycle events.
- Next: Add 'lib/progress-callback' import and emit standard events like 'start' and 'complete'.

**logging** — Level 0
- Evidence: No import of 'lib/lifecycle-logger', no logger usage in source code.
- Gap: Add lifecycle logging using 'createLifecycleLogger' and related calls.
- Next: Import 'lib/lifecycle-logger' and implement 'createLifecycleLogger' with 'logStart' and 'logResult' calls.

**prompt-engineering** — Level 0
- Evidence: The chain uses inline string literals for prompts such as 'Update the accumulator with short themes from this text...' and 'Refine the accumulator by merging similar themes...'. There is no use of shared prompt utilities, promptConstants, system prompts, temperature settings, or response_format.
- Gap: Missing use of shared prompt utilities like asXML, promptConstants, system prompts, temperature tuning, and response_format.
- Next: Refactor prompts to use shared prompt utilities such as asXML for variable wrapping and incorporate promptConstants for reusable prompt fragments.

**testing** — Level 4
- Evidence: Has 'index.spec.js' with unit tests and 'index.examples.js' using 'aiExpect' for semantic validation

**token-management** — Level 0
- Evidence: No use of 'lib/text-batch' or 'createBatches'; manual chunking by splitting text by paragraphs.
- Gap: Implement token-budget-aware batching using 'createBatches' for efficient token management.
- Next: Integrate 'createBatches' to manage token budgets automatically.


### timeline (standard)

#### Design Fitness

**architectural-fitness** — Level 2
- Evidence: Module has 355 LOC across 2 files, uses multiple internal libraries and custom orchestration logic (chunking, retry, parallel batch), indicating moderate complexity; some orchestration could be simplified by leveraging existing library primitives more fully.
- Gap: Reduce bespoke orchestration and chunk management by composing existing batch processing chains more directly.
- Next: Refactor chunk processing and event merging to use existing map, reduce, and filter chains where possible.

**composition-fit** — Level 1
- Evidence: Does not export spec/apply pattern or instruction builders; reimplements batch processing orchestration (chunking, parallel processing, merging) internally rather than composing existing library chains; acts as a black box.
- Gap: Expose spec/apply interfaces and instruction builders; leverage existing batch processing chains internally instead of bespoke orchestration.
- Next: Decompose timeline extraction into spec/apply chains and instruction builders to align with library composition philosophy.

**design-efficiency** — Level 2
- Evidence: 355 LOC with multiple helper functions and imports suggests moderate complexity; some orchestration and retry logic adds to code size; configuration parameters are numerous but manageable.
- Gap: Simplify orchestration and reduce helper functions by leveraging existing primitives; reduce code size where possible.
- Next: Refactor to minimize bespoke orchestration code and helper functions by composing existing chains and utilities.

**generalizability** — Level 4
- Evidence: Accepts arbitrary text input and natural language instructions; no hard dependencies on specific runtimes or data formats; isomorphic design suitable for broad contexts.

**strategic-value** — Level 3
- Evidence: Enables extraction of chronological events from narrative text, supporting multi-format dates and relative timestamps, which is a core capability frequently needed in AI pipelines; used for reconstructing timelines from mixed absolute and relative timestamps.
- Gap: Could increase frequency of use by exposing more composable interfaces or integrations.
- Next: Refactor to expose spec/apply pattern or instruction builders to increase composability and reuse.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default async function 'timeline' only, accepts shared config params 'llm', 'chunkSize', 'maxParallel', 'onProgress', 'enrichWithKnowledge', 'batchSize', 'now'
- Gap: No instruction builders or spec/apply split exports
- Next: Implement instruction builders and spec/apply split exports to improve composability and API clarity

**composability** — Level 2
- Evidence: Uses internal composition of other chains (map, reduce) and utilities (chunkSentences, parallelBatch), but no spec/apply split or instruction builders exported
- Gap: No exported spec/apply functions or instruction builders
- Next: Export spec/apply split functions and instruction builders to reach next composability level

**documentation** — Level 3
- Evidence: README has API section 'timeline(text, config)' with detailed parameters and return type, multiple usage examples including enrichment, and behavioral notes on features and knowledge enrichment
- Gap: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- Next: Add architecture overview, edge case handling, performance considerations, and composition guidance to README

**prompt-engineering** — Level 3
- Evidence: Uses systemPrompt 'extractTimelineInstructions' and another systemPrompt for deduplication; uses response_format with JSON schema 'timelineEventJsonSchema'; calls to callLlm with modelOptions including systemPrompt and response_format; no use of promptConstants; no temperature setting specified; no response_format usage outside callLlm calls; no use of asXML or prompt builder functions; multi-stage prompt pipeline with chunk processing, deduplication, enrichment stages.
- Gap: No temperature tuning or promptConstants usage; no asXML or prompt builder functions; no frequency/presence penalty tuning.
- Next: Incorporate promptConstants for reusable fragments and set temperature parameters explicitly to improve prompt control.

**testing** — Level 4
- Evidence: Has 'index.spec.js' with unit tests, 'index.examples.js' using 'aiExpect' for semantic validation


### to-object (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: At 200 lines, the chain is concise and focused on a single responsibility: JSON repair and validation. It uses clear phases (direct parse, LLM fix attempts) and does not reimplement batch processing or other primitives.

**composition-fit** — Level 1
- Evidence: The chain does not use other chains internally nor expose spec/apply or instruction builders. It is a standalone utility focused on JSON repair, not designed as a composable pipeline step.
- Gap: Refactor to expose spec/apply pattern or integrate with batch processing chains to improve composability.
- Next: Design a spec/apply interface for JSON repair to enable composition with map/filter chains.

**design-efficiency** — Level 3
- Evidence: The implementation is clean and proportional to the problem complexity, with about 200 lines and a few helper functions. It avoids unnecessary complexity and workarounds.

**generalizability** — Level 4
- Evidence: The chain works with any text input and optional JSON schema, without hard dependencies on specific runtimes or data formats. It is isomorphic and context-agnostic, suitable for broad use cases.

**strategic-value** — Level 3
- Evidence: The to-object chain addresses a core problem in AI pipelines: repairing and validating JSON output from LLM calls, which is a frequent and critical need. It enables workflows that rely on robust JSON parsing and validation, a common developer requirement.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default async function toObject(text, schema, config)
- Gap: No named exports, no instruction builders or spec/apply split
- Next: Introduce named exports for spec/apply functions or instruction builders

**browser-server** — Level 0
- Evidence: No import or usage of 'lib/env' or environment detection; no browser/server compatibility code
- Gap: Use 'lib/env' for environment reads to support both browser and server
- Next: Integrate 'lib/env' and add environment checks for isBrowser/isNode

**code-quality** — Level 3
- Evidence: Clear function separation (parseAndValidate, extractJson, validateWithSchema), descriptive naming, no dead code
- Gap: Could improve with more composable internals or explicit transformations
- Next: Refactor to further separate concerns and enhance composability

**composability** — Level 2
- Evidence: No spec/apply split exports; composability capped at level 2 per ceiling
- Gap: Missing spec/apply function split and instruction builders
- Next: Refactor to export spec/apply functions and instruction builders to improve composability

**documentation** — Level 2
- Evidence: README has Usage section with example showing default export usage and config params llm, maxAttempts, onProgress, now
- Gap: Missing detailed API parameter table, behavioral notes, and integration examples
- Next: Add comprehensive API section with parameter table and multiple usage examples

**errors-retry** — Level 1
- Evidence: Imports 'lib/retry' and uses retry() for LLM calls with default retry policy; basic error handling with try/catch
- Gap: Add input validation with defined failure modes and multi-level retry strategies
- Next: Enhance error handling with custom error types and conditional retry logic

**events** — Level 1
- Evidence: Accepts 'onProgress' in config but only passes through to retry calls; no direct event emission
- Gap: Emit standard events (start, complete, step) via progress-callback
- Next: Implement event emission using 'lib/progress-callback' for lifecycle events

**logging** — Level 1
- Evidence: No import of 'lib/lifecycle-logger'; uses console.error in logDebugInfo
- Gap: Accepts 'logger' config and uses logger.info() inline
- Next: Add 'logger' parameter and replace console.error with logger.info calls

**prompt-engineering** — Level 3
- Evidence: Uses promptConstants: contentIsSchema, contentToJSON, onlyJSON, shapeAsJSON; uses asXML for variable wrapping; system prompt patterns via buildJsonPrompt function; temperature setting implied via llmConfig.modelOptions; no explicit response_format usage but strong JSON schema validation and structured prompt building; multi-attempt retry logic with prompt regeneration.
- Gap: No explicit response_format usage with JSON schema enforcement; no frequency/presence penalty tuning; no multi-stage prompt pipelines beyond retries.
- Next: Integrate response_format with JSON schema in LLM calls to enforce output structure and consider tuning frequency/presence penalties for improved output quality.

**testing** — Level 4
- Evidence: Has index.spec.js with unit tests and index.examples.js using aiExpect

**token-management** — Level 0
- Evidence: No use of 'lib/text-batch' or token-budget-aware batching
- Gap: Implement token-budget-aware input splitting using createBatches
- Next: Add token management with 'createBatches' to handle large inputs efficiently


### truncate (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: At 117 LOC, the chain is under 200 lines and does one thing well. It cleanly separates chunk creation, scoring, and truncation logic. It does not reimplement batch processing or scoring but uses the score chain. The design is proportional to the problem complexity.
- Gap: Minor improvements could be made to clarify chunk indexing logic.
- Next: Add comments or refactor chunk indexing for clarity.

**composition-fit** — Level 2
- Evidence: The chain exposes a clean async function interface that can be used as a pipeline step. It uses the score chain internally but does not expose spec/apply or instruction builders itself. It is somewhat composable but not a full composition citizen.
- Gap: Refactor to expose spec/apply pattern and instruction builders to better integrate with library primitives.
- Next: Design and export spec and apply functions along with instruction builders for truncate.

**design-efficiency** — Level 3
- Evidence: The implementation is concise (117 LOC) with a few helper functions. It uses existing chains (score) rather than reimplementing logic. The code is clear and proportional to the problem complexity.

**generalizability** — Level 4
- Evidence: The chain accepts any text input and natural language instructions for removal criteria. It has no hard dependencies on specific runtimes or data formats and is isomorphic. It uses the core score chain for scoring.

**strategic-value** — Level 2
- Evidence: The truncate chain is a useful tool that solves a real problem of intelligently truncating text by scoring chunks from the end. It is moderately sized (117 LOC) and is used for text cleanup tasks, but it is not a core batch processing primitive or a transformative workflow enabler.
- Gap: Increase frequency of use by integrating with more pipelines or enabling novel workflows.
- Next: Explore ways to compose truncate with other chains to unlock new automation patterns.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default 'truncate' function only, no named exports or instruction builders
- Gap: No documented named exports or shared config destructuring
- Next: Introduce named exports and document shared config parameters explicitly

**browser-server** — Level 0
- Evidence: No usage of 'lib/env' or runtime environment detection; no process.env usage
- Gap: Use 'lib/env' for environment detection to support both browser and server
- Next: Refactor environment checks to use 'lib/env' proxy instead of direct environment access

**code-quality** — Level 3
- Evidence: Clear function separation (createChunks, truncate), descriptive naming, no dead code, consistent camelCase
- Gap: Improve to reference-quality with comprehensive documentation and example usage
- Next: Add detailed documentation and examples to elevate code to reference-quality

**composability** — Level 2
- Evidence: No spec/apply split or instruction builders, but chain composes internally by calling 'score' chain
- Gap: Lacks spec/apply function split and instruction builders for better composability
- Next: Refactor to export 'truncateSpec()' and 'applyTruncate()' functions and add instruction builders

**documentation** — Level 3
- Evidence: README has API section with parameter table for 'truncate(text, removalCriteria, config)', multiple usage examples, and behavioral notes on backwards processing and threshold-based scoring
- Gap: Missing architecture section, edge cases, performance notes, and composition guidance
- Next: Add comprehensive architecture and performance notes, edge case handling, and guidance on composing truncate with other chains

**errors-retry** — Level 0
- Evidence: No error handling or retry logic present; no try/catch or retry imports
- Gap: Add basic retry mechanism using 'lib/retry' with default 429-only policy
- Next: Implement retry logic with 'lib/retry' to handle transient errors gracefully

**events** — Level 0
- Evidence: No import of 'lib/progress-callback' or usage of event emission functions
- Gap: Implement event emission using 'lib/progress-callback' with standard events like start and complete
- Next: Add 'lib/progress-callback' import and emit lifecycle events during truncate processing

**logging** — Level 0
- Evidence: No import of 'lib/lifecycle-logger' or usage of createLifecycleLogger or logger methods
- Gap: Add lifecycle logging with createLifecycleLogger and logStart/logResult calls
- Next: Import 'lib/lifecycle-logger' and implement createLifecycleLogger with logStart and logResult in truncate function

**testing** — Level 4
- Evidence: Has 'index.spec.js' with unit tests and 'index.examples.js' using 'aiExpect' for semantic validation

**token-management** — Level 1
- Evidence: Manual chunking by character count in createChunks function; no use of createBatches or token budget awareness
- Gap: Integrate 'createBatches' for token-budget-aware chunking
- Next: Replace manual chunking with 'createBatches' usage to manage token budgets automatically


### veiled-variants (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: At 108 lines of code in a single file, the design is clean and proportional to the problem complexity. It uses clear phases (three prompt builders and a runner) without unnecessary abstractions or reimplementation of batch processing.
- Next: Maintain current design simplicity and clarity.

**composition-fit** — Level 1
- Evidence: The chain does not use or expose the library's batch processing primitives (map, filter, reduce) or spec/apply patterns. It is a standalone module that orchestrates multiple prompt calls but is not composable within the library's core chain ecosystem.
- Gap: Refactor to expose spec/apply interfaces and build on existing batch processing chains to enable composition.
- Next: Decompose the module into spec/apply chains and instruction builders to integrate with library primitives.

**design-efficiency** — Level 3
- Evidence: With 108 lines and a straightforward implementation using three prompt builders and a single orchestration function, the code is efficient and proportional to the problem complexity without excessive helpers or workarounds.
- Next: Keep implementation minimal and focused on core functionality.

**generalizability** — Level 3
- Evidence: The module accepts natural language prompts and works with any text input, using LLM calls with no hard dependencies on specific runtimes or data formats. It is general purpose across domains requiring privacy-preserving text variants.
- Next: Ensure continued abstraction from specific contexts to maintain broad applicability.

**strategic-value** — Level 1
- Evidence: The veiled-variants chain provides niche utility for privacy-preserving text transformations, useful in specific workflows like legal document anonymization and customer support analysis. It is not a core or frequently used tool across all AI pipelines.
- Gap: Increase applicability and frequency of use by broadening use cases or integrating with more common workflows.
- Next: Explore additional domains and workflows where privacy-preserving text variants are valuable to increase adoption.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default veiledVariants function, exports named prompt functions scientificFramingPrompt, causalFramePrompt, softCoverPrompt
- Gap: No instruction builders or spec/apply split exports
- Next: Refactor to include instruction builders and spec/apply split functions to improve composability and API clarity

**composability** — Level 2
- Evidence: Chain composes internally by calling multiple prompt functions and aggregating results in veiledVariants
- Gap: No exported spec/apply split functions or instruction builders
- Next: Export spec and apply functions and instruction builders to enable external composition

**documentation** — Level 3
- Evidence: README has API section with parameter table for veiledVariants(text, context, config), multiple usage examples including Legal Document Processing and Customer Support Analysis, and detailed feature descriptions
- Gap: Missing architecture section, edge cases, performance notes, and composition guidance
- Next: Add comprehensive architecture overview, edge case handling, performance considerations, and guidance on composing with other chains in README

**prompt-engineering** — Level 2
- Evidence: Uses promptConstants.onlyJSONStringArray for JSON array enforcement, uses asXML for variable wrapping of the prompt with tag 'intent', defines extracted prompt builder functions scientificFramingPrompt, causalFramePrompt, softCoverPrompt, and uses these in the chain. No system prompts, temperature settings, or response_format usage detected.
- Gap: Missing system prompts, temperature tuning, and response_format usage to reach level 3.
- Next: Introduce system prompts and explicit temperature settings; implement response_format with JSON schemas for output validation.

**testing** — Level 2
- Evidence: Has index.spec.js with unit tests and index.examples.js with example tests, but no aiExpect usage
- Gap: Lacks aiExpect semantic validation and property-based or regression tests
- Next: Add aiExpect assertions in example tests and introduce property-based or regression tests

