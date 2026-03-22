# Maturity Audit Scorecards
> Generated 2026-02-22
> 50 chains audited, 741 dimension evaluations

## Tier 1 — Design Fitness

| Chain | Tier | architectural-fitness | composition-fit | design-efficiency | generalizability | strategic-value | Avg |
|-------|------|---|---|---|---|---|-----|
| ai-arch-expect | development | 2 | 1 | 1 | 3 | 4 | 2.2 |
| anonymize | standard | 2 | 2 | 2 | 4 | 3 | 2.6 |
| category-samples | standard | 3 | 3 | 3 | 4 | 3 | 3.2 |
| central-tendency | standard | 4 | 4 | 4 | 4 | 3 | 3.8 |
| collect-terms | standard | 3 | 3 | 4 | 4 | 3 | 3.4 |
| conversation | standard | 3 | 1 | 3 | 3 | 3 | 2.6 |
| conversation-turn-reduce | internal | 3 | 2 | 3 | 3 | 2 | 2.6 |
| date | standard | 2 | 1 | 2 | 4 | 3 | 2.4 |
| detect-patterns | standard | 3 | 2 | 3 | 4 | 3 | 3.0 |
| detect-threshold | standard | 3 | 2 | 3 | 4 | 3 | 3.0 |
| disambiguate | standard | 3 | 2 | 3 | 4 | 2 | 2.8 |
| dismantle | standard | 3 | 2 | 2 | 4 | 3 | 2.8 |
| document-shrink | standard | 2 | 1 | 1 | 4 | 3 | 2.2 |
| entities | core | 3 | 4 | 3 | 4 | 3 | 3.4 |
| expect | standard | 2 | 1 | 2 | 3 | 4 | 2.4 |
| extract-blocks | standard | 2 | 1 | 2 | 4 | 3 | 2.4 |
| extract-features | standard | 4 | 4 | 4 | 4 | 3 | 3.8 |
| filter | core | 3 | 2 | 3 | 3 | 3 | 2.8 |
| filter-ambiguous | standard | 3 | 3 | 4 | 4 | 2 | 3.2 |
| find | standard | 3 | 2 | 3 | 4 | 3 | 3.0 |
| glossary | standard | 3 | 2 | 3 | 4 | 2 | 2.8 |
| group | core | 3 | 2 | 3 | 4 | 3 | 3.0 |
| intersections | standard | 3 | 2 | 3 | 4 | 3 | 3.0 |
| join | standard | 3 | 1 | 3 | 4 | 3 | 2.8 |
| list | standard | 3 | 2 | 3 | 4 | 3 | 3.0 |
| llm-logger | standard | 2 | 1 | 1 | 3 | 3 | 2.0 |
| map | core | 3 | 2 | 3 | 3 | 3 | 2.8 |
| people | standard | 3 | 1 | 4 | 4 | 2 | 2.8 |
| pop-reference | standard | 3 | 1 | 3 | 3 | 1 | 2.2 |
| questions | standard | 3 | 2 | 3 | 4 | 3 | 3.0 |
| reduce | core | 3 | 2 | 4 | 4 | 3 | 3.2 |
| relations | standard | 2 | 4 | 2 | 3 | 3 | 2.8 |
| scale | standard | 3 | 4 | 3 | 4 | 3 | 3.4 |
| scan-js | development | 3 | 1 | 3 | 2 | 2 | 2.2 |
| score | core | 4 | 3 | 3 | 3 | 3 | 3.2 |
| set-interval | standard | 3 | 1 | 3 | 4 | 3 | 2.8 |
| socratic | standard | 3 | 1 | 3 | 4 | 3 | 2.8 |
| sort | core | 3 | 2 | 3 | 4 | 3 | 3.0 |
| split | standard | 3 | 2 | 3 | 4 | 3 | 3.0 |
| summary-map | standard | 3 | 2 | 3 | 4 | 3 | 3.0 |
| tag-vocabulary | standard | 3 | 2 | 3 | 4 | 3 | 3.0 |
| tags | standard | 2 | 4 | 2 | 4 | 3 | 3.0 |
| test | development | 3 | 1 | 4 | 3 | 3 | 2.8 |
| test-analysis | internal | 1 | 1 | 1 | 1 | 4 | 1.6 |
| test-analyzer | internal | 3 | 1 | 3 | 1 | 4 | 2.4 |
| themes | standard | 3 | 1 | 4 | 4 | — | 3.0 |
| timeline | standard | 2 | 2 | 2 | 4 | 3 | 2.6 |
| to-object | standard | 3 | 1 | 3 | 4 | 3 | 2.8 |
| truncate | standard | 3 | 2 | 3 | 4 | 2 | 2.8 |
| veiled-variants | standard | 3 | 1 | 3 | 3 | 1 | 2.2 |

### Design Alerts

These chains score below 2.0 on design fitness. NFR hardening (Tier 2) should wait until design issues are addressed.

- **test-analysis**: avg 1.6 — consider redesign before hardening

## Tier 2 — Implementation Quality

| Chain | Tier | api-surface | browser-server | code-quality | composability | documentation | errors-retry | events | logging | prompt-engineering | testing | token-management | Avg |
|-------|------|---|---|---|---|---|---|---|---|---|---|---|-----|
| ai-arch-expect | development | 2 | 0 | 3 | 2 | 3 | 0 | 0 | 0 | — | 2 | 0 | 1.2 |
| anonymize | standard | 4 | 0 | 3 | 4 | 3 | 2 | 1 | 0 | — | 4 | 0 | 2.1 |
| category-samples | standard | 2 | 0 | 3 | 2 | 3 | 3 | 1 | 0 | 2 | 2 | 0 | 1.6 |
| central-tendency | standard | 1 | 0 | — | 2 | 3 | 1 | 1 | 4 | 3 | 2 | 1 | 1.8 |
| collect-terms | standard | 2 | 0 | — | 2 | 3 | 0 | 0 | 0 | 0 | 4 | 1 | 1.2 |
| conversation | standard | 1 | 0 | — | — | 3 | 0 | 0 | 1 | 0 | 4 | 0 | 1.0 |
| conversation-turn-reduce | internal | 1 | 0 | — | — | 1 | 0 | 0 | 0 | 0 | 2 | 0 | 0.4 |
| date | standard | 1 | 0 | 4 | 2 | 3 | 3 | 1 | 4 | 3 | 4 | 0 | 2.3 |
| detect-patterns | standard | 1 | 0 | 2 | 2 | 3 | 0 | 0 | 0 | 3 | 4 | 0 | 1.4 |
| detect-threshold | standard | 1 | 0 | 3 | 2 | 3 | 1 | 1 | 0 | 3 | 2 | 1 | 1.5 |
| disambiguate | standard | 2 | 0 | 2 | 2 | 3 | 1 | 2 | 0 | 3 | 4 | 1 | 1.8 |
| dismantle | standard | 2 | — | — | 2 | 3 | — | — | — | 4 | 4 | — | 3.0 |
| document-shrink | standard | 1 | — | — | 2 | 3 | — | — | — | — | 4 | — | 2.5 |
| entities | core | 4 | 0 | 4 | 4 | 4 | 1 | 3 | 0 | 3 | 4 | 0 | 2.5 |
| expect | standard | 2 | 2 | — | 2 | 3 | — | 0 | 0 | 3 | 4 | 0 | 1.8 |
| extract-blocks | standard | 2 | 0 | 3 | 2 | 3 | 1 | 3 | 3 | 3 | 2 | 1 | 2.1 |
| extract-features | standard | 2 | 0 | — | 2 | 3 | 0 | 0 | 4 | 0 | 2 | 0 | 1.3 |
| filter | core | 1 | — | — | 2 | 3 | — | — | — | 3 | 4 | — | 2.6 |
| filter-ambiguous | standard | 1 | 0 | — | — | 2 | 0 | 0 | 0 | 0 | 2 | 1 | 0.7 |
| find | standard | 1 | 0 | 3 | 2 | 3 | 2 | 3 | 0 | — | 4 | 2 | 2.0 |
| glossary | standard | 2 | 0 | — | — | 3 | 0 | 0 | 0 | 3 | 3 | 1 | 1.3 |
| group | core | 1 | 0 | 3 | 2 | 3 | 1 | 4 | 2 | 2 | 4 | 2 | 2.2 |
| intersections | standard | 1 | 0 | 3 | 2 | 3 | 1 | 0 | 0 | 3 | 2 | 0 | 1.4 |
| join | standard | 1 | 0 | 3 | 1 | 3 | 1 | 1 | 0 | 0 | 4 | 0 | 1.3 |
| list | standard | 2 | 0 | 3 | 2 | 4 | 1 | 1 | 0 | 3 | 4 | 0 | 1.8 |
| llm-logger | standard | 1 | 0 | — | 2 | 3 | 0 | 0 | 0 | — | 2 | 0 | 0.9 |
| map | core | 1 | 0 | 4 | 2 | 3 | 3 | 3 | 3 | 2 | 2 | 2 | 2.3 |
| people | standard | 1 | 0 | — | 1 | 3 | 1 | 0 | 0 | 3 | 4 | 0 | 1.3 |
| pop-reference | standard | 1 | 0 | — | 2 | 3 | 1 | 1 | 0 | 3 | 4 | 0 | 1.5 |
| questions | standard | — | 0 | 3 | 2 | 3 | 1 | 0 | 0 | 3 | 4 | 1 | 1.7 |
| reduce | core | 1 | 0 | — | 2 | 3 | 1 | 3 | 2 | 3 | 4 | 2 | 2.1 |
| relations | standard | 4 | — | — | 4 | 4 | — | — | — | — | 4 | — | 4.0 |
| scale | standard | 4 | 0 | — | 4 | 4 | 1 | 0 | 0 | 3 | 2 | 0 | 1.8 |
| scan-js | development | — | 0 | 3 | 2 | 3 | 1 | 0 | 0 | 3 | 2 | 0 | 1.4 |
| score | core | 3 | 1 | — | 3 | 4 | 3 | 4 | 2 | — | 2 | 2 | 2.7 |
| set-interval | standard | 1 | 0 | 3 | 2 | 3 | 1 | 1 | 0 | 3 | 2 | 0 | 1.5 |
| socratic | standard | 1 | 0 | — | 2 | 3 | 1 | 4 | 4 | 3 | 4 | 1 | 2.3 |
| sort | core | 2 | 1 | 2 | — | 3 | 1 | 2 | 1 | 3 | 4 | 1 | 2.0 |
| split | standard | 1 | 0 | 3 | 1 | 3 | 1 | 1 | 1 | 3 | 4 | 1 | 1.7 |
| summary-map | standard | — | 0 | — | 2 | 3 | 0 | 0 | 0 | 2 | 4 | — | 1.4 |
| tag-vocabulary | standard | 2 | 0 | 3 | 2 | 3 | 1 | 0 | 0 | 4 | 4 | 0 | 1.7 |
| tags | standard | 4 | 0 | 3 | 4 | 4 | 1 | 1 | 0 | — | 4 | 0 | 2.1 |
| test | development | 1 | 0 | — | 2 | 3 | 1 | 0 | 0 | 3 | 4 | 0 | 1.4 |
| test-analysis | internal | 1 | 0 | 3 | 2 | 0 | 0 | 1 | 3 | 0 | 2 | 0 | 1.1 |
| test-analyzer | internal | 1 | 0 | 3 | 2 | 0 | 1 | 1 | 1 | 0 | 2 | 0 | 1.0 |
| themes | standard | 1 | 0 | 3 | 2 | 3 | 0 | 0 | 0 | 0 | 4 | 0 | 1.2 |
| timeline | standard | 1 | 1 | 3 | 2 | 3 | 1 | 1 | 1 | 3 | 4 | 1 | 1.9 |
| to-object | standard | 1 | 0 | 3 | 2 | 2 | 1 | 1 | 1 | 3 | 4 | 0 | 1.6 |
| truncate | standard | 1 | 0 | 3 | 0 | 3 | 0 | 0 | 0 | — | 4 | 1 | 1.2 |
| veiled-variants | standard | 1 | 0 | 2 | 2 | 3 | 0 | 0 | 0 | 2 | 2 | 0 | 1.1 |

## Detail

### ai-arch-expect (development)

#### Design Fitness

**architectural-fitness** — Level 2
- Evidence: 622 lines in a single module with multiple helper functions and bespoke processing modes; some complexity may be unnecessary but generally fits the problem.
- Gap: Refactor to reduce module size and separate concerns to improve clarity and maintainability.
- Next: Split the module into smaller focused components handling individual and bulk processing separately.

**composition-fit** — Level 1
- Evidence: Does not use other chains internally; reimplements batch processing and orchestration logic rather than composing existing primitives.
- Gap: Leverage existing library primitives like map, reduce, and score to improve composability.
- Next: Refactor to build on core batch processing chains instead of bespoke orchestration.

**design-efficiency** — Level 1
- Evidence: High LOC (622) for a single export with multiple helper functions and complex configuration; indicates significant design strain.
- Gap: Simplify design to reduce code size and helper function count.
- Next: Reduce complexity by modularizing and reusing existing library components.

**generalizability** — Level 3
- Evidence: Uses natural language instructions and works with file and data contexts; no hard dependency on specific test frameworks or runtimes.
- Gap: Further decouple from file system specifics to support broader data sources.
- Next: Abstract file system interactions to allow plugging in alternative data sources.

**strategic-value** — Level 4
- Evidence: Enables AI-powered architectural testing and validation with smart processing strategies and parallel execution, unlocking novel workflows for AI feature developers and process automation.


#### Implementation Quality

**api-surface** — Level 2
- Evidence: Exports eachFile, eachDir, fileContext, jsonContext, dataContext, listDir, countItems, aiArchExpect; README documents usage of aiArchExpect, eachFile, eachDir, countItems
- Gap: No instruction builders or spec/apply split exports
- Next: Implement and export instruction builders and spec/apply split functions to enhance API surface

**browser-server** — Level 0
- Evidence: Uses node:fs and node:path imports directly; no use of lib/env or runtime environment abstraction
- Gap: Use lib/env for environment detection and avoid direct node-only imports
- Next: Refactor to use lib/env and abstract file system access for browser compatibility

**code-quality** — Level 3
- Evidence: Clear separation of pure functions (createBatches, processBatchResults), well-named constants, extracted helper functions, no dead code
- Gap: Further modularization and composability to reach reference-quality
- Next: Refactor to increase composability and add comprehensive documentation for reference-quality

**composability** — Level 2
- Evidence: Exports multiple context builders (fileContext, jsonContext, dataContext) and utility functions; no spec/apply split functions
- Gap: Lacks spec/apply split and factory functions for higher composability
- Next: Introduce spec/apply split functions and factory functions to improve composability

**documentation** — Level 3
- Evidence: README has sections: Key Features, Usage with code examples, Configuration Options, Context Functions, Chunk Processing Metadata
- Gap: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- Next: Add detailed architecture overview, edge case handling, performance considerations, and composition guidance to README

**errors-retry** — Level 0
- Evidence: No import or use of lib/retry; error handling is basic try/catch without retry logic
- Gap: Add retry logic with lib/retry and define failure modes
- Next: Implement retry with lib/retry and define error handling strategies for transient failures

**events** — Level 0
- Evidence: Imports: no lib/progress-callback; no onProgress event emission or calls
- Gap: Add event emission using lib/progress-callback and emit standard lifecycle events
- Next: Import lib/progress-callback and emit start, complete, and step events during processing

**logging** — Level 0
- Evidence: Imports: lib/llm, lib/each-file, lib/each-dir; no import of lib/lifecycle-logger; no usage of createLifecycleLogger or logger calls
- Gap: Add lifecycle logging using createLifecycleLogger and logStart/logResult
- Next: Import lib/lifecycle-logger and instrument main processing functions with createLifecycleLogger and logStart/logResult calls

**testing** — Level 2
- Evidence: Has index.examples.js with example tests; no spec tests; no aiExpect usage
- Gap: Missing unit tests and aiExpect coverage
- Next: Add unit tests and integrate aiExpect for semantic validation

**token-management** — Level 0
- Evidence: No use of createBatches from lib/text-batch or token budget management; batching is done by fixed item counts
- Gap: Implement token-budget-aware batching using lib/text-batch createBatches
- Next: Integrate lib/text-batch createBatches with maxTokenBudget and outputRatio for token-aware chunking


### anonymize (standard)

#### Design Fitness

**architectural-fitness** — Level 2
- Evidence: At 410 lines in a single module, the chain is relatively large for its core idea. It uses the spec/apply pattern but does not use other library chains internally, suggesting some complexity that might be reduced by decomposing or leveraging existing primitives more.
- Gap: Refactor to leverage existing batch processing chains (map, filter, reduce) internally to reduce bespoke orchestration and complexity.
- Next: Decompose anonymize into smaller chains that compose with core batch primitives instead of a monolithic implementation.

**composition-fit** — Level 2
- Evidence: Exports spec/apply pattern and instruction builders, but internally does not compose with other library chains like map or filter. It could be expressed as a composition of existing chains rather than a standalone monolith.
- Gap: Internal orchestration should be refactored to build on existing batch processing chains to improve composability.
- Next: Refactor internal logic to use map, filter, reduce chains for batch operations instead of bespoke implementations.

**design-efficiency** — Level 2
- Evidence: 410 lines for a single export with multiple helper functions indicates moderate complexity. The code includes multiple config parameters and some bespoke orchestration, suggesting some friction and potential overcomplexity.
- Gap: Simplify design by reducing helper functions and configuration complexity, and by leveraging existing library primitives.
- Next: Streamline the implementation by extracting reusable components and reducing bespoke orchestration logic.

**generalizability** — Level 4
- Evidence: The chain accepts natural language instructions and works with any text input. It has no hard dependencies on specific runtimes or data formats and is isomorphic, supporting private or self-hosted LLMs.

**strategic-value** — Level 3
- Evidence: The anonymize chain is a core capability frequently needed in AI pipelines for privacy and data protection, enabling workflows that remove personal style and references from text. It supports multiple anonymization methods and integrates with LLMs, making it broadly useful.


#### Implementation Quality

**api-surface** — Level 4
- Evidence: Exports anonymizeMethod, anonymizeSpec, mapInstructions, filterInstructions, reduceInstructions, findInstructions, groupInstructions, applyAnonymization, createAnonymizer, anonymize

**browser-server** — Level 0
- Evidence: No usage of 'lib/env' or runtime environment detection; no browser/server environment handling
- Gap: Use 'lib/env' for environment detection to support isomorphic operation
- Next: Add environment detection via 'lib/env' and handle browser/server differences gracefully

**code-quality** — Level 3
- Evidence: Clear separation of concerns with extracted validators (validateInput), stage prompt builders (stage1Prompt, stage2Prompt, stage3Prompt), and instruction builders; no dead code; consistent naming
- Gap: Further modularization and composability for reference-quality example
- Next: Refactor to increase composability and document internal transformations explicitly

**composability** — Level 4
- Evidence: Exports anonymizeSpec() and applyAnonymization() split; includes instruction builders like mapInstructions, filterInstructions, reduceInstructions, findInstructions, groupInstructions; exports factory function createAnonymizer

**documentation** — Level 3
- Evidence: README has API usage example with import statement and method descriptions for STRICT, BALANCED, LIGHT
- Gap: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- Next: Add detailed architecture and composition guidance sections to README

**errors-retry** — Level 2
- Evidence: Uses 'lib/retry' for retrying calls; has input validation via validateInput throwing errors; no custom error types or advanced retry strategies
- Gap: Add multi-level retry, conditional retry, and attach error context to results
- Next: Enhance retry logic with conditional retry and enrich error information for better observability

**events** — Level 1
- Evidence: Imports include 'onProgress' config param and passes it through to retry calls, but no direct event emission via 'lib/progress-callback'
- Gap: Emit standard lifecycle events (start, complete, step) using progress-callback
- Next: Implement event emission using 'lib/progress-callback' to signal operation progress beyond pass-through

**logging** — Level 0
- Evidence: Imports do not include 'lib/lifecycle-logger', no usage of createLifecycleLogger or logger.info()
- Gap: Add lifecycle logging with createLifecycleLogger and logStart/logResult calls
- Next: Integrate 'lib/lifecycle-logger' and implement structured lifecycle logging in anonymize and related functions

**testing** — Level 4
- Evidence: Has index.spec.js with unit tests and index.examples.js using aiExpect

**token-management** — Level 0
- Evidence: No usage of 'lib/text-batch' or createBatches; no token budget management observed
- Gap: Implement token-budget-aware batching using createBatches
- Next: Integrate 'lib/text-batch' batching to manage token budgets for input texts


### category-samples (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: At 142 lines, the chain is concise and focused on its purpose. It builds on existing primitives like the 'list' chain and uses retry logic without reimplementing batch processing, showing proportional design.
- Gap: Minor simplifications could be made to further clarify processing phases.
- Next: Document the top-level function phases more explicitly to improve clarity.

**composition-fit** — Level 3
- Evidence: The chain composes with the library's primitives such as 'list' and 'retry' chains, exposing a clean function interface and enabling integration into pipelines, though it does not fully implement spec/apply patterns.
- Gap: Could adopt spec/apply and instruction builder patterns to enhance composability.
- Next: Refactor to expose spec/apply interfaces and instruction builders for better integration with other chains.

**design-efficiency** — Level 3
- Evidence: The implementation is clean and proportional to the problem complexity, with 142 lines and limited helper functions, avoiding unnecessary complexity or workarounds.
- Gap: Minor improvements in helper function consolidation could improve efficiency.
- Next: Review helper functions for potential consolidation or simplification.

**generalizability** — Level 4
- Evidence: The chain uses natural language instructions and works with any text input, without hard dependencies on specific runtimes or data formats, making it fully general and context-agnostic.

**strategic-value** — Level 3
- Evidence: The chain provides a core capability for generating representative samples across categories using AI, enabling workflows in educational content creation and marketing campaigns. It is frequently useful in AI pipelines for content generation.
- Gap: Could increase strategic value by enabling more dynamic or interactive sample generation workflows.
- Next: Explore integration with interactive feedback loops or adaptive sample generation based on user input.


#### Implementation Quality

**api-surface** — Level 2
- Evidence: Exports SAMPLE_GENERATION_PROMPT, buildSeedGenerationPrompt, categorySamples (default export), accepts config params context, count, diversityLevel, llm, maxAttempts, retryDelay, onProgress, now
- Gap: No instruction builders or spec/apply split
- Next: Implement instruction builders and spec/apply function split for composability

**browser-server** — Level 0
- Evidence: No usage of 'lib/env' or runtime environment detection; no isomorphic environment handling
- Gap: Use 'lib/env' for environment detection to support both browser and server
- Next: Refactor to use 'lib/env' for environment reads instead of direct environment checks

**code-quality** — Level 3
- Evidence: Clear function separation (buildSeedGenerationPrompt, categorySamples), descriptive naming, no dead code
- Gap: Further modularization and explicit transformations to reach reference-quality
- Next: Extract more pure functions and improve composability for reference-quality code

**composability** — Level 2
- Evidence: No spec/apply split, no instruction builders, no factory functions; composes other chains internally (uses list and retry modules)
- Gap: Missing spec/apply split and instruction builders for higher composability
- Next: Refactor to export spec/apply functions and instruction builders to enable higher composability

**documentation** — Level 3
- Evidence: README has API section with parameter table for categorySamples(categories, context, config), multiple usage examples including Educational Content Creation and Marketing Campaign Ideas, behavioral notes on diversity and context
- Gap: Lacks architecture section, edge cases, performance notes, and composition guidance
- Next: Add comprehensive architecture and performance notes, document edge cases and composition guidance in README

**errors-retry** — Level 3
- Evidence: Imports 'lib/retry' and uses retry() with a custom retryCondition callback for error handling
- Gap: Add custom error types, attach logs and structured context to errors
- Next: Define custom error classes and enhance error context and logging during retries

**events** — Level 1
- Evidence: Imports 'lib/retry' which accepts onProgress and passes it through to retry calls
- Gap: Emit standard lifecycle events (start, complete, step) using 'lib/progress-callback'
- Next: Integrate 'lib/progress-callback' to emit structured progress events during processing

**logging** — Level 0
- Evidence: No import of 'lib/lifecycle-logger' or usage of createLifecycleLogger or logger methods
- Gap: Add lifecycle logging with createLifecycleLogger and logStart/logResult calls
- Next: Import 'lib/lifecycle-logger' and instrument key functions with lifecycle logging

**prompt-engineering** — Level 2
- Evidence: Uses extracted prompt builder function 'buildSeedGenerationPrompt' to construct the prompt from the constant 'SAMPLE_GENERATION_PROMPT' template literal with variable replacements. No use of promptConstants from constants.js detected. No system prompt, temperature setting, or response_format usage observed. The chain uses a retry utility and a list chain for generation but does not incorporate advanced prompt engineering features like system prompts or response_format.
- Gap: Missing system prompts, temperature tuning, and response_format usage to reach level 3.
- Next: Incorporate system prompts to set role and context, explicitly set temperature for model calls, and use response_format with JSON schemas for output structuring.

**testing** — Level 2
- Evidence: Has index.examples.js using aiExpect, no spec tests
- Gap: Lacks unit tests covering edge cases and error paths
- Next: Add unit tests with edge case and error path coverage

**token-management** — Level 0
- Evidence: No usage of 'lib/text-batch' or createBatches for token budget management
- Gap: Implement token-budget-aware batching using 'createBatches'
- Next: Integrate 'lib/text-batch' to manage token budgets and batch inputs accordingly


### central-tendency (standard)

#### Design Fitness

**architectural-fitness** — Level 4
- Evidence: The chain is 167 LOC, split into 2 files, uses the map chain for batch processing, and cleanly separates instruction building and processing logic. It avoids bespoke infrastructure and has clear phases.
- Next: Maintain current modular design and monitor for complexity growth.

**composition-fit** — Level 4
- Evidence: The chain builds on the library's core map primitive, uses spec/apply patterns, and provides instruction builders, fitting fully into the composition philosophy and enabling novel workflows.
- Next: Encourage integration with other spec/apply chains for extended workflows.

**design-efficiency** — Level 4
- Evidence: At 167 LOC with 2 files and minimal helper functions, the implementation is proportional to the problem complexity. It leverages existing primitives and avoids unnecessary complexity.
- Next: Continue to refactor only as needed to keep code minimal and clear.

**generalizability** — Level 4
- Evidence: The chain uses natural language instructions and the core map chain, accepts generic string arrays, and has no hard dependencies on specific runtimes or data formats, making it fully general and context-agnostic.
- Next: Document general usage scenarios to encourage broad adoption.

**strategic-value** — Level 3
- Evidence: The chain provides a core capability for evaluating central tendency in datasets, enabling developers to assess graded typicality in AI pipelines. It is frequently useful for cognitive category analysis and batch processing of large datasets, which is a common need.
- Next: Promote usage examples to increase adoption in AI feature development.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default `centralTendency` function, no instruction builders or spec/apply split
- Gap: Lacks documented instruction builders and spec/apply split
- Next: Implement and export instruction builders and spec/apply functions to improve composability and API clarity

**browser-server** — Level 0
- Evidence: No usage of `lib/env` or environment detection patterns
- Gap: Add environment abstraction using `lib/env`
- Next: Refactor to use `lib/env` for environment reads instead of direct environment access

**composability** — Level 2
- Evidence: Uses internal map chain for batch processing, but no spec/apply split or instruction builders exported
- Gap: No exported spec/apply functions or instruction builders
- Next: Export spec/apply split functions and instruction builders to reach next composability level

**documentation** — Level 3
- Evidence: README has Overview, Basic Usage, Parameters, Return Value, Cognitive Science Applications, Integration with Other Chains sections describing API and usage
- Gap: Missing comprehensive architecture, edge cases, performance notes, and composition guidance
- Next: Add architecture section, edge case handling notes, performance considerations, and composition guidance to README

**errors-retry** — Level 1
- Evidence: Uses `maxAttempts` config for retry, but no advanced retry logic or error context
- Gap: Lacks multi-level retry, conditional retry, and error context attachment
- Next: Enhance retry logic with conditional retry and attach error context to results

**events** — Level 1
- Evidence: Accepts `onProgress` in config and passes it to inner `map` call
- Gap: Does not emit standard lifecycle events like start, complete, step
- Next: Implement emission of standard events using `lib/progress-callback`

**logging** — Level 4
- Evidence: Imports `lib/lifecycle-logger`, uses `createLifecycleLogger`, calls `logStart`, `logConstruction`, `logResult`, `logError`

**prompt-engineering** — Level 3
- Evidence: Uses CENTRAL_TENDENCY_PROMPT constant from verblets/central-tendency-lines; constructs prompt via template literals replacing {context}, {coreFeatures}, {outputRequirements}; sets response_format with JSON schema centralTendencyResultsJsonSchema; uses map infrastructure for batch processing; includes lifecycle logging; no explicit system prompt or temperature setting found.
- Gap: Missing explicit system prompt and temperature tuning to reach level 4.
- Next: Add a system prompt to set the LLM role and tune temperature and penalties for improved prompt control.

**testing** — Level 2
- Evidence: Has `index.examples.js` with example tests using `aiExpect`, no unit spec tests
- Gap: Missing unit tests covering edge cases and error paths
- Next: Add unit tests with edge case and error path coverage alongside existing example tests

**token-management** — Level 1
- Evidence: Uses manual chunking via `chunkSize` (aliased as `batchSize`) parameter
- Gap: Does not use `createBatches` or token-budget-aware splitting
- Next: Integrate `createBatches` for token-budget-aware input chunking


### collect-terms (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: At 55 lines, the chain is concise and proportional to its problem complexity. It builds on existing library primitives (list, score) rather than reimplementing batch processing. The design phases (chunking, term extraction, deduplication, scoring) are clear.

**composition-fit** — Level 3
- Evidence: The chain composes existing core chains (list, score) internally and exposes a clean async function interface. It acts as a pipeline step but does not export spec/apply or instruction builders itself.
- Gap: Expose spec/apply pattern and instruction builders to fully integrate with library composition model.
- Next: Refactor to separate specification generation and application phases, and export instruction builders for use with collection chains.

**design-efficiency** — Level 4
- Evidence: The implementation is minimal (55 LOC), with no helper functions and no complex workarounds. It leverages existing chains to avoid duplicated logic, making the design obvious and efficient.

**generalizability** — Level 4
- Evidence: The chain accepts arbitrary text input and natural language instructions, with no hard dependencies on specific runtimes or data formats. It is isomorphic and context-agnostic.

**strategic-value** — Level 3
- Evidence: The chain provides a core capability frequently needed in AI pipelines: extracting key terms for search and retrieval, enabling improved document relevance. It is used across multiple domains as shown in README examples.


#### Implementation Quality

**api-surface** — Level 2
- Evidence: Exports default 'collectTerms', destructures shared config params 'chunkLen', 'topN', 'llm'
- Gap: No instruction builders or spec/apply split
- Next: Implement instruction builders and spec/apply split for the chain

**browser-server** — Level 0
- Evidence: No use of 'lib/env' or runtime environment detection; no browser/server compatibility code
- Gap: Use 'lib/env' for environment detection to support both browser and server
- Next: Integrate 'lib/env' and add environment checks for isBrowser/isNode

**composability** — Level 2
- Evidence: Composes other chains internally by calling 'list' and 'score' chains
- Gap: No exported spec/apply functions or instruction builders
- Next: Add spec/apply split functions and instruction builders to improve composability

**documentation** — Level 3
- Evidence: README has API section 'collectTerms(text, config)' with parameter table for 'chunkLen', 'topN', 'llm', multiple usage examples including Technical Documentation, Research Papers, Legal Documents, and Best Practices section
- Gap: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- Next: Add architecture overview, edge case handling, performance considerations, and composition guidance to README

**errors-retry** — Level 0
- Evidence: No error handling or retry logic present; no try/catch or retry imports
- Gap: Add basic retry logic using 'lib/retry' with default 429-only policy
- Next: Implement error handling and retry with 'lib/retry' to handle transient failures

**events** — Level 0
- Evidence: No import of 'lib/progress-callback' or event emission functions
- Gap: Implement event emission using progress-callback standard events
- Next: Add 'lib/progress-callback' import and emit standard lifecycle events

**logging** — Level 0
- Evidence: No import of 'lib/lifecycle-logger' or usage of logging functions
- Gap: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- Next: Import 'lib/lifecycle-logger' and implement structured lifecycle logging

**prompt-engineering** — Level 0
- Evidence: Inline template literals used directly in calls to the 'list' and 'score' functions without any shared prompt utilities or constants. No use of asXML or other prompt helper modules. No system prompts, temperature settings, or response_format usage detected.
- Gap: Missing use of shared prompt utilities such as asXML for variable wrapping, promptConstants, system prompts, temperature tuning, and response_format usage.
- Next: Refactor prompt strings to use asXML for variable wrapping and incorporate promptConstants to improve prompt modularity and maintainability.

**testing** — Level 4
- Evidence: Has 'index.spec.js' with unit tests and 'index.examples.js' using 'aiExpect'

**token-management** — Level 1
- Evidence: Manual chunking implemented via splitIntoChunks function
- Gap: Use 'createBatches' for token-budget-aware splitting
- Next: Replace manual chunking with 'createBatches' from 'lib/text-batch' for token-aware batching


### conversation (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: At 249 LOC across 2 files, the design is proportional to the problem complexity. It uses a clear class structure with configurable policies and concurrency control, and leverages an existing conversationTurnReduce chain. The architecture is clean with clear phases and no unnecessary abstractions.

**composition-fit** — Level 1
- Evidence: The chain uses the conversationTurnReduce chain internally as a default bulkSpeakFn, but overall it is a standalone orchestrator class rather than a composable pipeline step. It does not expose spec/apply or instruction builders, limiting its integration with other library primitives.
- Gap: Refactor to expose spec/apply pattern and instruction builders to enable composition with other chains.
- Next: Extract conversation turn generation into spec/apply chains and provide instruction builders for integration.

**design-efficiency** — Level 3
- Evidence: The implementation is 249 LOC with a single main class and one helper module, proportional to the complexity of multi-speaker conversation orchestration. It uses concurrency control and configurable policies efficiently without excessive helpers or workarounds.

**generalizability** — Level 3
- Evidence: The chain accepts natural language instructions and speaker metadata, works with any text data, and has optional LLM configuration. It does not depend on specific frameworks or data formats, making it general purpose across domains.

**strategic-value** — Level 3
- Evidence: The conversation chain enables realistic multi-speaker transcript generation with intelligent turn-taking and contextual responses, a core capability frequently needed in AI pipelines for dialogue simulation and conversational AI. It supports configurable rules and custom LLM functions, making it broadly useful.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default class Conversation only, no named exports, config params weights, minSpeakers, maxSpeakers documented in README
- Gap: No instruction builders or spec/apply split
- Next: Introduce instruction builders or spec/apply split exports to improve composability and API clarity

**browser-server** — Level 0
- Evidence: No usage of `lib/env` or environment detection; no process.env usage
- Gap: Use `lib/env` for environment reads to support both browser and server
- Next: Integrate `lib/env` and replace any direct environment checks with it

**documentation** — Level 3
- Evidence: README has Usage section with example, Constructor Parameters section listing config params weights, minSpeakers, maxSpeakers, and detailed Methods section
- Gap: Missing architecture section, edge cases, performance notes, and composition guidance
- Next: Add comprehensive architecture and performance documentation, include edge cases and composition guidance in README

**errors-retry** — Level 0
- Evidence: No usage of `lib/retry` or retry logic; errors thrown directly without handling
- Gap: Basic retry via `lib/retry` with default 429-only policy
- Next: Add retry logic using `lib/retry` for transient errors

**events** — Level 0
- Evidence: No import of `lib/progress-callback` and no event emission code found
- Gap: Accepts `onProgress` callback and passes it through to inner calls
- Next: Add support for `onProgress` callback and pass it to inner functions

**logging** — Level 1
- Evidence: Uses `console.warn` in `run` method for error logging (e.g., 'Speaker ${speaker.id} failed:') but no import or usage of `lib/lifecycle-logger`
- Gap: Accepts a logger config and uses `logger?.info()` inline
- Next: Add a logger parameter to config and replace console.warn with logger.info calls

**prompt-engineering** — Level 0
- Evidence: No prompt imports or usage of shared prompt utilities; no promptConstants used; no system prompt, temperature setting, or response_format usage; prompts appear to be inline string concatenations or function calls without prompt engineering patterns.
- Gap: Missing use of asXML for variable wrapping and shared prompt utilities.
- Next: Refactor prompt construction to use asXML for variable wrapping and integrate promptConstants from src/prompts/constants.js.

**testing** — Level 4
- Evidence: Has index.spec.js with unit tests, index.examples.js using aiExpect

**token-management** — Level 0
- Evidence: No token management code or usage of `lib/text-batch` or `createBatches`
- Gap: Manual chunking or token-budget-aware splitting
- Next: Implement token-budget-aware batching using `createBatches`


### conversation-turn-reduce (internal)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: At 68 lines, the module is concise and focused, using the map chain internally without reimplementing batch processing. The design is proportional to the problem with clear phases and no unnecessary abstractions.

**composition-fit** — Level 2
- Evidence: The module uses the map chain internally but is an internal helper not designed as a composable pipeline step itself. It does not expose spec/apply or instruction builders for external composition.
- Gap: Expose a clean function interface and instruction builders to enable composition with other chains.
- Next: Refactor to provide composable interfaces and integrate with the library's spec/apply pattern.

**design-efficiency** — Level 3
- Evidence: The implementation is concise (68 LOC), with no helper functions or complex configuration, proportional to the problem complexity. It leverages existing primitives without workarounds.

**generalizability** — Level 3
- Evidence: The module uses natural language instructions and works with generic speaker descriptions and conversation history, without hard dependencies on specific runtimes or data formats, making it broadly applicable across domains.

**strategic-value** — Level 2
- Evidence: This internal helper module supports multi-speaker conversation generation, enabling a useful but specialized feature within the conversation chain. It is not directly used by developers but underpins a real problem solution, indicating moderate frequency and utility.
- Gap: Increase direct usability or expose more general interfaces to broaden developer reach.
- Next: Refactor to expose composable interfaces or integrate with other chains for wider applicability.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default function `conversationTurnReduce` only
- Gap: No documented named exports or shared config destructuring
- Next: Document the default export and add shared config destructuring if applicable

**browser-server** — Level 0
- Evidence: No usage of 'lib/env' or environment detection; no browser/server compatibility code.
- Gap: Use 'lib/env' for environment detection to support both browser and server environments.
- Next: Integrate 'lib/env' and add environment checks to enable isomorphic support.

**documentation** — Level 1
- Evidence: README exists with basic description and internal usage example
- Gap: Missing API section with parameter table and shared config reference
- Next: Add an API section detailing parameters and shared config usage

**errors-retry** — Level 0
- Evidence: No error handling or retry logic detected; errors are thrown directly without retry.
- Gap: Add retry logic using 'lib/retry' and input validation with defined failure modes.
- Next: Implement retry with 'lib/retry' and add input validation with graceful error handling.

**events** — Level 0
- Evidence: No imports related to event emission (no 'lib/progress-callback'), no event emission detected.
- Gap: Add event emission using 'lib/progress-callback' with standard events like start and complete.
- Next: Import 'lib/progress-callback' and emit standard lifecycle events during processing.

**logging** — Level 0
- Evidence: No imports related to logging (no 'lib/lifecycle-logger'), no logger usage detected.
- Gap: Add lifecycle logging using 'lib/lifecycle-logger' with 'createLifecycleLogger' and log framing.
- Next: Import 'lib/lifecycle-logger' and implement 'createLifecycleLogger' with 'logStart' and 'logResult' calls.

**prompt-engineering** — Level 0
- Evidence: The chain uses inline template literals for prompt construction, e.g., building 'historySnippet' and 'baseContext' via string concatenation. There are no prompt imports or usage of promptConstants. No system prompts, temperature settings, or response_format usage are present. The chain uses a simple map function to generate responses without shared prompt utilities or wrappers like asXML.
- Gap: Missing use of shared prompt utilities such as asXML for variable wrapping, promptConstants for reusable fragments, system prompts, temperature tuning, and response_format usage.
- Next: Refactor prompt construction to use asXML for variable wrapping and incorporate promptConstants to improve reusability and maintainability.

**testing** — Level 2
- Evidence: Has `index.spec.js` with unit tests and `index.examples.js` without aiExpect
- Gap: Missing aiExpect coverage for semantic validation
- Next: Add aiExpect assertions in example tests for output quality validation

**token-management** — Level 0
- Evidence: No token management imports or usage (no 'lib/text-batch' or 'createBatches').
- Gap: Implement token-budget-aware input splitting using 'createBatches' or similar.
- Next: Add token-aware batching to handle large inputs efficiently.


### date (standard)

#### Design Fitness

**architectural-fitness** — Level 2
- Evidence: At 255 lines across 2 files, the chain is moderately complex but some complexity may be unnecessary. It does not use the spec/apply pattern and lacks default export, indicating room for simplification and clearer decomposition.
- Gap: Refactor to use spec/apply pattern and reduce complexity by clearer phase separation.
- Next: Introduce spec/apply pattern to separate specification generation and application phases for date extraction.

**composition-fit** — Level 1
- Evidence: The chain does not use other chains internally nor expose composition primitives; it is a standalone module without composable interfaces.
- Gap: Refactor to build on existing library primitives like map or filter and expose spec/apply interfaces.
- Next: Decompose the date chain into spec/apply components and integrate with batch processing chains to enable composition.

**design-efficiency** — Level 2
- Evidence: 255 lines with multiple imports and helper functions indicate moderate complexity; some helper functions and retry logic add to LOC but the design mostly works.
- Gap: Reduce helper functions and simplify retry logic to improve efficiency.
- Next: Streamline helper functions and consolidate retry handling to reduce code complexity.

**generalizability** — Level 4
- Evidence: The chain accepts natural language instructions and works with any text input without hard dependencies on specific frameworks or data formats, making it fully general and context-agnostic.

**strategic-value** — Level 3
- Evidence: The date chain is a core capability frequently needed in AI pipelines for extracting and normalizing dates from text, enabling workflows like document processing and timeline extraction. It is used across many projects as indicated by its standard tier and integration in the portfolio.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default async function 'date' only; no named exports or instruction builders; no spec/apply split
- Gap: No instruction builders or spec/apply split exports
- Next: Introduce instruction builders and spec/apply split exports to improve composability and API clarity

**browser-server** — Level 0
- Evidence: No usage of `lib/env` or environment detection patterns
- Gap: Use `lib/env` for environment reads to support isomorphic operation
- Next: Refactor to use `lib/env` for environment detection instead of direct environment checks

**code-quality** — Level 4
- Evidence: Clean separation of concerns, extracted pure functions like `extractDate`, `validateDate`, clear naming, no dead code

**composability** — Level 2
- Evidence: No spec/apply split exports; no instruction builders; chain composes other chains internally (imports 'bool' from '../../verblets/bool/index.js')
- Gap: Missing spec/apply split and instruction builders for higher composability
- Next: Implement spec/apply split functions and instruction builders for the date chain

**documentation** — Level 3
- Evidence: README has API section with parameter table listing 'text', 'instructions', 'config' including 'format', 'timezone', 'includeTime', 'llm'; multiple usage examples in README; behavioral notes on intelligent format recognition, relative date processing, context-aware extraction, confidence scoring, timezone support
- Gap: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- Next: Add architecture overview, edge case handling, performance considerations, and composition guidance to README

**errors-retry** — Level 3
- Evidence: Uses `retry` with `retryOnAll: true`, multi-level retry logic in main function, throws errors to trigger retry
- Gap: Add custom error types and attach structured error context
- Next: Define and use custom error classes with attached context for better error observability

**events** — Level 1
- Evidence: Accepts `onProgress` in config but only passes it to `retry` calls
- Gap: Emit standard lifecycle events (start, complete, step) via progress-callback
- Next: Implement emitting standard events using `lib/progress-callback` during chain phases

**logging** — Level 4
- Evidence: Imports `lib/lifecycle-logger`, uses `createLifecycleLogger`, calls `logStart`, `logEvent`, `logResult`

**prompt-engineering** — Level 3
- Evidence: Uses extracted prompt builder functions buildExpectationPrompt, buildDatePrompt, buildValidationPrompt. Uses promptConstants including asDate, asUndefinedByDefault, contentIsQuestion, explainAndSeparate, explainAndSeparatePrimitive, asWrappedArrayJSON, asJSON, asWrappedValueJSON. Uses response_format with JSON schemas dateValueSchema and dateExpectationsSchema in callLlm calls. Uses system prompt patterns via promptConstants fragments. Temperature is not explicitly set, so default is used. Response_format is consistently used for structured output.
- Gap: Temperature tuning and multi-stage prompt pipelines with frequency/presence penalty tuning are missing.
- Next: Introduce temperature settings and multi-stage prompt pipelines with penalty tuning to improve prompt control.

**testing** — Level 4
- Evidence: Has 'index.spec.js' with unit tests and 'index.examples.js' using 'aiExpect' for semantic validation

**token-management** — Level 0
- Evidence: No use of `createBatches` or token-budget-aware splitting
- Gap: Implement token-budget-aware input chunking using `createBatches`
- Next: Integrate `createBatches` to manage token budgets for prompts and inputs


### detect-patterns (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: At 128 LOC and 2 files, the design is clean and proportional to the problem complexity. It builds on the reduce chain primitive rather than reimplementing batch processing, with clear phases: filtering input, generating instructions, and reducing to patterns.
- Next: Maintain modularity and clarity in processing steps.

**composition-fit** — Level 2
- Evidence: detect-patterns uses the reduce chain internally as an orchestrator but does not expose spec/apply or instruction builders for other collection chains, making it a pipeline step but not a full composition citizen.
- Gap: Expose spec/apply pattern and instruction builders to integrate with other chains and enable novel workflows.
- Next: Refactor to provide spec/apply exports and instruction builders for pattern detection to enhance composability.

**design-efficiency** — Level 3
- Evidence: With 128 LOC and minimal helper functions, the implementation is efficient and proportional to the problem complexity. It avoids unnecessary complexity and reuses existing primitives.
- Next: Continue to monitor for opportunities to simplify or reduce LOC without sacrificing clarity.

**generalizability** — Level 4
- Evidence: The module accepts generic object arrays and uses natural language instructions for pattern detection, with no hard dependencies on specific runtimes or data formats, making it fully general and context-agnostic.
- Next: Ensure continued adherence to generic input handling and optional runtime dependencies.

**strategic-value** — Level 3
- Evidence: detect-patterns is a 128 LOC module that provides a core capability to find recurring patterns in object collections, enabling developers to discover common structures and value ranges. It solves a real problem frequently encountered in AI pipelines involving data analysis and transformation.
- Next: Promote usage examples and integration to increase adoption frequency.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default function detectPatterns, no named exports
- Gap: No instruction builders or spec/apply split
- Next: Introduce instruction builders and spec/apply split exports to improve composability and API clarity

**browser-server** — Level 0
- Evidence: No usage of 'lib/env' or environment detection; no references to process.env or node/browser specific code.
- Gap: Use 'lib/env' for environment detection to support both browser and server environments.
- Next: Refactor environment checks to use 'lib/env' and add tests for browser compatibility.

**code-quality** — Level 2
- Evidence: Code is clean with clear naming and extracted pure functions like filterObject; no dead code detected.
- Gap: Improve separation of concerns and composability for higher level.
- Next: Refactor to separate orchestration and core logic into composable functions.

**composability** — Level 2
- Evidence: No spec/apply split exports, no instruction builders; limited to max level 2 per ceiling
- Gap: Missing spec/apply split and instruction builders
- Next: Refactor to export spec/apply functions and instruction builders to enable higher composability

**documentation** — Level 3
- Evidence: README has Usage section with import example, Example section with community garden use case, Parameters and Returns sections
- Gap: Missing architecture section, edge cases, performance notes, composition guidance
- Next: Add comprehensive architecture and performance notes, edge cases, and composition guidance to README

**errors-retry** — Level 0
- Evidence: No error handling or retry logic detected; no import of 'lib/retry'.
- Gap: Add basic retry logic and error handling to improve robustness.
- Next: Use 'lib/retry' with default retry policy and add try/catch blocks around async calls.

**events** — Level 0
- Evidence: No import of 'lib/progress-callback' or usage of event emission functions.
- Gap: Implement event emission using 'lib/progress-callback' to emit standard lifecycle events.
- Next: Add 'onProgress' config and emit start, complete, and step events during processing.

**logging** — Level 0
- Evidence: No imports related to logging such as 'lib/lifecycle-logger', no logger usage found.
- Gap: Add lifecycle logging with createLifecycleLogger and logStart/logResult calls.
- Next: Import 'lib/lifecycle-logger' and implement structured lifecycle logging in detectPatterns function.

**prompt-engineering** — Level 3
- Evidence: Uses a response_format with a JSON schema (PATTERN_RESPONSE_FORMAT) for structured output; employs a system prompt style instruction in 'patternInstructions' template literal; sets temperature implicitly via llm options (not explicitly shown but likely configurable); uses shared reduce function for prompt execution; no use of promptConstants or asXML variable wrapping detected.
- Gap: Does not use promptConstants or extracted prompt builder functions; no multi-stage prompt pipeline or advanced tuning like frequency/presence penalties.
- Next: Refactor prompt instructions into reusable promptConstants and extract prompt builder functions to improve modularity and reuse.

**testing** — Level 4
- Evidence: Has index.spec.js with unit tests and index.examples.js using aiExpect

**token-management** — Level 0
- Evidence: No usage of 'lib/text-batch' or token budget management functions.
- Gap: Implement token-budget-aware input chunking using createBatches.
- Next: Integrate 'createBatches' to manage input size and token budgets effectively.


### detect-threshold (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: The design is clean and proportional: 275 LOC focused on a single responsibility (threshold detection). It builds on the reduce chain primitive and uses clear phases: statistics calculation, data enrichment, batch analysis, and final recommendation. No bespoke infrastructure or reimplementation of batch processing is evident.
- Gap: Minor complexity in handling batch data strings and JSON schema could be simplified.
- Next: Refactor batch data preparation to use existing primitives more directly, reducing manual string handling.

**composition-fit** — Level 2
- Evidence: The chain uses the reduce primitive internally but does not expose spec/apply or instruction builder patterns itself. It acts as a pipeline step with a clean function interface but is not yet a full composition citizen enabling novel workflows.
- Gap: Expose spec/apply interfaces and instruction builders to align with library composition patterns.
- Next: Refactor to split analysis and application phases into composable chains with instruction builders.

**design-efficiency** — Level 3
- Evidence: At 275 LOC with a single main export and moderate helper functions, the implementation is efficient and proportional to the problem complexity. It avoids excessive helpers or duplicated logic and uses imports judiciously.
- Gap: Could reduce some manual data string batching and JSON schema handling to improve clarity.
- Next: Simplify data batching and schema validation by leveraging existing library utilities.

**generalizability** — Level 4
- Evidence: The chain accepts arbitrary data arrays and target property names, uses natural language goals, and relies on generic LLM calls. It has no hard dependencies on specific frameworks or data formats, making it fully general and adaptable.

**strategic-value** — Level 3
- Evidence: The detect-threshold chain addresses a core AI pipeline need: adaptive threshold detection for numeric data, enabling nuanced risk-based decisions. It is moderately sized (275 LOC) and used in standard tier, indicating frequent developer use. It unlocks workflows for dynamic thresholding that were previously manual or heuristic-based.
- Gap: Could increase strategic value by integrating with more domain-specific workflows or exposing more composable interfaces.
- Next: Develop additional instruction builders or spec/apply patterns to enable easier integration in diverse AI pipelines.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default function detectThreshold only, no named exports or instruction builders
- Gap: No instruction builders or spec/apply split exports
- Next: Introduce instruction builders and split spec/apply functions to enhance API composability

**browser-server** — Level 0
- Evidence: No usage of 'lib/env' or runtime environment detection; no isomorphic environment handling
- Gap: Use 'lib/env' for environment detection to support both browser and server
- Next: Refactor environment checks to use 'lib/env' proxy and runtime.isBrowser/runtime.isNode

**code-quality** — Level 3
- Evidence: Clear function separation (calculateStatistics, detectThreshold), descriptive naming, no dead code, structured error handling with throw, extracted pure functions
- Gap: Further modularization and composability to reach reference-quality
- Next: Refactor to separate orchestration and core logic more explicitly and add comprehensive documentation

**composability** — Level 2
- Evidence: No spec/apply split or instruction builders, but composes other chains internally (imports reduce, callLlm, retry) as chain-of-chains
- Gap: Lacks spec/apply split and instruction builders for external composition
- Next: Implement spec/apply split functions and instruction builders to enable higher composability

**documentation** — Level 3
- Evidence: README has Usage section with example code, API section documenting detectThreshold({ data, targetProperty, goal, [options] }) with parameter descriptions and return value
- Gap: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- Next: Add detailed architecture overview, edge case handling, performance considerations, and guidance on composing this chain with others

**errors-retry** — Level 1
- Evidence: Imports 'retry' from 'lib/retry' and uses it with default retry policy; basic error handling with throw for input validation
- Gap: Implement multi-level retry strategies, conditional retry, and attach error context
- Next: Enhance retry logic with conditional retry and error context attachment for better error handling

**events** — Level 1
- Evidence: Imports 'onProgress' parameter and passes it through to inner calls (e.g., retry and reduce) but no direct event emission detected
- Gap: Emit standard lifecycle events like start, complete, and step using 'lib/progress-callback'
- Next: Implement event emission calls such as emitStart, emitComplete, and emitStep using 'lib/progress-callback'

**logging** — Level 0
- Evidence: No import of 'lib/lifecycle-logger' or usage of createLifecycleLogger or logger methods
- Gap: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- Next: Import 'lib/lifecycle-logger' and implement createLifecycleLogger with logStart and logResult calls

**prompt-engineering** — Level 3
- Evidence: Uses asXML for variable wrapping (from ../../prompts/wrap-variable.js), employs response_format with JSON schemas for structured output (json_schema with accumulatorSchema and thresholdResultSchema), uses retry and callLlm with temperature and maxAttempts settings, and includes system prompt style instructions in template literals.
- Gap: Does not implement multi-stage prompt pipelines or frequency/presence penalty tuning.
- Next: Introduce multi-stage prompt pipelines with frequency/presence penalty tuning to improve prompt control and output quality.

**testing** — Level 2
- Evidence: Has index.examples.js using aiExpect for example tests, no unit spec tests
- Gap: Missing unit tests covering edge cases and error paths
- Next: Add unit tests with vitest covering edge cases and error handling

**token-management** — Level 1
- Evidence: Manual chunking of data into batches with ITEMS_PER_LINE constant; no use of createBatches or token-budget-aware splitting
- Gap: Adopt 'createBatches' for token-budget-aware input splitting
- Next: Replace manual chunking with 'createBatches' to manage token budgets automatically


### disambiguate (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: At 124 lines, the chain is concise and focused on its problem. It cleanly separates phases: meaning extraction and scoring, and builds on existing primitives like score without reimplementing batch processing.
- Gap: Minor simplifications could be made but overall design is proportional and clear.
- Next: Review for any redundant abstractions and document the clear phase separation to maintain architectural clarity.

**composition-fit** — Level 2
- Evidence: The chain exposes a clean function interface and uses the score chain internally, but does not itself expose spec/apply patterns or instruction builders for further composition.
- Gap: Refactor to expose spec/apply interfaces and instruction builders to better align with the library's composition philosophy.
- Next: Extract spec generation and application steps as separate composable chains or functions to enable pipeline integration.

**design-efficiency** — Level 3
- Evidence: The implementation is efficient and proportional to the problem complexity with 124 LOC and limited helper functions. It avoids unnecessary complexity and workarounds.

**generalizability** — Level 4
- Evidence: The chain accepts natural language instructions and works with any text input without hard dependencies on specific runtimes or data formats, making it fully general and context-agnostic.

**strategic-value** — Level 2
- Evidence: The disambiguate chain solves a real problem of resolving ambiguous terms using LLMs, enabling moderately frequent use in AI workflows. It is not a core primitive but a useful tool as indicated by its moderate LOC (124) and focused functionality.
- Gap: Increase its applicability by integrating with more pipelines or expanding its capabilities to handle more complex disambiguation scenarios.
- Next: Develop additional interfaces or composition patterns to allow easier integration with other chains and workflows.


#### Implementation Quality

**api-surface** — Level 2
- Evidence: Exports 'getMeanings' named export and default export 'disambiguate', accepts shared config params 'model', 'llm', 'maxAttempts', 'onProgress', 'now'
- Gap: No instruction builders or spec/apply split
- Next: Implement instruction builders and spec/apply split for composability

**browser-server** — Level 0
- Evidence: No usage of 'lib/env' or runtime environment detection; no evidence of isomorphic environment support
- Gap: Use 'lib/env' for environment detection to support both browser and server
- Next: Refactor to use 'lib/env' for environment reads instead of direct environment access

**code-quality** — Level 2
- Evidence: Clear function naming, extracted pure functions like createModelOptions, no dead code, but some duplication of createModelOptions pattern
- Gap: Extract duplicated createModelOptions to shared utility, improve structure for composability
- Next: Refactor createModelOptions into shared utility and improve modularity

**composability** — Level 2
- Evidence: No spec/apply split exports, no instruction builders; chain composes 'score' internally
- Gap: Missing spec/apply split and instruction builders for higher composability
- Next: Add spec/apply split functions and instruction builders to enable higher composability

**documentation** — Level 3
- Evidence: README has API section documenting 'disambiguate({ term, context, ...config })' and 'getMeanings(term, config)', includes usage examples and shared config reference
- Gap: Missing comprehensive architecture, edge cases, performance notes, and composition guidance
- Next: Add architecture section, edge cases, performance notes, and composition guidance to README

**errors-retry** — Level 1
- Evidence: Imports 'lib/retry' and uses retry() with default 429-only policy, no input validation or advanced retry strategies
- Gap: Add input validation, conditional retry, and defined failure modes
- Next: Implement input validation and enhance retry logic with conditional retry and failure handling

**events** — Level 2
- Evidence: Imports 'lib/progress-callback' and calls 'emitStepProgress' to emit step events
- Gap: Emit batch-level events like batchStart, batchProcessed, batchComplete
- Next: Implement batch-level event emission using progress-callback's batch event functions

**logging** — Level 0
- Evidence: Imports do not include 'lib/lifecycle-logger', no usage of createLifecycleLogger or logStart/logResult
- Gap: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- Next: Integrate 'lib/lifecycle-logger' and use createLifecycleLogger with logStart and logResult calls

**prompt-engineering** — Level 3
- Evidence: Uses promptConstants.onlyJSONStringArray for prompt framing; constructs prompt with template literals embedding the constant; employs response_format with a JSON schema (disambiguateMeaningsSchema) in createModelOptions; uses system prompt indirectly via promptConstants; temperature not explicitly set (default used); no response_format usage in the prompt string itself but in model options; no use of asXML or other prompt helper modules; multi-stage prompt pipeline implied by separate getMeanings and score calls.
- Gap: Explicit temperature tuning and system prompt usage missing; no multi-stage prompt pipeline with frequency/presence penalty tuning.
- Next: Introduce explicit temperature settings and system prompts; consider adding frequency/presence penalty tuning for improved control.

**testing** — Level 4
- Evidence: Has 'index.spec.js' with unit tests and 'index.examples.js' using 'aiExpect'

**token-management** — Level 1
- Evidence: Uses model.budgetTokens(prompt) for model-aware budget calculation
- Gap: Implement proportional multi-value budget management with auto-summarization
- Next: Add multi-value budget management and auto-summarization features


### dismantle (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: At 389 LOC across 2 files, the design is proportional to the complexity of recursively decomposing components with LLM calls. It cleanly separates enhance and decompose phases and uses retry and LLM services appropriately.
- Gap: Some complexity could be reduced by leveraging more existing batch processing primitives for recursion and tree management.
- Next: Refactor recursive subtree construction to use existing map or reduce chains where possible.

**composition-fit** — Level 2
- Evidence: The chain does not currently build on the library's core batch processing chains (map, filter, reduce) but implements its own recursive orchestration. It exposes a clean interface but is not fully composable with other chains.
- Gap: Refactor to express recursive decomposition as a composition of existing batch processing chains to improve composability.
- Next: Redesign dismantle to leverage map or reduce chains for subtree expansion and node processing.

**design-efficiency** — Level 2
- Evidence: 389 LOC for a single main export with multiple helper functions indicates moderate complexity. The implementation includes retry logic and prompt construction, which adds necessary complexity but some helper functions could be consolidated.
- Gap: Reduce helper function count and simplify prompt management to improve efficiency.
- Next: Consolidate prompt builders and retry wrappers to streamline codebase.

**generalizability** — Level 4
- Evidence: The chain uses natural language prompts and LLM calls without hard dependencies on specific runtimes or data formats. It accepts customizable decompose and enhance functions, making it fully adaptable across domains.

**strategic-value** — Level 3
- Evidence: The dismantle chain enables breaking down complex systems into component trees, a core capability useful in AI pipelines for system analysis and decomposition. It is frequently used in workflows involving hierarchical data and component analysis.
- Gap: Could increase strategic value by enabling deeper integration with other chains for automated workflows.
- Next: Develop connectors or adapters to integrate dismantle outputs with other core chains like map or score.


#### Implementation Quality

**api-surface** — Level 2
- Evidence: Exports `simplifyTree`, `dismantle` with documented options including decompose, enhance, makeId, enhanceFixes, decomposeFixes
- Gap: No instruction builders or spec/apply split exports
- Next: Implement instruction builders and spec/apply split exports to enhance API surface

**composability** — Level 2
- Evidence: Exports `simplifyTree` and `dismantle` but no spec/apply split or instruction builders; max level 2 per deterministic ceiling
- Gap: Lacks spec/apply split functions and instruction builders for higher composability
- Next: Introduce spec/apply split functions and instruction builders to improve composability

**documentation** — Level 3
- Evidence: README has API section with parameter table and multiple examples including usage of dismantle and simplifyTree, behavioral notes on ChainTree methods
- Gap: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- Next: Add architecture overview, edge case handling, performance considerations, and composition guidance to README

**prompt-engineering** — Level 4
- Evidence: Uses extracted prompt builder functions subComponentsPrompt and componentOptionsPrompt that utilize promptConstants asWrappedArrayJSON and asJSON. Employs system prompt style instructions within template literals. Sets temperature explicitly (0.7 for decompose, 0.3 for enhance). Uses response_format with JSON schemas (subComponentsSchema, componentOptionsSchema). Implements multi-stage prompt pipeline with decompose and enhance stages, each with tuned frequencyPenalty and temperature settings.

**testing** — Level 4
- Evidence: Has `index.spec.js` with unit tests and `index.examples.js` using `aiExpect`


### document-shrink (standard)

#### Design Fitness

**architectural-fitness** — Level 2
- Evidence: At 632 lines in a single module with multiple helper functions and complex token budget calculations, the design is adequate but somewhat complex; it does not reimplement batch primitives but could be decomposed for clarity.
- Gap: Refactor to split responsibilities into smaller modules or chains to reduce complexity and improve clarity.
- Next: Modularize the codebase by extracting token budget management and chunking logic into separate components.

**composition-fit** — Level 1
- Evidence: document-shrink uses other chains internally (score, map) but is a black box without exposing composable interfaces or spec/apply patterns.
- Gap: Expose internal steps as composable chains or spec/apply patterns to enable pipeline integration and reuse.
- Next: Refactor to break document-shrink into composable sub-chains with clear interfaces.

**design-efficiency** — Level 1
- Evidence: High LOC (632) for a single export with many helper functions and complex token budget arithmetic indicates significant strain and possible overcomplexity.
- Gap: Simplify token budget management and reduce helper function proliferation by better abstraction.
- Next: Introduce a dedicated token budget manager abstraction to reduce arithmetic complexity and helper count.

**generalizability** — Level 4
- Evidence: The chain works with any text input, uses natural language instructions, and has no hard dependencies on specific runtimes or data formats, making it fully general and context-agnostic.
- Next: Continue ensuring runtime-agnostic design and optional dependencies.

**strategic-value** — Level 3
- Evidence: document-shrink is a core capability frequently needed in AI pipelines for document summarization and query-focused content reduction, enabling workflows that handle large documents adaptively with LLM integration.
- Next: Maintain and promote usage as a core pipeline component.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports no default export, only named exports (none listed explicitly), no spec pattern
- Gap: Missing documented exports, instruction builders, spec/apply split
- Next: Add documented exports with consistent naming and implement instruction builders or spec/apply split

**composability** — Level 2
- Evidence: No spec/apply split exports, no instruction builders, composability ceiling at level 2
- Gap: Lacks spec/apply split and instruction builders for composability level 3
- Next: Implement spec/apply split functions and instruction builders to improve composability

**documentation** — Level 3
- Evidence: README has Usage, Options, How it works sections with detailed API parameters 'targetSize', 'tokenBudget', 'chunkSize', 'llm'
- Gap: Missing architecture section, edge cases, performance notes, composition guidance
- Next: Add comprehensive architecture and performance documentation, include edge cases and composition guidance

**testing** — Level 4
- Evidence: Has 'index.spec.js' with unit tests and 'index.examples.js' using 'aiExpect'


### entities (core)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: At 296 lines, the chain has a clean design proportional to the problem complexity, using spec/apply and instruction builders without reimplementing batch processing. The code is modular and clear with few unnecessary abstractions.
- Gap: Minor simplifications could be made to reduce helper functions or clarify phases further.
- Next: Review helper functions for potential consolidation to streamline architecture.

**composition-fit** — Level 4
- Evidence: Follows the library's composition philosophy fully by exposing spec/apply pattern and instruction builders for all batch processing chains, enabling novel workflows through composition.

**design-efficiency** — Level 3
- Evidence: With 296 lines and a focused set of exports, the implementation is efficient and proportional to the problem complexity, avoiding excessive helper functions or workarounds.
- Gap: Could reduce lines slightly by consolidating minor helpers or simplifying configuration.
- Next: Refactor minor helper functions to improve code conciseness without losing clarity.

**generalizability** — Level 4
- Evidence: The chain accepts natural language instructions and works with any text input, with no hard dependencies on specific runtimes or data formats, making it fully general and context-agnostic.

**strategic-value** — Level 3
- Evidence: Entities chain is a core capability frequently used in AI pipelines for named entity extraction, enabling workflows that rely on structured data extraction from text. It integrates with batch processing chains and supports spec/apply patterns, making it broadly useful.
- Gap: Could increase transformative impact by enabling novel feedback loops or more advanced entity reasoning.
- Next: Explore integration with AI feedback mechanisms to enhance entity extraction adaptively.


#### Implementation Quality

**api-surface** — Level 4
- Evidence: Exports 'entitySpec', 'applyEntities', 'extractEntities', 'mapInstructions', 'filterInstructions', 'reduceInstructions', 'findInstructions', 'groupInstructions', 'createEntityExtractor', no default export; instruction builders for all 5 collection chains present.

**browser-server** — Level 0
- Evidence: No usage of 'lib/env' or environment detection patterns
- Gap: Use 'lib/env' for environment reads to support both browser and server
- Next: Refactor environment-dependent code to use 'lib/env' proxy for isomorphic compatibility

**code-quality** — Level 4
- Evidence: Well-structured code with clear separation of concerns, consistent instruction builder pattern, factory with Object.defineProperty for introspection, clean spec/apply split

**composability** — Level 4
- Evidence: Exports 'entitySpec()' and 'applyEntities()' split; instruction builders 'mapInstructions', 'filterInstructions', 'reduceInstructions', 'findInstructions', 'groupInstructions'; factory function 'createEntityExtractor'.

**documentation** — Level 4
- Evidence: README has API section listing default export 'entities(prompt, config)', exports 'extractEntities', 'entitySpec', 'applyEntities', 'createEntityExtractor', and documents shared config params 'llm', 'maxAttempts', 'onProgress', 'now', includes multiple usage examples, performance notes, advanced usage, and composition guidance.

**errors-retry** — Level 1
- Evidence: Imports 'lib/retry' and uses 'retry' function for basic retry with default policy
- Gap: Add input validation, defined failure modes, and enhanced retry strategies
- Next: Implement input validation and multi-level retry with error context attachment

**events** — Level 3
- Evidence: Imports 'lib/progress-callback' and uses 'emitStepProgress' in functions extractEntities
- Gap: Implement phase-level events for multi-phase operations
- Next: Add phase-level event emissions using 'emitPhaseProgress' or similar for multi-phase entity extraction steps

**logging** — Level 0
- Evidence: Imports do not include 'lib/lifecycle-logger', no usage of createLifecycleLogger or logger calls
- Gap: Add lifecycle logging using 'lib/lifecycle-logger' with logStart and logResult
- Next: Integrate 'createLifecycleLogger' and add logStart/logResult calls in core functions like entitySpec and applyEntities

**prompt-engineering** — Level 3
- Evidence: Uses asXML for variable wrapping in prompts (e.g., asXML(prompt, { tag: 'entity-instructions' })), uses promptConstants.onlyJSON for JSON output enforcement, employs system prompts (e.g., specSystemPrompt), and configures response_format with JSON schema in llmConfig (modelOptions.response_format with json_schema referencing entityResultSchema). Also uses retry wrapper for LLM calls and emits progress callbacks.
- Gap: Missing multi-stage prompt pipelines and advanced tuning like frequency/presence penalties to reach level 4.
- Next: Implement multi-stage prompt pipelines with frequency/presence penalty tuning to improve prompt engineering maturity.

**testing** — Level 4
- Evidence: Has 'index.spec.js' with unit tests, 'index.examples.js' using 'aiExpect' for semantic validation.

**token-management** — Level 0
- Evidence: No usage of 'lib/text-batch' or token-budget-aware batching functions
- Gap: Implement token-budget-aware input splitting using 'createBatches' or similar
- Next: Integrate token budget management to handle large inputs efficiently


### expect (standard)

#### Design Fitness

**architectural-fitness** — Level 2
- Evidence: The module has 415 lines of code across 2 files, which is relatively large. It does not use other chains internally and has bespoke logic for code context extraction, git path resolution, and LLM-based advice generation, indicating some complexity and potential for simplification.
- Gap: Refactor to leverage existing library primitives for batch processing and context extraction to reduce bespoke code and complexity.
- Next: Identify reusable primitives in the library for code context and advice generation and refactor the chain to use them.

**composition-fit** — Level 1
- Evidence: The chain does not use other chains internally and does not expose spec/apply or instruction builders. It is a standalone module with its own orchestration and debugging logic, limiting composability.
- Gap: Refactor to expose spec/apply patterns and instruction builders to integrate with library's batch processing chains.
- Next: Decompose the chain into smaller composable units that use existing primitives like map, filter, and score.

**design-efficiency** — Level 2
- Evidence: At 415 lines with multiple helper functions and bespoke logic, the implementation shows moderate complexity. Some code comments indicate fallback mechanisms and error handling that add to complexity.
- Gap: Simplify implementation by reducing helper functions and consolidating logic where possible.
- Next: Review helper functions for consolidation opportunities and remove redundant code paths.

**generalizability** — Level 3
- Evidence: The chain uses natural language instructions and LLM calls, works with any text input, and is not locked to a specific runtime or framework. It does have some Node.js dependencies (fs, path) but these are common and could be abstracted.
- Gap: Abstract Node.js specific dependencies to enable broader runtime compatibility (e.g., browser).
- Next: Create abstraction layers for file system and path operations to support multiple runtimes.

**strategic-value** — Level 4
- Evidence: The 'expect' chain is described as advanced intelligent assertions with debugging features, environment modes, and structured results, enabling powerful AI assertion workflows previously impossible. It is listed alongside core and transformative chains and noted for unlocking new feedback loops.


#### Implementation Quality

**api-surface** — Level 2
- Evidence: Exports `expect`, `aiExpect`, `expectSimple` with documented API in README
- Gap: No instruction builders or spec/apply split exports
- Next: Introduce instruction builders and spec/apply split exports to enhance API composability

**browser-server** — Level 2
- Evidence: Imports 'lib/env' and uses 'env' proxy for environment reads, no direct 'process.env' usage.
- Gap: Add tests for both browser and server environments and implement graceful degradation.
- Next: Create browser-compatible entry point and add environment-specific exports for optimized usage.

**composability** — Level 2
- Evidence: Exports `expect`, `aiExpect`, `expectSimple`; no spec/apply split or factory functions
- Gap: Lacks spec/apply split and instruction builders for higher composability
- Next: Refactor to export spec/apply functions and instruction builders to improve composability

**documentation** — Level 3
- Evidence: README has API Reference section with detailed usage examples, environment variable modes, advanced features, and best practices
- Gap: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- Next: Add architecture overview, edge case handling, performance considerations, and composition guidance to README

**events** — Level 0
- Evidence: No import of 'lib/progress-callback' or usage of event emission functions detected.
- Gap: Add support for event emission using 'lib/progress-callback' with standard events like start and complete.
- Next: Import 'lib/progress-callback' and emit lifecycle events during chain execution.

**logging** — Level 0
- Evidence: Imports include 'lib/logger' but no usage of 'createLifecycleLogger' or 'logStart' found in source code.
- Gap: Implement lifecycle logging using 'createLifecycleLogger' with 'logStart' and 'logResult' calls.
- Next: Integrate 'createLifecycleLogger' from 'lib/lifecycle-logger' and add structured logging calls in the chain.

**prompt-engineering** — Level 3
- Evidence: The chain uses shared prompt utilities such as wrapVariable (wrap-variable.js) and asXML (prompts/wrap-variable.js) for variable wrapping. It constructs prompts using template literals with embedded wrapped variables for code context, imports, and implementation code. The chain sets modelOptions with a specific modelName ('fastGoodCheapCoding') and uses temperature explicitly set to 0 in shared.js expectCore. It also uses response_format with a JSON schema for structured LLM responses in shared.js. System prompts are implied by the detailed instruction format in the prompt literals. The chain imports prompt-related utilities from 'prompts' and uses them consistently across its own and shared modules.
- Gap: No multi-stage prompt pipelines or advanced frequency/presence penalty tuning are present.
- Next: Implement multi-stage prompt pipelines to decompose complex tasks and tune frequency/presence penalties for improved response quality.

**testing** — Level 4
- Evidence: Has `index.spec.js` with unit tests and `index.examples.js` using `aiExpect`

**token-management** — Level 0
- Evidence: No usage of 'createBatches' or token-budget-aware splitting detected in source code.
- Gap: Implement token-budget-aware input splitting using 'createBatches' from 'lib/text-batch'.
- Next: Integrate 'createBatches' to manage token budgets and optimize input sizes.


### extract-blocks (standard)

#### Design Fitness

**architectural-fitness** — Level 2
- Evidence: At 251 LOC across 2 files, the design is adequate but somewhat complex; it does not build on existing batch processing primitives and implements bespoke windowing and retry logic, indicating room for simplification.
- Gap: Refactor to leverage existing library primitives for batch processing and reduce bespoke coordination logic.
- Next: Decompose window processing into compositions of map and retry chains to simplify architecture.

**composition-fit** — Level 1
- Evidence: The chain does not use other chains internally and reimplements batch processing and retry logic rather than composing existing primitives, limiting its composability.
- Gap: Refactor to build on the library's batch processing and spec/apply primitives to improve composition fit.
- Next: Integrate map, filter, and retry chains internally to replace bespoke batch and retry implementations.

**design-efficiency** — Level 2
- Evidence: The 251 LOC and multiple imports from internal libs suggest moderate complexity; some helper functions and bespoke logic indicate the design mostly works but could be more efficient.
- Gap: Simplify code by reducing helper functions and leveraging existing abstractions to lower LOC and complexity.
- Next: Refactor to minimize helper functions and reuse existing library utilities for progress and retry management.

**generalizability** — Level 4
- Evidence: The chain accepts natural language instructions and processes any text input without hard dependencies on specific runtimes or data formats, making it fully general and context-agnostic.

**strategic-value** — Level 3
- Evidence: extract-blocks is a core capability frequently needed in AI pipelines for processing unstructured text into structured blocks, enabling workflows like log analysis and event extraction that are common in AI feature development.


#### Implementation Quality

**api-surface** — Level 2
- Evidence: Exports `extractBlocks` as default export, accepts config params `windowSize`, `overlapSize`, `maxParallel`, `maxAttempts`, `logger`, `llm`, `onProgress`, `now`
- Gap: No instruction builders or spec/apply split
- Next: Implement instruction builders and spec/apply function split to improve composability and API clarity

**browser-server** — Level 0
- Evidence: No imports or usage of `lib/env` or environment detection patterns found
- Gap: No environment abstraction or detection for browser/server compatibility
- Next: Integrate `lib/env` usage to enable environment detection and isomorphic support

**code-quality** — Level 3
- Evidence: Clean separation of concerns with extracted pure functions like `buildBlockExtractionPrompt`, clear naming conventions, no dead code, and well-structured async processing
- Gap: Could improve with more explicit transformations and composable internals for reference-quality
- Next: Refactor to further modularize and document transformations for enhanced clarity and composability

**composability** — Level 2
- Evidence: Exports single default function `extractBlocks`, no spec/apply split or instruction builders
- Gap: No spec/apply split or instruction builders to reach level 3
- Next: Refactor to export spec/apply functions and instruction builders to enable chain composition

**documentation** — Level 3
- Evidence: README has Usage section with example code, Parameters section listing config params including windowSize, overlapSize, maxParallel
- Gap: Missing architecture section, edge cases, performance notes, composition guidance
- Next: Add comprehensive documentation covering architecture, edge cases, performance, and composition guidance

**errors-retry** — Level 1
- Evidence: Imports `retry` from `lib/retry` and uses it to retry LLM calls with maxAttempts parameter
- Gap: No input validation, no multi-level or conditional retry, no custom error types or attached error context
- Next: Add input validation and enhance retry strategy with conditional retry and error context attachment

**events** — Level 3
- Evidence: Imports from `lib/progress-callback` including `emitBatchStart`, `emitBatchComplete`, `emitBatchProcessed`, and `createBatchProgressCallback`, calls these emitters with `onProgress` callback
- Gap: No phase-level event emissions for multi-phase operations
- Next: Add phase-level event emissions to support multi-phase lifecycle tracking

**logging** — Level 3
- Evidence: Imports `createLifecycleLogger` from `lib/lifecycle-logger`, uses `createLifecycleLogger(logger, 'chain:extract-blocks')`, calls `logStart`, `logResult`, and `info` methods on lifecycleLogger
- Gap: Missing full lifecycle logging features like `logConstruction`, `logProcessing`, `logEvent`, and child loggers
- Next: Implement additional lifecycle logging methods such as `logConstruction` and `logEvent` to achieve full lifecycle coverage

**prompt-engineering** — Level 3
- Evidence: Uses asXML for variable wrapping in buildBlockExtractionPrompt (e.g., asXML(instructions, { tag: 'instructions' }) and asXML(numberedLines, { tag: 'window' })). Uses a JSON schema response_format via blockExtractionSchema imported from block-schema.js. No explicit system prompt or temperature setting found in the source code. Response_format is used in llmConfig.modelOptions. No promptConstants are used from the shared constants.js library.
- Gap: Missing system prompt usage and explicit temperature tuning to reach level 4.
- Next: Introduce a system prompt to set the LLM's role and add temperature tuning parameters to the LLM call configuration.

**testing** — Level 2
- Evidence: Has `index.spec.js` with unit tests and `index.examples.js` with example tests, no aiExpect usage
- Gap: No aiExpect or property-based tests
- Next: Add aiExpect semantic validation tests to improve test coverage and robustness

**token-management** — Level 1
- Evidence: No usage of `createBatches` or token-budget-aware splitting; processes text by line windows with fixed sizes
- Gap: Lacks model-aware token budget management and proportional multi-value budget handling
- Next: Incorporate `createBatches` or similar token-budget-aware batching to improve token management


### extract-features (standard)

#### Design Fitness

**architectural-fitness** — Level 4
- Evidence: The chain is 71 LOC, single file, with a clean design that composes existing chains (map, score) rather than reimplementing batch processing. The processing steps are clear and proportional to the problem complexity.

**composition-fit** — Level 4
- Evidence: The chain builds on the library's own primitives (map, score) and exposes a clean interface for composing multiple feature extraction operations, enabling novel workflows by combining with other chains.

**design-efficiency** — Level 4
- Evidence: At 71 LOC with a single export and minimal helper functions, the implementation is minimal and the design makes the implementation obvious without unnecessary complexity.

**generalizability** — Level 4
- Evidence: The chain accepts arbitrary items and feature definitions with operations, uses natural language instructions, and has no hard dependencies on specific runtimes or data formats, making it fully general and context-agnostic.

**strategic-value** — Level 3
- Evidence: The chain is a core capability frequently needed in AI pipelines for feature extraction, enabling workflows that combine multiple feature operations using existing chains like map and score. It is used in standard tier and complements many other chains in the portfolio.


#### Implementation Quality

**api-surface** — Level 2
- Evidence: Exports `extractFeatures` as named and default export, accepts config param `logger`
- Gap: No instruction builders or spec/apply split
- Next: Implement instruction builders and spec/apply function split for composability

**browser-server** — Level 0
- Evidence: No usage of 'lib/env' or environment detection code
- Gap: Add environment detection using 'lib/env' to support both browser and server
- Next: Use 'lib/env' to detect runtime environment and adapt behavior accordingly

**composability** — Level 2
- Evidence: Composes other chains internally (map, score) as shown in README examples
- Gap: No exported spec/apply functions or instruction builders
- Next: Add spec/apply split functions and instruction builders to improve composability

**documentation** — Level 3
- Evidence: README has API section with parameter table for extractFeatures(items, features, config), multiple examples including usage and design notes
- Gap: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- Next: Add architecture overview, edge case handling, performance considerations, and composition guidance to README

**errors-retry** — Level 0
- Evidence: No error handling or retry logic detected
- Gap: Add error handling and retry logic using 'lib/retry'
- Next: Implement retry logic with error handling for transient failures

**events** — Level 0
- Evidence: No import of 'lib/progress-callback', no event emission code found
- Gap: Add standardized event emission using 'lib/progress-callback'
- Next: Import 'lib/progress-callback' and emit standard lifecycle events like start and complete

**logging** — Level 4
- Evidence: Imports `createLifecycleLogger` from 'lib/lifecycle-logger', uses `createLifecycleLogger` to create `lifecycleLogger`, calls `logStart`, `logEvent`, `info`, and `logResult` methods

**prompt-engineering** — Level 0
- Evidence: No prompt-related imports; no usage of promptConstants; no system prompts; no temperature settings; no response_format usage; prompt is implemented as inline code without shared utilities or prompt builder functions.
- Gap: Missing use of asXML for variable wrapping and shared prompt utilities.
- Next: Refactor prompt to use asXML for variable wrapping to improve prompt engineering maturity to level 1.

**testing** — Level 2
- Evidence: Has `index.examples.js` using `aiExpect`, no spec tests
- Gap: Missing unit tests covering edge cases and error paths
- Next: Add unit tests with edge case and error path coverage

**token-management** — Level 0
- Evidence: No import or usage of 'lib/text-batch' or token budget management
- Gap: Implement token-budget-aware batching using 'createBatches'
- Next: Integrate 'createBatches' to manage token budgets for feature operations


### filter (core)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: The chain has 239 lines of code, which is proportional to the complexity of semantic filtering with batch processing, retry logic, and progress callbacks. It builds on existing primitives like listBatch and does not reimplement batch processing. The design is clean with clear phases.

**composition-fit** — Level 2
- Evidence: The chain exposes a clean function interface accepting items and instructions and returning filtered items, suitable as a pipeline step. However, it does not internally compose other library chains like map or score, but uses listBatch as an orchestrator.
- Gap: Increase internal use of library primitives (e.g., map, score) to improve composability.
- Next: Refactor to leverage existing collection chains internally for filtering logic to enhance composition fit.

**design-efficiency** — Level 3
- Evidence: At 239 LOC with a single main export and moderate helper functions, the implementation is clean and proportional to the problem complexity. It uses retry and progress callbacks effectively without excessive complexity.

**generalizability** — Level 3
- Evidence: The filter chain accepts natural language instructions and works with any text input. It has no hard dependencies on specific frameworks or data formats, making it general purpose across domains.

**strategic-value** — Level 3
- Evidence: The filter chain is a core capability frequently needed in AI pipelines, enabling semantic filtering of arrays using natural language instructions. It is part of the core batch processing chains (map, filter, reduce, group, sort) which are high-value by definition.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports `filterOnce` only, no default export present.
- Gap: Lacks documented default export and instruction builders; no spec/apply split or factory functions.
- Next: Add a default export and implement instruction builders or spec/apply split to improve API composability and clarity.

**composability** — Level 2
- Evidence: Composability capped at level 2 by deterministic ceiling; no spec/apply split or instruction builders found.
- Gap: Missing spec/apply function split and instruction builders for higher composability.
- Next: Introduce spec/apply function split and instruction builders to enable higher composability.

**documentation** — Level 3
- Evidence: README has API section with parameter table documenting chain-specific config params `batchSize`, `maxParallel`, `listStyle`, `autoModeThreshold`, `responseFormat` and references shared config params `llm`, `maxAttempts`, `onProgress`, `now`, `logger`. Multiple usage examples and behavioral notes present.
- Gap: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance.
- Next: Add detailed architecture overview, edge case handling, performance considerations, and guidance on composing this chain with others in the README.

**prompt-engineering** — Level 3
- Evidence: Uses asXML for variable wrapping in filterInstructions function (asXML(instructions, { tag: 'filtering-criteria' })), uses responseFormat with JSON schema (filterResponseFormat), uses retry wrapper for robustness, uses listBatch utility for batch processing, includes detailed prompt instructions with template literals, no explicit temperature setting found, no system prompt usage detected.
- Gap: No system prompt usage or temperature tuning to reach level 4.
- Next: Introduce system prompts to set the LLM role and tune temperature or penalties for improved prompt control.

**testing** — Level 4
- Evidence: Has `index.spec.js` with unit tests, `index.examples.js` using `aiExpect` for semantic validation.


### filter-ambiguous (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: At 50 LOC, the chain is concise and builds on existing primitives like score and list without reimplementing batch processing; clear processing phases.
- Gap: Minor simplifications possible but overall design is proportional and clean.
- Next: Review for any redundant steps or abstractions to streamline further.

**composition-fit** — Level 3
- Evidence: Builds on core library chains (score, list) and exposes a clean async function interface; enables pipeline integration.
- Gap: Could expose spec/apply pattern or instruction builders to reach full composition citizenship.
- Next: Refactor to implement spec/apply pattern and provide instruction builders for better composability.

**design-efficiency** — Level 4
- Evidence: Minimal code (50 LOC) with no helper functions; implementation is straightforward and proportional to problem complexity.

**generalizability** — Level 4
- Evidence: Accepts natural language instructions and works with any text input; no hard dependencies on specific runtimes or data formats.

**strategic-value** — Level 2
- Evidence: Provides a useful tool to identify ambiguous terms in text, enabling moderate frequency use in AI workflows; complements other chains like score and list.
- Gap: Increase integration to unlock more novel workflows beyond current moderate utility.
- Next: Explore combining with other chains to enable new feedback loops or automation patterns.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default async function filterAmbiguous(text, config)
- Gap: No documented named exports or instruction builders
- Next: Introduce named exports and document shared config destructuring

**browser-server** — Level 0
- Evidence: No use of 'lib/env' or environment detection; no browser/server compatibility code.
- Gap: Use 'lib/env' for environment detection to support both browser and server.
- Next: Integrate 'lib/env' and avoid direct 'process.env' usage to improve environment compatibility.

**documentation** — Level 2
- Evidence: README has basic description and example usage of filterAmbiguous(text, { topN })
- Gap: Missing API section with parameter table and shared config reference
- Next: Add detailed API section in README with parameter table and reference to shared config

**errors-retry** — Level 0
- Evidence: No error handling or retry logic present in source code.
- Gap: Implement basic retry using 'lib/retry' with default 429-only policy.
- Next: Add retry logic with 'lib/retry' to handle transient errors gracefully.

**events** — Level 0
- Evidence: No import of 'lib/progress-callback', no event emission in source code.
- Gap: Accept 'onProgress' callback and emit standard events using 'lib/progress-callback'.
- Next: Add 'onProgress' parameter and emit start/complete events using 'lib/progress-callback' to reach level 1.

**logging** — Level 0
- Evidence: No import of 'lib/lifecycle-logger', no logger usage in source code.
- Gap: Add logger parameter and use 'logger?.info()' or lifecycle logger calls.
- Next: Add a 'logger' config parameter and use 'logger?.info()' for inline logging to reach level 1.

**prompt-engineering** — Level 0
- Evidence: The chain uses inline template literals for prompts such as 'How ambiguous or easily misinterpreted is this sentence?' and 'Score how ambiguous the term is within the sentence.' There are no imports of promptConstants, no use of asXML or other prompt helper modules, no system prompts, no temperature settings, and no response_format usage.
- Gap: Missing use of prompt helper modules like asXML, promptConstants, system prompts, temperature tuning, and response_format.
- Next: Refactor prompts to use prompt helper modules such as asXML and incorporate promptConstants for reusable fragments.

**testing** — Level 2
- Evidence: Has index.spec.js with unit tests and index.examples.js without aiExpect
- Gap: No aiExpect coverage for semantic validation
- Next: Add aiExpect assertions in example tests for semantic validation

**token-management** — Level 1
- Evidence: Manual chunking via 'chunkSize' parameter and splitting text by lines; no use of 'createBatches'.
- Gap: Use 'createBatches' for token-budget-aware splitting.
- Next: Replace manual chunking with 'createBatches' to manage token budgets effectively.


### find (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: At 195 LOC and 2 files, the chain is concise and focused. It builds on existing primitives like listBatch and parallelBatch without reimplementing batch processing, showing proportional design.

**composition-fit** — Level 2
- Evidence: The chain exposes a clean function interface (findOnce) and uses library primitives internally but does not export spec/apply or instruction builders for further composition.
- Gap: Expose spec/apply pattern and instruction builders to integrate with other collection chains for full composition fit.
- Next: Refactor to implement spec/apply exports and instruction builders to enable composability with map, filter, reduce chains.

**design-efficiency** — Level 3
- Evidence: The implementation is clean and proportional to the problem complexity with 195 LOC, minimal helper functions, and no evident workarounds or duplicated logic.

**generalizability** — Level 4
- Evidence: The chain accepts natural language instructions and works with any text array input. It has no hard dependencies on specific runtimes or data formats, making it fully general and context-agnostic.

**strategic-value** — Level 3
- Evidence: The 'find' chain is a core capability frequently needed in AI pipelines for searching arrays with AI-powered reasoning. It enables natural language search over lists, a common developer need.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports 'findOnce' and default export 'find'
- Gap: Lacks documented instruction builders and spec/apply split
- Next: Implement and document instruction builders and spec/apply function split

**browser-server** — Level 0
- Evidence: No import or usage of 'lib/env' or runtime environment detection
- Gap: Use 'lib/env' for environment reads to support both browser and server
- Next: Refactor environment detection to use 'lib/env' proxy instead of direct process.env access

**code-quality** — Level 3
- Evidence: Clear function structure, extracted pure functions like findInstructions, no dead code, descriptive variable names
- Gap: Further separation of concerns and composability for reference-quality code
- Next: Refactor to improve composability and explicit transformations for reference-quality

**composability** — Level 2
- Evidence: Exports 'findOnce' and default export 'find'; no spec/apply split; no instruction builders
- Gap: No spec/apply function split or instruction builders to enable higher composability
- Next: Introduce spec/apply split functions and instruction builders to improve composability

**documentation** — Level 3
- Evidence: README has API section with parameter table listing 'array', 'criteria', 'config' including 'chunkSize' and 'llm'; multiple usage examples under 'Usage' and 'Use Cases' sections
- Gap: Missing architecture section, edge cases, performance notes, and composition guidance
- Next: Add comprehensive documentation covering architecture, edge cases, performance, and composition guidance

**errors-retry** — Level 2
- Evidence: Imports retry from 'lib/retry' and uses retry() with defined failure mode (continue on error) in batch processing
- Gap: Add multi-level retry, conditional retry, and error context attachment
- Next: Implement item-level retry and attach error context to results

**events** — Level 3
- Evidence: Imports from 'lib/progress-callback' and calls to emitBatchStart, emitBatchProcessed, emitBatchComplete
- Gap: Add phase-level events for multi-phase operations
- Next: Implement phase-level event emission using emitPhaseProgress or similar

**logging** — Level 0
- Evidence: No import of 'lib/lifecycle-logger' or usage of createLifecycleLogger or logger calls
- Gap: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- Next: Import 'lib/lifecycle-logger' and implement structured lifecycle logging in find function

**testing** — Level 4
- Evidence: Has 'index.spec.js' with unit tests and 'index.examples.js' using 'aiExpect'

**token-management** — Level 2
- Evidence: Uses createBatches from 'lib/text-batch' for token-budget-aware splitting
- Gap: Implement model-aware budget calculation with budgetTokens
- Next: Enhance batching to use model-aware token budget calculations


### glossary (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: At 112 LOC, the chain cleanly breaks down the problem into sentence batching, mapping, deduplication, and sorting. It builds on existing primitives (map, sort) without reimplementing batch processing.
- Gap: No significant architectural issues; design is proportional to problem complexity.
- Next: Maintain current modular design and ensure clear separation of concerns.

**composition-fit** — Level 2
- Evidence: The chain uses map and sort internally but does not expose spec/apply or instruction builders for further composition. It acts as a pipeline step but is not a full composition citizen.
- Gap: Expose spec/apply interfaces and instruction builders to enable composition with other chains.
- Next: Refactor to provide spec/apply pattern and instruction builders for integration with core primitives.

**design-efficiency** — Level 3
- Evidence: The implementation is concise (112 LOC) with a single main export and no helper functions, proportional to the problem complexity. It leverages existing chains effectively.

**generalizability** — Level 4
- Evidence: The chain accepts any text input, uses natural language instructions, and depends only on general-purpose libraries (compromise, map, sort). It is runtime agnostic and context-agnostic.

**strategic-value** — Level 2
- Evidence: The glossary chain is a useful tool that extracts technical terms from text, enabling glossary sidebars for dense articles. It is moderately sized (112 LOC) and used in standard tier, indicating moderate frequency and real problem solving.
- Gap: Increase integration with other chains to enable more novel workflows beyond term extraction.
- Next: Develop spec/apply patterns or instruction builders to allow composition with other chains like entities or score.


#### Implementation Quality

**api-surface** — Level 2
- Evidence: Exports default glossary function; config params maxTerms, batchSize, overlap, chunkSize, sortBy destructured in function signature
- Gap: No instruction builders or spec/apply split exports
- Next: Implement instruction builders and spec/apply split exports to enhance API surface

**browser-server** — Level 0
- Evidence: No usage of lib/env or runtime environment detection
- Gap: Use lib/env for environment detection to support both browser and server
- Next: Refactor to use lib/env runtime.isBrowser or runtime.isNode for environment checks

**documentation** — Level 3
- Evidence: README has API section with parameter table documenting chain-specific config params maxTerms, batchSize, overlap, chunkSize, sortBy; includes multiple examples and behavioral notes
- Gap: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- Next: Add architecture overview, edge case handling, performance considerations, and composition guidance to README

**errors-retry** — Level 0
- Evidence: No error handling or retry logic observed in source code
- Gap: Implement basic retry with lib/retry and error handling
- Next: Add try/catch and retry logic using lib/retry with default 429-only policy

**events** — Level 0
- Evidence: No imports from 'lib/progress-callback', no event emission code
- Gap: Add event emission using progress-callback standard events
- Next: Accept onProgress callback and emit standard lifecycle events during processing

**logging** — Level 0
- Evidence: No imports from 'lib/lifecycle-logger', no logger usage in index.js
- Gap: Add lifecycle logging using createLifecycleLogger and logStart/logResult
- Next: Import createLifecycleLogger and implement lifecycle logging in glossary function

**prompt-engineering** — Level 3
- Evidence: The chain uses a response_format with a JSON schema (GLOSSARY_RESPONSE_FORMAT referencing glossaryExtractionJsonSchema), indicating structured output enforcement. It uses a system prompt style by defining clear instructions in the 'instructions' template literal for the map function. Temperature is not explicitly set, so default is used. No promptConstants or asXML wrapping are used. The chain leverages shared utilities 'map' and 'sort' for processing, showing modular prompt usage.
- Gap: Missing explicit system prompt usage and temperature tuning, and no use of promptConstants or asXML variable wrapping.
- Next: Introduce promptConstants for instruction fragments and set explicit temperature values to improve prompt control.

**testing** — Level 3
- Evidence: Has index.spec.js with unit tests and index.examples.js using aiExpect
- Gap: No property-based or regression tests
- Next: Add property-based and regression tests to increase test coverage

**token-management** — Level 1
- Evidence: Manual chunking by sentence count in batching loop (batchSize, overlap) without createBatches usage
- Gap: Use createBatches for token-budget-aware splitting
- Next: Replace manual batching with createBatches from lib/text-batch for token-aware chunking


### group (core)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: The design is clean and proportional to the problem complexity (247 LOC). It builds on existing primitives like reduce and parallelBatch without reimplementing batch processing. The two-phase approach (category discovery and assignment) is clear.

**composition-fit** — Level 2
- Evidence: While the chain uses other chains internally (reduce) and library utilities (parallelBatch), it does not export spec/apply patterns or instruction builders for further composition. It acts as a pipeline step but is not a full composition citizen.
- Gap: Expose spec/apply interfaces and instruction builders to enable composition with other chains.
- Next: Refactor to separate category discovery and assignment as composable spec/apply chains with instruction builders.

**design-efficiency** — Level 3
- Evidence: The implementation is efficient and proportional to the problem complexity (247 LOC). It uses a moderate number of helper functions and leverages existing library utilities, avoiding unnecessary complexity.

**generalizability** — Level 4
- Evidence: The chain accepts natural language instructions and works with any list of items, making it fully general and context-agnostic. It has no hard dependencies on specific runtimes or data formats.

**strategic-value** — Level 3
- Evidence: The 'group' chain is a core batch processing chain (247 LOC) that developers frequently need in AI pipelines for organizing data. It enables workflows that were previously impractical by discovering and assigning categories using LLMs.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default `group` only, no instruction builders or spec/apply split
- Gap: Lacks instruction builders and spec/apply split exports
- Next: Implement and export instruction builders and spec/apply split functions to improve composability and clarity

**browser-server** — Level 0
- Evidence: No import or usage of 'lib/env' or environment detection; no browser/server environment handling
- Gap: Add environment detection using 'lib/env'
- Next: Use 'lib/env' to detect runtime environment and handle browser/server differences gracefully

**code-quality** — Level 3
- Evidence: Clean two-phase design (discovery and assignment), extracted prompt builders, fallback category 'other', no dead code, clear naming
- Gap: Improve separation of concerns and composability to reach level 4
- Next: Refactor to enhance modularity and composability for reference-quality code

**composability** — Level 2
- Evidence: No spec/apply split, no instruction builders, but composes other chains internally (uses `reduce` and batch processing chains)
- Gap: Missing spec/apply split and instruction builders for external composition
- Next: Refactor to export spec/apply split functions and instruction builders to enable higher composability

**documentation** — Level 3
- Evidence: README has API section with parameter table listing `topN`, `categoryPrompt`, shared config reference to `llm`, `maxAttempts`, `onProgress`, `now`, multiple usage examples, and behavioral notes
- Gap: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- Next: Add detailed architecture overview, edge case handling, performance considerations, and guidance on composing with other chains

**errors-retry** — Level 1
- Evidence: Imports 'lib/retry' and uses 'retry' with default 429-only policy; no input validation or multi-level retry
- Gap: Add input validation, multi-level retry, and error context attachment
- Next: Enhance retry logic with conditional retries and attach error context to results

**events** — Level 4
- Evidence: Imports 'lib/progress-callback' and calls 'emitPhaseProgress', 'emitBatchStart', 'emitBatchProcessed', 'emitBatchComplete', 'emitProgress'

**logging** — Level 2
- Evidence: Imports 'lib/progress-callback' but no 'lib/lifecycle-logger'; no 'logger' config parameter used; no calls to 'createLifecycleLogger' or 'logStart'
- Gap: Add 'logger' config and use 'createLifecycleLogger' with 'logStart' and 'logResult'
- Next: Add lifecycle logger support by accepting 'logger' in config and instrumenting with 'createLifecycleLogger'

**prompt-engineering** — Level 2
- Evidence: Uses asXML for variable wrapping (imported from '../../prompts/wrap-variable.js'), extracted prompt builder functions like createCategoryDiscoveryPrompt and createAssignmentInstructions, uses promptConstants indirectly via imported prompt utilities, no explicit system prompt or temperature setting, no response_format usage detected.
- Gap: Missing system prompts, temperature tuning, and response_format usage to reach level 3.
- Next: Introduce system prompts with role definitions and set temperature parameters; implement response_format with JSON schemas for output structuring.

**testing** — Level 4
- Evidence: Has `index.spec.js` with unit tests, `index.examples.js` using `aiExpect` for semantic validation

**token-management** — Level 2
- Evidence: Uses 'createBatches' from 'lib/text-batch' for token-budget-aware splitting
- Gap: Add model-aware budget calculation with 'budgetTokens'
- Next: Implement model-aware token budgeting to optimize batch sizes


### intersections (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: 239 lines of code proportional to problem complexity; clear phases in processing combinations; builds on primitives like commonalities and combinations without bespoke infrastructure.
- Gap: Minor complexity in batch processing could be simplified.
- Next: Refactor batch processing loop for clearer abstraction and potential reuse.

**composition-fit** — Level 2
- Evidence: Exposes a clean function interface accepting items and instructions; uses other chains internally (commonalities) but does not fully implement spec/apply or instruction builders for all collection chains.
- Gap: Could be refactored to expose spec/apply pattern and instruction builders to better fit library composition philosophy.
- Next: Extract spec generation and apply phases into separate composable chains and provide instruction builders.

**design-efficiency** — Level 3
- Evidence: 239 LOC with a single main export and limited helper functions; implementation is clean and proportional to problem complexity; no excessive workarounds or duplicated logic.
- Gap: Could reduce configuration complexity by consolidating parameters.
- Next: Simplify configuration options to reduce API surface and improve usability.

**generalizability** — Level 4
- Evidence: Accepts natural language instructions; works with any array of items; no hard dependencies on specific runtimes or data formats; isomorphic design.

**strategic-value** — Level 3
- Evidence: Enables intersection analysis across multiple categories with AI reasoning, a core capability useful in AI pipelines; used frequently for data transformation and insight extraction.
- Gap: Could increase frequency of use by integrating more tightly with other core chains or expanding use cases.
- Next: Develop additional instruction builders to facilitate integration with other chains like map or filter.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default function 'intersections' only, no named exports or instruction builders
- Gap: No instruction builders or spec/apply split exports
- Next: Introduce instruction builders and split spec/apply functions to enhance API surface

**browser-server** — Level 0
- Evidence: No import or usage of 'lib/env' or runtime environment detection; no browser/server environment handling
- Gap: Use 'lib/env' for environment detection to support both browser and server
- Next: Refactor to import and use 'lib/env' for environment checks instead of direct environment assumptions

**code-quality** — Level 3
- Evidence: Clean separation of concerns with extracted pure functions like processCombo, clear naming conventions, no dead code
- Gap: Further modularization and composability to reach reference-quality
- Next: Refactor to increase composability and add comprehensive documentation for reference-quality code

**composability** — Level 2
- Evidence: No spec/apply split exports; composes internally by calling other chains like 'commonalities' and utilities
- Gap: Lacks exported spec/apply functions and instruction builders for composability
- Next: Export spec/apply split functions and instruction builders to improve composability

**documentation** — Level 3
- Evidence: README has API section with parameters 'categories', 'config' including 'instructions', 'minSize', 'maxSize', 'batchSize', 'llm'; multiple usage examples and behavioral notes
- Gap: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- Next: Add detailed architecture overview, edge case handling, performance considerations, and guidance on composing with other chains in README

**errors-retry** — Level 1
- Evidence: Imports 'lib/retry' and uses retry() with default 429-only policy, no custom error handling or multi-level retry
- Gap: Add input validation, conditional retry logic, and defined failure modes
- Next: Enhance retry logic with input validation and conditional retry policies

**events** — Level 0
- Evidence: No import of 'lib/progress-callback' or calls to emit events; onProgress is accepted but only passed through
- Gap: Emit standard lifecycle events using 'lib/progress-callback' emitters
- Next: Integrate 'lib/progress-callback' and emit start, complete, and step events during processing

**logging** — Level 0
- Evidence: No import of 'lib/lifecycle-logger' or usage of createLifecycleLogger or logger methods
- Gap: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- Next: Import 'lib/lifecycle-logger' and implement createLifecycleLogger with logStart and logResult calls

**prompt-engineering** — Level 3
- Evidence: Uses asXML for variable wrapping (asXML(categories.join(' | '), { tag: 'categories' })), uses promptConstants (asJSON, asWrappedArrayJSON, strictFormat, contentIsQuestion), employs response_format with JSON schemas in llmConfig (type: 'json_schema', json_schema: intersectionElementsSchema), uses retry with callLlm for LLM calls, and includes system prompt style instructions in INTERSECTION_PROMPT.
- Gap: Missing multi-stage prompt pipelines and advanced tuning like frequency/presence penalty.
- Next: Implement multi-stage prompt pipelines and tune frequency/presence penalties to improve prompt engineering maturity.

**testing** — Level 2
- Evidence: Has 'index.examples.js' with example tests using 'aiExpect'; no spec tests present
- Gap: Missing unit tests covering edge cases and error paths
- Next: Add unit tests with vitest covering edge cases and error handling

**token-management** — Level 0
- Evidence: No usage of 'lib/text-batch' or createBatches for token-budget-aware splitting
- Gap: Implement token-budget-aware input chunking using createBatches
- Next: Integrate 'lib/text-batch' createBatches to manage token budgets for LLM inputs


### join (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: At 151 lines, the chain has a clean design proportional to the problem, with clear phases: windowing, per-window merging, and stitching. It uses existing utilities like windowFor and retry, avoiding bespoke infrastructure.

**composition-fit** — Level 1
- Evidence: The chain does not use other chains internally and implements its own batch processing and stitching logic, rather than composing existing library primitives like map or reduce.
- Gap: Refactor to build on existing batch processing chains (map, reduce) and spec/apply patterns to improve composability.
- Next: Decompose join into smaller chains using map and reduce primitives for window processing and stitching steps.

**design-efficiency** — Level 3
- Evidence: The implementation is concise (151 LOC) with a straightforward approach and limited helper functions, proportional to the problem complexity.

**generalizability** — Level 4
- Evidence: The chain accepts arbitrary text fragments and natural language prompts, with no hard dependencies on specific runtimes or data formats, making it fully general and context-agnostic.

**strategic-value** — Level 3
- Evidence: The join chain is a core capability frequently needed in AI pipelines for merging text fragments into coherent narratives, enabling workflows like document synthesis and story merging that are common in AI feature development.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default 'join' only, no instruction builders or spec/apply split
- Gap: No instruction builders or spec/apply split exports
- Next: Implement and export instruction builders and spec/apply split functions to enhance API surface

**browser-server** — Level 0
- Evidence: No import or usage of 'lib/env' or runtime environment detection
- Gap: Use 'lib/env' for environment reads to support both browser and server
- Next: Refactor to use 'lib/env' for environment detection and reads

**code-quality** — Level 3
- Evidence: Clear function structure, extracted pure functions (e.g., windowFor), no dead code, descriptive variable names
- Gap: Reference-quality example with comprehensive lifecycle logging and composable internals
- Next: Add lifecycle logging and further modularize internals for reference quality

**composability** — Level 1
- Evidence: Accepts standard types (array of strings), returns string; no spec/apply split or instruction builders
- Gap: No internal composition of other chains or spec/apply split exports
- Next: Refactor to expose spec/apply split functions and instruction builders to improve composability

**documentation** — Level 3
- Evidence: README has API section 'join(fragments, prompt, config)' with parameter table for windowSize, overlapPercent, styleHint, maxRetries; multiple usage examples including 'Document Synthesis'; behavioral notes in 'How It Works' section
- Gap: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- Next: Add detailed architecture overview, edge case handling, performance considerations, and guidance on composing with other chains in README

**errors-retry** — Level 1
- Evidence: Imports 'lib/retry' and uses retry() with default 429-only policy, no input validation or custom error handling
- Gap: Add input validation and defined failure modes with enhanced retry strategies
- Next: Implement input validation and multi-level retry with error context

**events** — Level 1
- Evidence: Imports 'onProgress' config param and passes it to retry calls, no own event emission
- Gap: Emit standard events (start, complete, step) via progress-callback
- Next: Implement emitting standard lifecycle events using progress-callback

**logging** — Level 0
- Evidence: No import of 'lib/lifecycle-logger', no usage of createLifecycleLogger or logger calls
- Gap: Accepts 'logger' config and uses logger?.info() inline
- Next: Add 'logger' parameter and use logger?.info() for inline logging

**prompt-engineering** — Level 0
- Evidence: The join chain uses inline template literals for prompt construction, e.g., the 'instruction' variable is built via string interpolation combining the 'prompt' parameter, optional 'styleHint', and fragment lists. There is no usage of shared prompt utilities such as promptConstants or asXML. No system prompts, temperature settings, or response_format usage are present. The chain directly calls callLlm with constructed prompt strings and uses retry for robustness.
- Gap: Missing use of shared prompt utilities like promptConstants and asXML for variable wrapping, no system prompts or temperature tuning, no response_format usage.
- Next: Refactor prompt construction to use promptConstants and asXML for variable wrapping to improve prompt modularity and maintainability.

**testing** — Level 4
- Evidence: Has 'index.spec.js' with unit tests and 'index.examples.js' using 'aiExpect' for semantic validation

**token-management** — Level 0
- Evidence: No usage of 'lib/text-batch' or createBatches for token-budget-aware splitting
- Gap: Implement token-budget-aware input splitting using createBatches
- Next: Integrate 'createBatches' to manage token budgets for input processing


### list (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: At 220 lines of code in a single module, the design is clean and proportional to the problem complexity. It uses existing library primitives like retry and callLlm without reimplementing batch processing, and the processing steps are clear from the top-level functions.

**composition-fit** — Level 2
- Evidence: The chain exposes a clean function interface (generateList) that can be used as a pipeline step, but it does not build on the library's own batch processing primitives like map, filter, or reduce internally, nor does it export spec/apply patterns or instruction builders.
- Gap: Refactor to leverage existing batch processing chains and spec/apply patterns to improve composability.
- Next: Decompose the list generation logic to use map or filter chains and export spec/apply interfaces for better integration.

**design-efficiency** — Level 3
- Evidence: The implementation is about 220 lines with a single main export, uses a few helper functions, and cleanly integrates retry and LLM calls. The LOC is proportional to the complexity of streaming generation, filtering, and schema transformation.

**generalizability** — Level 4
- Evidence: The chain accepts natural language prompts and works with any text input, with no hard dependencies on specific runtimes or data formats. It is isomorphic and adaptable to new use cases without modification.

**strategic-value** — Level 3
- Evidence: The 'list' chain is a core capability frequently needed in AI pipelines for generating contextual lists from natural language prompts, enabling workflows like brainstorming and streaming generation. It is used across various projects as indicated by its integration in the portfolio alongside other core chains.


#### Implementation Quality

**api-surface** — Level 2
- Evidence: Exports `generateList` only, accepts shared config params `shouldSkip`, `shouldStop`, `model`, `maxAttempts`, `onProgress`, `now`, `_schema`, `llm`, `schema`
- Gap: No instruction builders or spec/apply split
- Next: Implement instruction builders and spec/apply split to improve composability and API clarity

**browser-server** — Level 0
- Evidence: No usage of 'lib/env' or runtime environment detection; no isomorphic environment handling
- Gap: Use 'lib/env' for environment detection to support both browser and server
- Next: Refactor to use 'lib/env' for environment reads instead of direct process.env or node-only APIs

**code-quality** — Level 3
- Evidence: Clear function separation (createModelOptions, generateList), no dead code, consistent camelCase naming, extracted pure functions
- Gap: Further separation of concerns and composability for reference-quality
- Next: Refactor to improve composability and explicit transformations for reference-quality code

**composability** — Level 2
- Evidence: Chain composes internal logic but does not export spec/apply split or instruction builders
- Gap: Missing spec/apply function exports and instruction builders
- Next: Add spec/apply split functions and instruction builders to enhance composability

**documentation** — Level 4
- Evidence: README has API Reference section with detailed `list(prompt, config)` and `generateList(prompt, options)` descriptions, multiple usage examples including streaming and custom control logic, and structured output with schema

**errors-retry** — Level 1
- Evidence: Imports 'lib/retry' and uses retry() with default 429-only policy, basic try/catch around callLlm
- Gap: Add input validation and defined failure modes beyond basic retry
- Next: Implement input validation and more sophisticated retry strategies with error context

**events** — Level 1
- Evidence: Imports 'onProgress' in config and passes it to retry calls but does not emit events directly
- Gap: Emit standard lifecycle events (start, complete, step) via progress-callback
- Next: Use 'lib/progress-callback' to emit start and complete events in generateList

**logging** — Level 0
- Evidence: No import of 'lib/lifecycle-logger', no usage of createLifecycleLogger or logger.info
- Gap: Add lifecycle logger usage with logStart and logResult
- Next: Import 'lib/lifecycle-logger' and use createLifecycleLogger with logStart/logResult in generateList

**prompt-engineering** — Level 3
- Evidence: Uses promptConstants: onlyJSONArray, contentIsTransformationSource, onlyJSON; uses prompt builder functions: generateListPrompt, asObjectWithSchemaPrompt; uses response_format with JSON schema (listResultSchema) in createModelOptions; uses retry wrapper for callLlm; system prompt usage implied via promptConstants; temperature not explicitly set (default used); response_format consistently applied for structured output.
- Gap: No explicit temperature tuning or multi-stage prompt pipelines with frequency/presence penalty tuning.
- Next: Introduce explicit temperature settings and multi-stage prompt pipelines with penalty tuning to improve prompt control and output quality.

**testing** — Level 4
- Evidence: Has `index.spec.js` with unit tests and `index.examples.js` using `aiExpect` for semantic validation

**token-management** — Level 0
- Evidence: No usage of 'lib/text-batch' or createBatches for token-budget-aware splitting
- Gap: Implement token-budget-aware batching using createBatches
- Next: Integrate 'lib/text-batch' createBatches to manage token budgets in input processing


### llm-logger (standard)

#### Design Fitness

**architectural-fitness** — Level 2
- Evidence: The module is large (652 LOC) and implements a bespoke ring buffer and parallel processing system rather than building on existing library primitives like map, filter, or reduce. This bespoke infrastructure adds complexity beyond the core idea of enhanced logging.
- Gap: Refactor to leverage existing batch processing chains and reduce bespoke coordination logic.
- Next: Extract batch processing and filtering logic to use core library chains where possible.

**composition-fit** — Level 1
- Evidence: The module does not build on the library's core primitives (map, filter, reduce) but implements its own batch processing and coordination. It is a standalone monolith without exposing composable interfaces for integration into larger pipelines.
- Gap: Redesign to expose composable interfaces and build on existing library primitives.
- Next: Refactor to implement processors and lanes as composable chains using spec/apply and instruction builders.

**design-efficiency** — Level 1
- Evidence: At 652 LOC with a single main export and multiple internal helpers, the module shows significant complexity and bespoke infrastructure. The many configuration parameters and custom ring buffer suggest the design is fighting the implementation.
- Gap: Simplify design by reducing bespoke coordination and leveraging existing abstractions.
- Next: Modularize the logger to separate concerns and reduce internal complexity.

**generalizability** — Level 3
- Evidence: The design is general purpose for AI/LLM logging enhancement, using NDJSON and batch processing without hard dependencies on specific frameworks or runtimes. It can be adapted across domains needing enhanced logging.

**strategic-value** — Level 3
- Evidence: The llm-logger module provides an advanced logging system with AI enrichment capabilities, enabling developers to enhance logs with LLM-powered processors. It supports parallel processing, non-destructive enhancements, and batch NDJSON processing, which are valuable for AI/LLM applications. It is a core capability frequently needed in AI pipelines for logging and analysis.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports initLogger, log, createConsoleWriter, createFileWriter, createHostLoggerIntegration, createLLMLogger with default export
- Gap: Lacks documented instruction builders and spec/apply split
- Next: Introduce instruction builders and spec/apply split exports for enhanced API composability

**browser-server** — Level 0
- Evidence: No import or usage of 'lib/env'; no runtime.isBrowser or runtime.isNode checks; uses console and standard JS only
- Gap: Use 'lib/env' for environment detection to support both browser and server
- Next: Refactor environment checks to use 'lib/env' for isomorphic compatibility

**composability** — Level 2
- Evidence: Exports createLLMLogger and writer factory functions (createConsoleWriter, createFileWriter, createHostLoggerIntegration) indicating some internal composition
- Gap: No spec/apply split or instruction builders for multiple chains
- Next: Implement spec/apply split functions and instruction builders to improve composability

**documentation** — Level 3
- Evidence: README has Basic Usage, Parameters, Return Value, Key Features, Log Processors, Lane Configuration, Advanced Usage sections with multiple code examples and behavioral notes
- Gap: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- Next: Add architecture overview, edge case handling, performance considerations, and composition guidance to README

**errors-retry** — Level 0
- Evidence: No import or usage of 'lib/retry'; error handling limited to try/catch in processor loop with simple retry via setTimeout; no structured error handling or retry policies
- Gap: Adopt 'lib/retry' with defined retry policies and structured error handling
- Next: Implement retry logic using 'lib/retry' with conditional retry and error context attachment

**events** — Level 0
- Evidence: No import of 'lib/progress-callback'; no event emission functions or onProgress handlers detected
- Gap: Import and use 'lib/progress-callback' to emit standard lifecycle events
- Next: Add event emission using 'lib/progress-callback' with standard events like start, complete, step

**logging** — Level 0
- Evidence: Imports 'lib/logger' but does not import 'lib/lifecycle-logger'; no usage of createLifecycleLogger or logStart/logResult; uses console.log in createConsoleWriter
- Gap: Use 'lib/lifecycle-logger' and its functions like createLifecycleLogger, logStart, logResult
- Next: Integrate 'lib/lifecycle-logger' and replace console.log calls with lifecycle logging calls

**testing** — Level 2
- Evidence: Has index.spec.js with unit tests and index.examples.js with example tests, but no aiExpect usage
- Gap: Missing aiExpect semantic validation and property-based tests
- Next: Add aiExpect assertions in example tests to enhance semantic validation

**token-management** — Level 0
- Evidence: No import or usage of 'lib/text-batch' or createBatches; no token budget or chunking logic present
- Gap: Implement token-budget-aware batching using 'lib/text-batch'
- Next: Integrate 'createBatches' for token-aware input splitting to manage cost


### map (core)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: The design is clean and proportional to the problem complexity, with clear phases for batching, retry, and parallel processing. The 306 LOC reflect the complexity of batch orchestration and retry logic without unnecessary abstractions.

**composition-fit** — Level 2
- Evidence: The chain does not use other chains internally and reimplements batch processing logic rather than composing existing primitives, limiting its composability within the library.
- Gap: Refactor to build on existing library primitives like list-batch or other batch chains to improve composability.
- Next: Extract batch processing logic to leverage existing chains and expose spec/apply pattern for better composition.

**design-efficiency** — Level 3
- Evidence: At 306 LOC with a single main export and moderate helper functions, the implementation is efficient and proportional to the complexity of batch processing, retry, and progress tracking.

**generalizability** — Level 3
- Evidence: The chain accepts natural language instructions and processes generic string lists, with no hard dependencies on specific frameworks or data formats, making it broadly applicable across domains.

**strategic-value** — Level 3
- Evidence: The map chain is a core batch processing primitive used frequently in AI pipelines, enabling batch transformations with retry and parallelism, as indicated by its central role and 306 LOC dedicated to robust batch processing.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports 'mapOnce' only, no default export, no instruction builders or spec/apply split
- Gap: Lacks instruction builders and spec/apply split for higher composability
- Next: Implement instruction builders and spec/apply split exports

**browser-server** — Level 0
- Evidence: No usage of `lib/env` or environment detection patterns found in source code.
- Gap: No environment abstraction or detection for browser/server compatibility.
- Next: Integrate `lib/env` usage to enable environment detection and graceful degradation.

**code-quality** — Level 4
- Evidence: Well-structured separation of concerns between `mapOnce` (core processing) and `map` (orchestration). Clear naming, no dead code, extracted pure functions.

**composability** — Level 2
- Evidence: Exports 'mapOnce' only, no spec/apply split or instruction builders; deterministic ceiling at level 2
- Gap: No spec/apply split or instruction builders to reach level 3
- Next: Refactor to export spec/apply split functions and instruction builders

**documentation** — Level 3
- Evidence: README has API section with parameter table listing 'batchSize', 'maxParallel', 'listStyle', 'autoModeThreshold', and references shared config 'llm', 'maxAttempts', 'onProgress', 'now', 'logger'; multiple usage examples and integration example with 'score' chain
- Gap: Missing architecture section, edge cases, performance notes, and composition guidance
- Next: Add comprehensive architecture and performance notes, edge case handling, and composition guidance to README

**errors-retry** — Level 3
- Evidence: Imports `retry` from `lib/retry`, uses retry with batch-level and item-level retry logic, marks failed items as `undefined` for retry, logs errors with `logger.error`.
- Gap: No custom error types or structured error vocabulary with attached logs.
- Next: Define custom error classes and attach structured context and logs to errors for better observability.

**events** — Level 3
- Evidence: Imports `lib/progress-callback` functions: `emitBatchStart`, `emitBatchComplete`, `emitBatchProcessed`, uses these batch-level event emitters.
- Gap: No phase-level event emission for multi-phase operations.
- Next: Add phase-level event emissions to support multi-phase lifecycle tracking.

**logging** — Level 3
- Evidence: Imports `createLifecycleLogger` from `lib/lifecycle-logger`, uses `createLifecycleLogger()`, calls `logStart`, `logEvent`, `logResult`, and inline `logger.info()` calls.
- Gap: Missing full lifecycle logging features like `logConstruction`, child loggers.
- Next: Implement full lifecycle logging with `logConstruction` and child loggers for finer granularity.

**prompt-engineering** — Level 2
- Evidence: Uses asXML for variable wrapping (imported from '../../prompts/wrap-variable.js'), compiles prompts with template literals including XML-wrapped instructions, uses shared utilities like listBatch, retry, parallelBatch, and lifecycle-logger. No explicit system prompt or temperature setting found. No response_format usage detected.
- Gap: Missing system prompts, temperature tuning, and response_format usage to reach level 3.
- Next: Introduce system prompts and configure temperature and response_format with JSON schemas in the prompt construction.

**testing** — Level 2
- Evidence: Has 'index.spec.js' with unit tests and 'index.examples.js' with example tests, no aiExpect usage
- Gap: Missing aiExpect coverage for semantic validation
- Next: Add aiExpect assertions in example tests for semantic validation

**token-management** — Level 2
- Evidence: Uses `createBatches` from `lib/text-batch` for token-budget-aware splitting.
- Gap: No model-aware budget calculation or proportional multi-value budget management.
- Next: Implement model-aware token budget calculations and proportional budget management.


### people (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: The chain is concise (76 LOC across 2 files) and focuses on a single responsibility: generating people profiles. It uses existing library functions like callLlm and retry without reimplementing batch processing or scoring, indicating clean design proportional to the problem.
- Gap: No significant architectural improvements needed; maintain simplicity and clarity.
- Next: Continue to monitor for opportunities to simplify or modularize if complexity grows.

**composition-fit** — Level 1
- Evidence: The chain does not use or expose the library's core batch processing chains (map, filter, reduce) or spec/apply patterns. It acts as a standalone function without composable interfaces, limiting its integration in larger pipelines.
- Gap: Refactor to expose spec/apply interfaces and leverage existing batch processing chains to improve composability.
- Next: Redesign the chain to use spec/apply pattern and integrate with map or filter chains to enable composition.

**design-efficiency** — Level 4
- Evidence: The implementation is minimal (76 LOC), with a straightforward approach using LLM calls and retry logic. There are no signs of unnecessary complexity or helper function bloat.

**generalizability** — Level 4
- Evidence: The chain accepts natural language descriptions and returns JSON objects with flexible attributes, making it fully general and context-agnostic. It does not depend on specific runtimes or data formats and uses standard LLM calls.

**strategic-value** — Level 2
- Evidence: The 'people' chain provides a useful tool for generating artificial person profiles with consistent demographics and traits, enabling workflows like persona creation and test data generation. It is moderately sized (76 LOC) and used in standard tier, indicating moderate frequency and utility.
- Gap: Increase the chain's applicability to unlock more transformative workflows, such as integration with other chains for dynamic persona adaptation.
- Next: Explore extending the chain to support spec/apply patterns or integration with batch processing chains to enhance strategic value.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default function `people` only, accepts shared config param `llm`.
- Gap: No instruction builders or spec/apply split exports.
- Next: Introduce instruction builders or spec/apply split exports to improve composability and API clarity.

**browser-server** — Level 0
- Evidence: No usage of 'lib/env' or runtime environment detection; no browser/server compatibility code
- Gap: Use 'lib/env' for environment detection to support both browser and server
- Next: Integrate 'lib/env' and add environment checks for isBrowser/isNode

**composability** — Level 1
- Evidence: Function `people` accepts standard types and returns array of objects, can be chained manually.
- Gap: No internal composition of other chains or spec/apply split exports.
- Next: Refactor to compose other chains internally or export spec/apply functions to increase composability.

**documentation** — Level 3
- Evidence: README has API section with parameter table for `people(description, count, config)`, multiple usage examples including LLM conversation roles, test data generation, user research personas, and scenario planning.
- Gap: Missing architecture section, edge cases, performance notes, and composition guidance.
- Next: Add comprehensive architecture and performance notes, edge cases, and guidance on composition in README.

**errors-retry** — Level 1
- Evidence: Imports 'lib/retry' and uses 'retry' function with default 429-only policy
- Gap: Add input validation and defined failure modes beyond basic retry
- Next: Implement input validation and error handling strategies to improve retry robustness

**events** — Level 0
- Evidence: No import of 'lib/progress-callback' or event emission functions
- Gap: Implement event emission using 'lib/progress-callback' with standard events
- Next: Add 'lib/progress-callback' import and emit lifecycle events like start and complete

**logging** — Level 0
- Evidence: No import of 'lib/lifecycle-logger' or usage of lifecycle logging functions
- Gap: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- Next: Import 'lib/lifecycle-logger' and implement lifecycle logging in the chain

**prompt-engineering** — Level 3
- Evidence: Uses asXML for variable wrapping (asXML(description, { tag: 'description' })), uses response_format with JSON schema (response_format: { type: 'json_schema', json_schema: peopleListJsonSchema }), no explicit system prompt or temperature setting noted, uses shared utility 'asXML' from prompts/wrap-variable.js.
- Gap: Missing explicit system prompt and temperature tuning to reach level 4.
- Next: Introduce a system prompt to set context and tune temperature or penalties for improved control.

**testing** — Level 4
- Evidence: Has `index.spec.js` with unit tests and `index.examples.js` using `aiExpect`.

**token-management** — Level 0
- Evidence: No usage of 'lib/text-batch' or token budget management functions
- Gap: Implement token-budget-aware batching using 'createBatches' or similar
- Next: Incorporate 'lib/text-batch' and manage token budgets for input splitting


### pop-reference (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: At 132 LOC, the chain is under 200 lines and focused on a single responsibility. It uses existing lib/llm and retry modules without reimplementing batch processing, indicating clean and proportional design.
- Next: Maintain current design; consider minor refactors if complexity grows.

**composition-fit** — Level 1
- Evidence: The chain does not use other chains internally and does not expose spec/apply or instruction builders, acting as a standalone function rather than a composable pipeline step.
- Gap: Refactor to expose spec/apply pattern and instruction builders to integrate with library primitives and enable composition.
- Next: Decompose functionality into spec generation and apply phases; provide instruction builders for use with map, filter, or score chains.

**design-efficiency** — Level 3
- Evidence: With 132 LOC and limited helper functions, the implementation is clean and proportional to the problem complexity, without excessive workarounds or duplicated logic.
- Next: Continue to monitor for complexity growth; keep implementation minimal and focused.

**generalizability** — Level 3
- Evidence: The chain accepts natural language inputs and instructions, works with any text sentence and description, and has no hard dependencies on specific runtimes or data formats, making it general purpose across domains.
- Next: Ensure continued abstraction from specific contexts to maintain generality.

**strategic-value** — Level 1
- Evidence: The pop-reference chain is a niche utility with 132 LOC, providing metaphorical pop culture references for sentences. It enables creative AI features but is not a core or frequently used tool compared to primitives like map or filter.
- Gap: Increase applicability across more workflows and demonstrate broader utility beyond niche metaphor generation.
- Next: Explore integration with other chains to support more general AI feature pipelines.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default function 'popReference' only; no spec/apply split or instruction builders
- Gap: No instruction builders or spec/apply split
- Next: Implement instruction builders and spec/apply split to improve composability and API clarity

**browser-server** — Level 0
- Evidence: No import or usage of 'lib/env' or runtime environment detection
- Gap: Use 'lib/env' for environment detection instead of direct environment checks
- Next: Add 'lib/env' import and replace any direct environment checks with it

**composability** — Level 2
- Evidence: Chain composes internally but does not export spec/apply split or instruction builders
- Gap: Missing exported spec/apply functions and instruction builders
- Next: Export spec/apply split functions and instruction builders to enhance composability

**documentation** — Level 3
- Evidence: README has API section with parameter table documenting 'sentence', 'description', 'options' including 'include', 'referenceContext', 'referencesPerSource', 'llm'; multiple usage examples; behavioral notes in 'Notes' section
- Gap: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- Next: Add architecture overview, edge case handling, performance considerations, and composition guidance to README

**errors-retry** — Level 1
- Evidence: Imports 'lib/retry' and uses retry() with default 429-only policy, no input validation or custom error handling
- Gap: Add input validation and defined failure modes beyond basic retry
- Next: Implement input validation and handle retry failures with explicit error handling

**events** — Level 1
- Evidence: Imports 'onProgress' config param and passes it to retry call but no direct event emission
- Gap: Emit standard lifecycle events (start, complete, step) using 'lib/progress-callback'
- Next: Integrate 'lib/progress-callback' to emit start and complete events around main processing steps

**logging** — Level 0
- Evidence: No import of 'lib/lifecycle-logger' or usage of createLifecycleLogger or logger methods
- Gap: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- Next: Import 'lib/lifecycle-logger' and instrument main function with createLifecycleLogger and logStart/logResult calls

**prompt-engineering** — Level 3
- Evidence: Uses asXML for variable wrapping (asXML imported from '../../prompts/wrap-variable.js'), uses promptConstants.onlyJSON from '../../prompts/index.js', employs response_format with JSON schema (popReferenceSchema) in createModelOptions, no explicit system prompt but structured prompt template literal used, temperature not explicitly set (default used).
- Gap: No system prompt usage or temperature tuning; no multi-stage prompt pipeline or penalty tuning.
- Next: Introduce a system prompt to set context and tune temperature for better control.

**testing** — Level 4
- Evidence: Has 'index.spec.js' with unit tests and 'index.examples.js' using 'aiExpect' for semantic validation

**token-management** — Level 0
- Evidence: No usage of 'lib/text-batch' or createBatches for token budget management
- Gap: Implement token-budget-aware batching using createBatches
- Next: Integrate 'lib/text-batch' createBatches to manage input size within token limits


### questions (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: At 203 LOC across 2 files, the design is clean and proportional to the problem complexity. It uses retry and LLM call abstractions without reimplementing batch processing or scoring, and the processing phases are clear.

**composition-fit** — Level 2
- Evidence: The chain exposes a clean function interface and works as a pipeline step, but it does not build on the library's core primitives like map, filter, or reduce internally, nor does it expose spec/apply patterns.
- Gap: Refactor to leverage existing batch processing chains and spec/apply patterns to improve composability.
- Next: Decompose the chain to use map/filter primitives and expose spec/apply interfaces for better integration.

**design-efficiency** — Level 3
- Evidence: The implementation is efficient and proportional to the problem complexity with 203 LOC and limited helper functions. The design avoids unnecessary complexity and workarounds.

**generalizability** — Level 4
- Evidence: The chain accepts any text input and uses natural language instructions with no hard dependencies on specific runtimes or data formats, making it fully general and context-agnostic.

**strategic-value** — Level 3
- Evidence: The questions chain is a core capability frequently needed in AI pipelines for generating relevant, thought-provoking questions from text. It enables iterative refinement and quality control, supporting workflows that explore data deeply.


#### Implementation Quality

**browser-server** — Level 0
- Evidence: No use of 'lib/env' or runtime environment detection; no isomorphic environment handling
- Gap: Use 'lib/env' for environment detection to support both browser and server
- Next: Refactor environment reads to use 'lib/env' and add graceful degradation for browser/server

**code-quality** — Level 3
- Evidence: Clean code with clear naming, extracted pure functions like getRandomSubset, pickInterestingQuestion, and formatQuestionsPrompt; no dead code; consistent camelCase naming
- Gap: Further separation of concerns and composable internals to reach reference-quality
- Next: Refactor to separate orchestration and core logic more explicitly and add comprehensive documentation

**composability** — Level 2
- Evidence: No spec/apply split or instruction builders, composability capped at level 2 per ceiling
- Gap: Missing spec/apply split and instruction builders
- Next: Implement spec/apply split functions and instruction builders to enhance composability

**documentation** — Level 3
- Evidence: README has Usage, Parameters, Returns, Algorithm, Examples sections with multiple code examples and behavioral notes
- Gap: Missing architecture section, edge cases, performance notes, and composition guidance
- Next: Add architecture overview, edge case handling, performance considerations, and composition guidance to README

**errors-retry** — Level 1
- Evidence: Imports 'lib/retry' and uses retry() with default retry policy; no input validation or custom error handling
- Gap: Add input validation and defined failure modes with error context
- Next: Implement input validation and enhance retry logic with conditional retry and error context attachment

**events** — Level 0
- Evidence: No import of 'lib/progress-callback' and no event emission detected; onProgress is accepted but only passed through to retry calls
- Gap: Emit standard lifecycle events using progress-callback
- Next: Integrate 'lib/progress-callback' and emit start, complete, and step events during processing

**logging** — Level 0
- Evidence: No import of 'lib/lifecycle-logger' or usage of createLifecycleLogger or logger calls
- Gap: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- Next: Import 'lib/lifecycle-logger' and instrument main functions with createLifecycleLogger and logStart/logResult calls

**prompt-engineering** — Level 3
- Evidence: Uses promptConstants such as asXML, asJSON, asWrappedArrayJSON for variable wrapping and JSON formatting. Employs system prompt patterns in pickInterestingQuestion and formatQuestionsPrompt functions. Sets temperature explicitly to 1 in llmConfig. Uses response_format with JSON schemas (questionsListSchema, selectedQuestionSchema) in llmConfig. Utilizes retry wrapper for callLlm with labeled attempts and progress callbacks.
- Gap: Missing multi-stage prompt pipelines and frequency/presence penalty tuning to reach level 4.
- Next: Implement multi-stage prompt pipelines and tune frequency/presence penalties in the LLM configuration.

**testing** — Level 4
- Evidence: Has index.spec.js with unit tests and index.examples.js using aiExpect

**token-management** — Level 1
- Evidence: No use of createBatches; manual token budget calculation via model.budgetTokens but no batch splitting
- Gap: Implement token-budget-aware input splitting using createBatches
- Next: Integrate 'lib/text-batch' createBatches to manage token budgets and auto-skip oversized inputs


### reduce (core)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: The chain is implemented in 173 LOC across 2 files, which is proportional to the accumulator pattern complexity. It builds on existing primitives like listBatch and retry without bespoke infrastructure, showing clean design.

**composition-fit** — Level 2
- Evidence: The chain exposes a clean function interface and uses the library's listBatch primitive internally, but does not implement spec/apply or instruction builders itself, limiting its composition fit compared to spec/apply chains.
- Gap: Integrate spec/apply pattern and instruction builders to enhance composability.
- Next: Refactor to expose spec/apply interfaces and instruction builders for use in other chains.

**design-efficiency** — Level 4
- Evidence: At 173 LOC with 2 files and minimal helpers, the implementation is concise and proportional to the accumulator pattern complexity, making the design efficient and implementation obvious.

**generalizability** — Level 4
- Evidence: The reduce chain accepts natural language instructions and works with any text input, with no hard dependencies on specific runtimes or data formats, making it fully general and context-agnostic.

**strategic-value** — Level 3
- Evidence: The reduce chain is a core batch processing primitive used frequently in AI pipelines, enabling accumulation transformations across collections. It is part of the core set (map, filter, reduce, group, sort, find) and is widely applicable.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default 'reduce' function only, no named exports, config params destructured in function signature.
- Gap: No instruction builders or spec/apply split exports.
- Next: Introduce instruction builders and spec/apply split exports to enhance API surface.

**browser-server** — Level 0
- Evidence: No import or usage of 'lib/env' or environment detection code found.
- Gap: Does not use 'lib/env' for environment reads or support both browser and server environments.
- Next: Use 'lib/env' to detect environment and support isomorphic operation.

**composability** — Level 2
- Evidence: Composes other chains internally via imports like 'listBatch', 'createBatches', 'retry', but no spec/apply split exports.
- Gap: No exported spec/apply functions or instruction builders for composability.
- Next: Export spec/apply split functions and instruction builders to improve composability.

**documentation** — Level 3
- Evidence: README has API section with parameter table for 'initial', 'responseFormat', shared config params 'llm', 'maxAttempts', 'onProgress', 'now', multiple usage examples, and behavioral notes on default accumulator behavior.
- Gap: Missing architecture section, edge cases, performance notes, and composition guidance.
- Next: Add comprehensive architecture and performance documentation, including edge cases and composition guidance.

**errors-retry** — Level 1
- Evidence: Imports 'lib/retry' and uses 'retry' function with default retry policy.
- Gap: No input validation, conditional retry, or error context attached to results.
- Next: Add input validation and enhance retry strategy with conditional retry and error context.

**events** — Level 3
- Evidence: Imports 'lib/progress-callback' and uses 'emitBatchStart', 'emitBatchProcessed', 'emitBatchComplete' functions for batch-level event emission.
- Gap: No phase-level events for multi-phase operations.
- Next: Add phase-level event emission to support multi-phase lifecycle tracking.

**logging** — Level 2
- Evidence: Imports do not include 'lib/lifecycle-logger', but code accepts 'logger' config and uses inline logging patterns (e.g., no console.log or console.warn found, but no createLifecycleLogger usage either). Deterministic ceiling is level 2.
- Gap: Does not use 'createLifecycleLogger' with 'logStart'/'logResult' framing.
- Next: Integrate 'createLifecycleLogger' and use 'logStart' and 'logResult' for lifecycle logging.

**prompt-engineering** — Level 3
- Evidence: Uses asXML for variable wrapping (imported from '../../prompts/wrap-variable.js'). Uses response_format with JSON schema (reduceAccumulatorJsonSchema). Uses retry logic with labeled attempts. Uses system-like prompt construction with detailed instructions in template literals. Temperature setting is not explicitly set, implying default. Response format is conditionally applied with JSON schema. No use of promptConstants from constants.js detected.
- Gap: Explicit temperature tuning and use of system prompts are missing to reach level 4.
- Next: Introduce explicit temperature settings and system prompt usage to enable multi-stage prompt pipelines and tuning.

**testing** — Level 4
- Evidence: Has 'index.spec.js' with unit tests and 'index.examples.js' using 'aiExpect' for semantic validation.

**token-management** — Level 2
- Evidence: Uses 'createBatches' from 'lib/text-batch' for token-budget-aware splitting.
- Gap: No model-aware budget calculation or proportional multi-value budget management.
- Next: Implement model-aware budget calculation and proportional budget management.


### relations (standard)

#### Design Fitness

**architectural-fitness** — Level 2
- Evidence: At 416 lines of code in a single module with no use of other chains, the chain is relatively large and may contain some unnecessary complexity. However, it addresses a complex problem of relation extraction with multiple phases (spec generation, apply, parsing). The design is adequate but could be simplified or decomposed further.
- Gap: Decompose the chain into smaller modules or leverage existing batch processing chains more to reduce complexity.
- Next: Refactor to split relation extraction phases into separate composable chains or utilities to improve modularity and reduce LOC per module.

**composition-fit** — Level 4
- Evidence: The chain fully embraces the library's composition philosophy by exposing spec/apply functions and instruction builders for all batch processing chains (map, filter, reduce, find, group). It enables novel workflows by combining with other chains and does not reimplement batch processing logic.

**design-efficiency** — Level 2
- Evidence: With 416 lines of code and multiple exports in a single module, the implementation shows moderate complexity. The number of helper functions and imports suggests some friction, but the design mostly works. There is room to improve by reducing LOC and simplifying configuration.
- Gap: Reduce module size and helper function count by better abstraction or decomposition.
- Next: Analyze helper functions and configuration parameters to identify candidates for refactoring or modularization to improve design efficiency.

**generalizability** — Level 3
- Evidence: The chain accepts natural language instructions and works with any text input, with optional entity disambiguation and predicate filtering. It has no hard dependencies on specific runtimes or data formats, making it broadly applicable across domains.

**strategic-value** — Level 3
- Evidence: The relations chain is a core capability frequently needed in AI pipelines for extracting structured relationship tuples from text, enabling workflows that were previously impractical. It integrates with collection chains via spec/apply pattern and instruction builders, indicating high utility.


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
- Evidence: At 309 LOC across 2 files, the design is proportional to the problem complexity. It cleanly separates spec generation and application phases, uses retry logic appropriately, and does not reimplement batch processing primitives.
- Gap: Minor simplifications could be made to reduce complexity, but overall design is clean.
- Next: Review helper functions for potential consolidation to streamline code.

**composition-fit** — Level 4
- Evidence: Follows the library's spec/apply pattern and provides instruction builders for all batch processing chains (map, filter, reduce, find, group). It integrates seamlessly with other chains and enables novel compositions.

**design-efficiency** — Level 3
- Evidence: The implementation is about 309 LOC with a balanced number of exports and helper functions. It uses retry and progress reporting efficiently without excessive complexity or workarounds.
- Gap: Could reduce LOC slightly by consolidating helper functions or simplifying configuration.
- Next: Refactor to minimize helper functions and streamline configuration parameters.

**generalizability** — Level 4
- Evidence: The chain accepts natural language instructions and works with arbitrary input data, with no hard dependencies on specific runtimes or data formats. It is isomorphic and adaptable to new use cases without modification.

**strategic-value** — Level 3
- Evidence: The scale chain is a core spec/apply pattern module with 309 LOC, widely used for nuanced data transformations in AI pipelines. It enables workflows that go beyond simple mappings, supporting multi-factor and conditional logic, which is valuable for developers building AI features.
- Gap: Could increase transformative impact by enabling more novel feedback loops or automation patterns.
- Next: Explore integration with dynamic feedback systems to unlock new workflows.


#### Implementation Quality

**api-surface** — Level 4
- Evidence: Exports `scaleSpec`, `applyScale`, `scaleItem`, `mapInstructions`, `filterInstructions`, `reduceInstructions`, `findInstructions`, `groupInstructions`, `createScale`

**browser-server** — Level 0
- Evidence: No usage of 'lib/env' or runtime environment detection; no browser/server specific code
- Gap: Use 'lib/env' for environment detection to support isomorphic operation
- Next: Add 'lib/env' import and replace any direct environment checks with env proxy usage

**composability** — Level 4
- Evidence: Exports `scaleSpec()` and `applyScale()` split; instruction builders for map, filter, reduce, find, group; factory function `createScale`

**documentation** — Level 4
- Evidence: README has detailed usage, API examples, advanced collection operations, and supporting utilities sections

**errors-retry** — Level 1
- Evidence: Imports 'lib/retry' and uses retry() with default 429-only policy; no input validation or multi-level retry logic
- Gap: Add input validation, conditional retry logic, and defined failure modes
- Next: Enhance retry usage with input validation and custom retry conditions

**events** — Level 0
- Evidence: No import of 'lib/progress-callback' or calls to emit events; onProgress is accepted but only passed through to retry calls
- Gap: Emit standard lifecycle events such as start, complete, and step using progress-callback
- Next: Integrate 'lib/progress-callback' and emit events at key points in scaleSpec and applyScale functions

**logging** — Level 0
- Evidence: No import of 'lib/lifecycle-logger' or usage of createLifecycleLogger or logger calls
- Gap: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- Next: Import 'lib/lifecycle-logger' and implement structured lifecycle logging in core functions like scaleSpec and applyScale

**prompt-engineering** — Level 3
- Evidence: Uses asXML for variable wrapping in prompts (e.g., asXML(prompt, { tag: 'scaling-instructions' })), uses promptConstants.onlyJSON for JSON output enforcement, employs system prompts (e.g., specSystemPrompt), and configures response_format with JSON schemas (scaleSpecificationJsonSchema, scaleResultSchema) in llmConfig.
- Gap: Missing multi-stage prompt pipelines and advanced tuning such as frequency/presence penalty.
- Next: Implement multi-stage prompt pipelines and tune frequency/presence penalties to improve prompt control.

**testing** — Level 2
- Evidence: Has `index.spec.js` with unit tests and `index.examples.js` using `aiExpect`
- Gap: Lacks unit tests covering edge cases and error paths
- Next: Add unit tests for edge cases and error handling

**token-management** — Level 0
- Evidence: No usage of 'lib/text-batch' or createBatches for token budget management
- Gap: Implement token-budget-aware batching using createBatches
- Next: Integrate 'lib/text-batch' and refactor to batch inputs respecting token budgets


### scan-js (development)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: At 111 lines with a single export and clear phases (search, visit, analyze), the design is clean and proportional to the problem complexity. It leverages existing library chains like sort and search-js-files without reimplementing batch processing.
- Gap: Minor simplifications could improve clarity but overall design is sound.
- Next: Document the architecture more explicitly to aid maintainability and onboarding.

**composition-fit** — Level 1
- Evidence: The chain uses other chains internally (sort) but is a black box with a single default export and no spec/apply pattern, limiting its composability within the library.
- Gap: Expose spec/apply interfaces and instruction builders to integrate with batch processing chains.
- Next: Refactor to implement spec/apply pattern and provide instruction builders for composition.

**design-efficiency** — Level 3
- Evidence: With 111 lines and limited helper functions, the implementation is efficient and proportional to the problem complexity. It avoids unnecessary complexity and uses existing libraries effectively.
- Gap: No significant design efficiency issues detected.
- Next: Maintain current design efficiency while expanding features.

**generalizability** — Level 2
- Evidence: The module is tied to JavaScript codebases and uses specific libraries like search-js-files and sort, limiting its applicability to other languages or data formats.
- Gap: Abstract language-specific dependencies to support multiple languages or generic text analysis.
- Next: Extract language-agnostic analysis core and parameterize language-specific parsing.

**strategic-value** — Level 2
- Evidence: The scan-js chain is a useful internal tool for automated code quality analysis, enabling developers to assess maintainability, complexity, and patterns in JavaScript codebases. It solves a real problem but is primarily for internal use and not a core composition primitive, limiting its frequency of use.
- Gap: Increase general applicability and integration to become a core AI pipeline tool.
- Next: Refactor to expose composable interfaces and broaden use cases beyond internal code analysis.


#### Implementation Quality

**browser-server** — Level 0
- Evidence: Uses 'node:fs/promises' import indicating Node-only environment
- Gap: Use 'lib/env' for environment detection to support browser and server
- Next: Replace direct Node imports with 'lib/env' abstractions for isomorphic support

**code-quality** — Level 3
- Evidence: Clear function separation (visit, default export), descriptive naming, no dead code
- Gap: Further modularization and composability for reference-quality code
- Next: Refactor to improve composability and explicit transformations

**composability** — Level 2
- Evidence: No spec/apply split, but composes other chains internally (uses search, sort chains)
- Gap: Missing spec/apply split and instruction builders
- Next: Refactor to export spec/apply functions and instruction builders for composability

**documentation** — Level 3
- Evidence: README has Purpose, Internal Architecture, Features Analyzed, Technical Details sections describing module usage and design
- Gap: Missing explicit API section with parameter table and shared config references
- Next: Add an API section in README listing exports and config parameters with examples

**errors-retry** — Level 1
- Evidence: Imports 'lib/retry' and uses retry() function for basic retry
- Gap: Add input validation and defined failure modes beyond basic retry
- Next: Implement input validation and error handling strategies with retry

**events** — Level 0
- Evidence: No import of 'lib/progress-callback' or usage of event emission functions
- Gap: Implement standardized event emission using 'lib/progress-callback'
- Next: Add 'onProgress' support and emit standard lifecycle events

**logging** — Level 0
- Evidence: No import of 'lib/lifecycle-logger' or usage of createLifecycleLogger or logger methods
- Gap: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- Next: Import 'lib/lifecycle-logger' and implement structured lifecycle logging calls

**prompt-engineering** — Level 3
- Evidence: Uses imported prompt module 'codeFeaturesPrompt' for prompt construction; employs 'makeJSONSchema' for JSON schema generation; uses 'llm' call with 'response_format' specifying JSON schema with name 'code_features_analysis'; model options include modelName 'fastGood'; no explicit system prompt or temperature setting found; no use of promptConstants detected.
- Gap: Missing explicit system prompt and temperature tuning; no multi-stage prompt pipeline or penalty tuning.
- Next: Introduce explicit system prompt and temperature parameter tuning to improve prompt control and move towards level 4.

**testing** — Level 2
- Evidence: Has index.examples.js using aiExpect, no spec tests
- Gap: No unit tests covering edge cases or error paths
- Next: Add unit tests with vitest covering edge cases and error handling

**token-management** — Level 0
- Evidence: No usage of 'createBatches' or token-budget-aware splitting
- Gap: Implement token-budget-aware input chunking using 'createBatches'
- Next: Integrate 'createBatches' for token management in LLM calls


### score (core)

#### Design Fitness

**architectural-fitness** — Level 4
- Evidence: The chain uses the spec/apply pattern naturally, with a clean design proportional to the problem. Despite 395 LOC, the complexity is justified by the scoring functionality and it builds on primitives without reimplementing batch processing.

**composition-fit** — Level 3
- Evidence: The chain follows library composition patterns by exposing spec/apply and instruction builders for map, filter, reduce, find, and group chains, enabling it to be both a consumer and provider in compositions.

**design-efficiency** — Level 3
- Evidence: The implementation is clean and proportional to the complexity of scoring, with 395 LOC and a reasonable number of helper functions. The design makes the implementation straightforward without excessive workarounds.

**generalizability** — Level 3
- Evidence: The chain accepts natural language instructions and works with any text data, with no hard dependencies on specific frameworks or data formats, making it general purpose across domains.

**strategic-value** — Level 3
- Evidence: The score chain is a core capability frequently used in AI pipelines, enabling specification-based scoring across items. It integrates with all collection chains and is widely applicable across projects, as indicated by its exports and usage in the portfolio context.


#### Implementation Quality

**api-surface** — Level 3
- Evidence: Exports `scoreSpec`, `applyScore`, `scoreItem`, `mapScore`, `mapInstructions`, `filterInstructions`, `reduceInstructions`, `findInstructions`, `groupInstructions` with documented naming and spec/apply split.
- Gap: Missing factory functions and calibration utilities to reach level 4.
- Next: Add factory functions and calibration utilities exports to complete API surface.

**browser-server** — Level 1
- Evidence: No use of 'lib/env', no 'runtime.isBrowser' or 'runtime.isNode' detected; likely uses 'process.env' directly
- Gap: Use 'lib/env' for environment detection instead of direct 'process.env' access
- Next: Refactor environment checks to use 'lib/env' proxy for isomorphic compatibility

**composability** — Level 3
- Evidence: Exports `scoreSpec()` and `applyScore()` split; provides instruction builders `mapInstructions`, `filterInstructions`, `reduceInstructions`, `findInstructions`, `groupInstructions` for multiple collection chains.
- Gap: No factory functions for full composability level 4.
- Next: Implement and export factory functions to enhance composability.

**documentation** — Level 4
- Evidence: README has API section listing default export `mapScore(list, instructions, config)`, functions `scoreItem`, `scoreSpec`, `applyScore`, and instruction builders `mapInstructions`, `filterInstructions`, `reduceInstructions`, `findInstructions`, `groupInstructions`. README includes usage examples, configuration details, architecture explanation.

**errors-retry** — Level 3
- Evidence: Uses 'retry' from 'lib/retry' with batch and item-level retry, marks failed items as undefined and retries them, logs errors with 'logger?.error'
- Gap: No custom error types or structured error context attached
- Next: Introduce custom error types and attach structured context to errors for better observability

**events** — Level 4
- Evidence: Imports from 'lib/progress-callback' and calls 'emitBatchStart', 'emitBatchProcessed', 'emitBatchComplete', 'emitPhaseProgress'

**logging** — Level 2
- Evidence: Imports 'logger' in config, uses 'logger?.error' calls inline for error logging
- Gap: Does not use 'createLifecycleLogger' with 'logStart'/'logResult' framing
- Next: Refactor to use 'createLifecycleLogger' for structured lifecycle logging

**testing** — Level 2
- Evidence: Has `index.spec.js` with unit tests and `index.examples.js` with example tests; no usage of `aiExpect`.
- Gap: Lacks `aiExpect` coverage and property-based or regression tests to reach level 4.
- Next: Add `aiExpect` assertions in example tests and introduce property-based or regression tests.

**token-management** — Level 2
- Evidence: Uses 'createBatches' from 'lib/text-batch' for token-budget-aware splitting
- Gap: No evidence of model-aware budget calculation or proportional multi-value budget management
- Next: Implement model-aware token budget calculations and proportional budget management


### set-interval (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: 170 LOC is proportional to the complexity of AI-driven interval scheduling; clear phases in main function; no reimplementation of batch primitives; uses existing retry and template utilities.
- Gap: Minor simplifications possible but overall design is clean and proportional.
- Next: Review for any redundant helper functions to streamline further.

**composition-fit** — Level 1
- Evidence: Does not use or expose core library batch processing chains (map, filter, reduce) internally; acts as a standalone orchestrator for AI-driven timing; no spec/apply pattern or instruction builders.
- Gap: Refactor to leverage existing batch processing chains and expose spec/apply interfaces to improve composability.
- Next: Decompose timing logic into composable primitives that integrate with map/filter/reduce chains.

**design-efficiency** — Level 3
- Evidence: 170 LOC with a single main export is efficient for the problem complexity; uses a few helper functions; no excessive imports; implementation is straightforward and clear.

**generalizability** — Level 4
- Evidence: No hard dependencies on specific frameworks or runtimes; uses natural language prompts and generic data inputs; isomorphic design suitable for various contexts.

**strategic-value** — Level 3
- Evidence: Enables AI-driven dynamic scheduling workflows previously impractical; useful for developers building self-tuning or creative interval-based features; moderately frequent use as a standard tier chain.
- Gap: Could increase adoption by providing more out-of-the-box use cases or integrations.
- Next: Document additional example workflows demonstrating unique capabilities.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default function 'setInterval' only, no named exports
- Gap: No shared config destructuring or documented multiple exports
- Next: Refactor to include shared config destructuring and document all exports

**browser-server** — Level 0
- Evidence: No import or usage of 'lib/env' or runtime environment detection
- Gap: Use 'lib/env' for environment detection to support both browser and server
- Next: Refactor to use 'lib/env' for environment reads instead of direct environment checks

**code-quality** — Level 3
- Evidence: Clear function separation (toMs, setInterval), descriptive variable names, no dead code, consistent camelCase naming
- Gap: Improve composability and explicit transformation separation for reference-quality code
- Next: Refactor to further separate concerns and extract pure functions for better composability

**composability** — Level 2
- Evidence: No spec/apply split or instruction builders, but composes other chains internally (uses numberWithUnits, number, date chains)
- Gap: Missing spec/apply split and instruction builders
- Next: Implement spec/apply split and provide instruction builders for composability

**documentation** — Level 3
- Evidence: README has API Reference section with parameter table and example, includes behavioral notes and integration example 'Photography Alarm'
- Gap: Missing comprehensive architecture, edge cases, performance notes, and composition guidance
- Next: Add architecture overview, edge case handling, performance considerations, and composition guidance to README

**errors-retry** — Level 1
- Evidence: Imports 'lib/retry' and uses retry() with default 429-only policy, basic retry implemented
- Gap: Add input validation, defined failure modes, and error context attachment
- Next: Enhance retry strategy with input validation and error context for better error handling

**events** — Level 1
- Evidence: Imports 'onProgress' in function parameters and passes it to retry call but does not emit own events
- Gap: Emit standard lifecycle events (start, complete, step) using 'lib/progress-callback'
- Next: Implement event emission for key lifecycle phases using 'lib/progress-callback' emitters

**logging** — Level 0
- Evidence: No import of 'lib/lifecycle-logger' or usage of createLifecycleLogger or logger methods
- Gap: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- Next: Import 'lib/lifecycle-logger' and implement structured lifecycle logging in the chain

**prompt-engineering** — Level 3
- Evidence: Uses promptConstants: contentIsInstructions, explainAndSeparate, explainAndSeparatePrimitive; uses asXML for variable wrapping (lastResult, history, count); uses templateReplace for prompt variable substitution; constructs prompt as a template literal combining constants and wrapped variables; uses retry with callLlm for LLM invocation; no explicit temperature setting or response_format usage; system prompt is implicit via contentIsInstructions constant.
- Gap: Explicit system prompt usage, temperature tuning, and response_format with JSON schemas are missing to reach level 4.
- Next: Introduce explicit system prompts, set temperature parameters, and implement response_format with JSON schema for structured output.

**testing** — Level 2
- Evidence: Has 'index.spec.js' with unit tests and 'index.examples.js' example tests, but no aiExpect usage
- Gap: Lacks aiExpect coverage for semantic validation
- Next: Add aiExpect assertions in example tests for semantic validation

**token-management** — Level 0
- Evidence: No usage of 'lib/text-batch' or createBatches for token budget management
- Gap: Implement token-budget-aware input chunking using createBatches
- Next: Integrate 'lib/text-batch' createBatches to manage token budgets for prompts


### socratic (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: At 273 lines across 3 files, the design is proportional to the complexity of generating and managing Socratic dialogues. It cleanly separates question and answer generation phases and uses retry and logging utilities without reimplementing batch processing or scoring. The design is clear and modular.

**composition-fit** — Level 1
- Evidence: The socratic chain does not use other chains internally nor expose spec/apply or instruction builder patterns. It is a standalone monolith focused on a specific dialogue generation task, limiting its composability within the library's batch processing primitives.
- Gap: Refactor to expose spec/apply pattern and instruction builders to integrate with existing map/filter/reduce chains.
- Next: Decompose socratic into spec generation and application chains to enable composition with core primitives.

**design-efficiency** — Level 3
- Evidence: The implementation is 273 LOC with a clear separation of concerns and moderate helper functions. It uses existing library utilities for retry, logging, and LLM calls efficiently. The LOC is proportional to the problem complexity of managing multi-turn Socratic dialogues.

**generalizability** — Level 4
- Evidence: The chain accepts natural language topics and instructions, works with any text input, and does not depend on any specific runtime or data format. It is isomorphic and adaptable to new use cases without modification.

**strategic-value** — Level 3
- Evidence: The socratic chain enables a core capability of generating progressive, thought-provoking questions using the Socratic method, which is a powerful tool for educational and problem-solving workflows. It is a unique AI-powered function not easily replicated by simpler chains, and it is likely to be frequently used by developers building AI features that require critical thinking and dialogue generation.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default 'socratic' only, no instruction builders or spec/apply split
- Gap: No documented named exports or instruction builders
- Next: Introduce and document instruction builders and spec/apply split exports

**browser-server** — Level 0
- Evidence: No usage of `lib/env` or environment detection patterns found
- Gap: Add environment detection using `lib/env` to support both browser and server environments
- Next: Integrate `lib/env` for environment detection and adapt code for isomorphic compatibility

**composability** — Level 2
- Evidence: Chain composes internally via class 'SocraticMethod' with methods 'ask' and 'answer', but no spec/apply split or factory functions
- Gap: Missing spec/apply split exports and factory functions for higher composability
- Next: Refactor to export spec/apply functions and factory methods to improve composability

**documentation** — Level 3
- Evidence: README has API section 'socratic(topic, focus, config)' with parameter table and multiple usage examples including Educational Discussion, Problem-Solving Sessions, Self-Reflection Prompts
- Gap: Missing architecture section, edge cases, performance notes, and composition guidance
- Next: Add comprehensive architecture and performance documentation, include edge cases and composition guidance in README

**errors-retry** — Level 1
- Evidence: Imports `lib/retry` and uses `retry` with default 429-only retry policy, no custom error handling or validation
- Gap: Add input validation, multi-level retry strategies, and error context attachment
- Next: Enhance error handling with input validation and richer retry strategies

**events** — Level 4
- Evidence: Imports `lib/progress-callback`, calls `emitStepProgress` multiple times for phase-level event emission

**logging** — Level 4
- Evidence: Imports `lib/lifecycle-logger`, uses `createLifecycleLogger`, calls `logStart`, `logEvent`, `logResult`, and `logger.info` for structured lifecycle logging

**prompt-engineering** — Level 3
- Evidence: Uses extracted prompt builder functions buildAskPrompt and buildAnswerPrompt with template literals; uses promptConstants explainAndSeparate and explainAndSeparatePrimitive in socratic-question-schema.js and socratic-answer-schema.js; sets temperature explicitly to 0.7 in llmConfig; uses response_format with JSON schemas socraticQuestionSchema and socraticAnswerSchema; uses system prompt style by including Socratic method guidelines in prompt construction; uses logger for lifecycle events; no use of asXML or promptConstants for variable wrapping.
- Gap: Missing multi-stage prompt pipelines and frequency/presence penalty tuning to reach level 4.
- Next: Implement multi-stage prompt pipelines and tune frequency/presence penalties for improved prompt control.

**testing** — Level 4
- Evidence: Has 'index.spec.js' with unit tests, 'index.examples.js' using 'aiExpect' for semantic validation

**token-management** — Level 1
- Evidence: Uses model's `budgetTokens` method for model-aware token budget calculation
- Gap: No proportional multi-value budget management or auto-summarization
- Next: Implement proportional multi-value budget management and auto-summarization features


### sort (core)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: At 256 lines of code, the design is proportional to the problem complexity. It uses a clear multi-phase tournament-style algorithm with chunked processing and progressive extraction. It does not reimplement existing primitives but builds a custom approach suited to sorting with LLMs.
- Next: Refactor minor complexity if identified, but current design is clean and proportional.

**composition-fit** — Level 2
- Evidence: The sort chain exposes a clean function interface accepting items and instructions, returning sorted items. However, it does not build on other library primitives like map or filter internally, implementing its own batch processing and tournament logic.
- Gap: Refactor to leverage existing batch processing chains (map, filter) for internal operations to improve composition fit.
- Next: Decompose sorting logic to use library primitives for chunk processing and scoring to enhance composability.

**design-efficiency** — Level 3
- Evidence: The implementation is 256 lines with a few helper functions, proportional to the complexity of AI-powered sorting. The code includes some workarounds for LLM output inconsistencies but is generally clean and efficient.
- Next: Monitor for opportunities to simplify token budget management or reduce helper functions if complexity grows.

**generalizability** — Level 4
- Evidence: The chain accepts natural language criteria and works with any text input list, with no hard dependencies on specific runtimes or data formats. It is isomorphic and context-agnostic, fitting the core verblets pattern.
- Next: Ensure continued adherence to natural language instructions and avoid context-specific coupling.

**strategic-value** — Level 3
- Evidence: The sort chain is a core capability frequently needed in AI pipelines, enabling sorting of massive datasets using AI-powered semantic understanding, which traditional algorithms cannot handle. It is part of the core batch processing chains and supports novel workflows like learning path sequencing.
- Next: Maintain and promote integration with other core chains to maximize usage.


#### Implementation Quality

**api-surface** — Level 2
- Evidence: Exports `defaultSortChunkSize`, `defaultSortExtremeK`, `defaultSortIterations`, `useTestSortPrompt`
- Gap: No instruction builders or spec/apply split
- Next: Implement instruction builders and spec/apply function split to enhance API surface

**browser-server** — Level 1
- Evidence: Directly uses `process.env.VERBLETS_DEBUG` in code
- Gap: Use `lib/env` abstraction for environment detection and variable access
- Next: Refactor to use `lib/env` for environment variables instead of direct `process.env` access

**code-quality** — Level 2
- Evidence: Clean algorithm structure, extracted pure functions like `createModelOptions`, `sanitizeList`, and `sortBatch`; uses Ramda's `splitEvery`
- Gap: Better reuse of common utilities (e.g., deduplicate `createModelOptions`), reduce `console.warn` usage, and remove minor code duplication
- Next: Extract shared utilities and replace `console.warn` with logger calls to improve consistency

**documentation** — Level 3
- Evidence: README has API section with parameter table for chain-specific config, shared config reference, and multiple usage examples
- Gap: Missing architecture section, edge cases, performance notes, and composition guidance
- Next: Add architecture overview, edge case handling, performance considerations, and composition guidance to README

**errors-retry** — Level 1
- Evidence: Imports `lib/retry` and uses `retry` with default retry policy; no input validation or custom error handling
- Gap: Add input validation, multi-level retry strategies, and error context attachment
- Next: Implement input validation and enhance retry logic with conditional retries and error context

**events** — Level 2
- Evidence: Imports `lib/progress-callback` and calls `emitStart`, `emitStepProgress`, and `emitComplete`
- Gap: Emit batch-level events like `batchStart`, `batchProcessed`, `batchComplete`
- Next: Add batch-level event emissions during batch processing steps

**logging** — Level 1
- Evidence: Uses `console.warn` for warnings when sorted length mismatches; no import or usage of `lib/lifecycle-logger`
- Gap: Accepts a logger config and uses `logger?.info()` or uses `createLifecycleLogger` for structured logging
- Next: Add a logger parameter and replace `console.warn` with structured logging calls

**prompt-engineering** — Level 3
- Evidence: Uses imported prompt constant 'sortPromptInitial' from prompts/index.js; employs a JSON schema response_format with 'sortSchema' for structured output; sets response_format in createModelOptions function; uses retry wrapper for LLM calls; no explicit system prompt or temperature setting found in source code; response_format usage is consistent and robust.
- Gap: No explicit system prompt or temperature tuning to reach level 4.
- Next: Introduce multi-stage prompt pipelines and tune frequency/presence penalties or temperature settings.

**testing** — Level 4
- Evidence: Has `index.spec.js` with unit tests, `index.examples.js` using `aiExpect`

**token-management** — Level 1
- Evidence: Manual chunking of input list using Ramda's `splitEvery` for batch processing; no use of `createBatches` or token-budget-aware splitting
- Gap: Use `createBatches` for token-budget-aware batch splitting
- Next: Refactor batch splitting to use `createBatches` for token-aware chunking


### split (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: At 113 LOC, the chain is concise and focused on its core task. It uses existing library utilities (chunkSentences, retry, callLlm) without reimplementing batch processing or scoring. The design clearly separates chunking, prompt building, and LLM calls.
- Gap: Minor complexity in retry and chunk management could be simplified but overall design is proportional.
- Next: Refactor prompt building and chunk processing for clearer separation if complexity grows.

**composition-fit** — Level 2
- Evidence: The chain exposes a clean async function interface that can be used as a pipeline step. However, it does not build on the library's core batch primitives (map, filter, reduce) or spec/apply patterns, and does not expose instruction builders.
- Gap: Refactor to use or expose spec/apply pattern and integrate with batch processing chains for better composability.
- Next: Design spec generation and apply functions for split instructions to enable composition with other chains.

**design-efficiency** — Level 3
- Evidence: The implementation is clean and concise at 113 LOC, with a few helper functions. It uses existing library utilities and avoids unnecessary complexity or workarounds.
- Gap: Could reduce helper function count or simplify prompt construction further.
- Next: Review helper functions for consolidation and simplify prompt building logic.

**generalizability** — Level 4
- Evidence: The chain accepts any text input and natural language instructions, with no hard dependencies on specific frameworks or data formats. It is isomorphic and uses optional LLM config, making it broadly applicable.

**strategic-value** — Level 3
- Evidence: The split chain enables developers to insert semantic split points in text using natural language instructions, a core capability useful in many AI pipelines for text processing. It is frequently needed for chunking large texts meaningfully, which is a common task.
- Gap: Could increase strategic value by enabling more complex or multi-modal splitting strategies.
- Next: Explore support for additional input types or richer instruction sets to broaden use cases.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default `split` function only; no instruction builders or spec/apply split exports.
- Gap: No instruction builders or spec/apply split exports to support higher composability.
- Next: Implement and export instruction builders and spec/apply split functions to improve API surface maturity.

**browser-server** — Level 0
- Evidence: No use of lib/env or runtime environment detection, no browser/server compatibility code
- Gap: Use lib/env for environment reads to support both browser and server
- Next: Integrate lib/env and add environment checks for isBrowser/isNode

**code-quality** — Level 3
- Evidence: Clear function separation (buildPrompt, split), no dead code, descriptive naming, extracted pure functions
- Gap: Reference-quality documentation and example-level implementation
- Next: Add comprehensive documentation and examples to reach reference quality

**composability** — Level 1
- Evidence: Exports default `split` function; no spec/apply split functions or instruction builders.
- Gap: Lacks spec/apply split exports and instruction builders for chain composition.
- Next: Refactor to provide spec/apply split functions and instruction builders to enable better composability.

**documentation** — Level 3
- Evidence: README has API section with parameter table for chain-specific config params `chunkLen`, `delimiter`, `targetSplitsPerChunk`, and references shared config params `llm`, `maxAttempts`, `onProgress`, `now`. README includes usage example and detailed 'How It Works' section.
- Gap: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance.
- Next: Add architecture overview, edge case handling, performance considerations, and guidance on composing this chain with others in README.

**errors-retry** — Level 1
- Evidence: Uses retry from lib/retry with default 429-only policy, basic retry implementation
- Gap: Add input validation and defined failure modes
- Next: Implement input validation and handle failure modes explicitly

**events** — Level 1
- Evidence: Accepts onProgress in config but only passes it through to retry calls, no custom event emission
- Gap: Emit standard lifecycle events (start, complete, step) via progress-callback
- Next: Implement event emission using lib/progress-callback to signal operation progress

**logging** — Level 1
- Evidence: Uses console.warn for error logging in catch blocks, no use of logger or lifecycle-logger
- Gap: Accepts logger config and uses logger?.info() for inline logging
- Next: Add logger parameter and replace console.warn with logger?.info() calls

**prompt-engineering** — Level 3
- Evidence: Uses wrapVariable from prompts/wrap-variable.js for variable wrapping, indicating use of shared prompt utilities. The prompt builder function 'buildPrompt' extracts prompt construction logic. Temperature is explicitly set to 0.1 for consistency in llmConfig. No system prompt is explicitly set, but prompt construction is modular. No response_format usage detected.
- Gap: Missing system prompt usage and response_format with JSON schemas to reach level 4.
- Next: Introduce system prompts to set LLM role and add response_format with JSON schema for structured output.

**testing** — Level 4
- Evidence: Has `index.spec.js` with unit tests and `index.examples.js` using `aiExpect` for semantic validation.

**token-management** — Level 1
- Evidence: Manual chunking by character count using chunkSentences function
- Gap: Use createBatches for token-budget-aware splitting
- Next: Refactor to use createBatches from lib/text-batch for token-aware chunking


### summary-map (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: At 227 lines, the code is proportional to the complexity of managing token budgets, privacy, and summarization. It uses clear phases: budget calculation, summarization, caching. It does not reimplement batch primitives but provides a focused utility.
- Gap: Minor simplifications could be made to reduce complexity in budget calculations.
- Next: Refactor budget calculation logic for clarity and maintainability.

**composition-fit** — Level 2
- Evidence: SummaryMap is a standalone utility class that does not currently expose or consume the library's batch processing chains (map, filter, reduce) or spec/apply patterns. It acts as a black box rather than a composable pipeline step.
- Gap: Refactor to expose a clean function interface and integrate with existing chain primitives to enable composition.
- Next: Design and implement spec/apply interfaces and instruction builders for SummaryMap to fit into the library's composition model.

**design-efficiency** — Level 3
- Evidence: The implementation is concise (227 LOC) with a focused API and manageable helper functions. The code complexity matches the problem complexity of token budget management and summarization.
- Gap: Could reduce some internal complexity in cache management and summarization orchestration.
- Next: Simplify cache invalidation and summarization flow to improve maintainability.

**generalizability** — Level 4
- Evidence: The module works with generic text data, accepts natural language instructions for summarization, and does not depend on specific runtimes or data formats. It is isomorphic and adaptable to various use cases.

**strategic-value** — Level 3
- Evidence: SummaryMap is a core utility for managing token budgets in prompt inputs, enabling efficient context management for LLM interactions. It supports weighted data compression and privacy-aware processing, which are frequent needs in AI pipelines.
- Gap: Could increase strategic value by integrating more tightly with other chains to enable novel workflows.
- Next: Develop adapters or instruction builders to compose SummaryMap with other batch processing chains.


#### Implementation Quality

**browser-server** — Level 0
- Evidence: No usage of 'lib/env' or runtime environment detection; no isomorphic environment handling
- Gap: Use 'lib/env' for environment detection to support both browser and server
- Next: Refactor to use 'lib/env' for environment reads instead of direct process.env or node-only APIs

**composability** — Level 2
- Evidence: No spec/apply split exports, no instruction builders, but internal composition via class extending Map and managing data compression
- Gap: Lacks spec/apply split functions and instruction builders
- Next: Implement spec/apply split functions and instruction builders for composability

**documentation** — Level 3
- Evidence: README has API Reference section with constructor and method details, multiple usage examples including Basic Token Management, Advanced Usage, Privacy-Aware Processing, and Prompt Integration
- Gap: Missing architecture section, edge cases, performance notes, and composition guidance
- Next: Add comprehensive architecture and performance documentation, include edge cases and composition guidance in README

**errors-retry** — Level 0
- Evidence: No error handling or retry logic observed; no import or usage of retry library
- Gap: Add basic retry logic and error handling
- Next: Implement retry with 'lib/retry' and add error handling for robustness

**events** — Level 0
- Evidence: No import of 'lib/progress-callback' or usage of event emission functions
- Gap: Implement event emission using 'lib/progress-callback' with standard events
- Next: Add 'lib/progress-callback' import and emit standard lifecycle events like start and complete

**logging** — Level 0
- Evidence: No import of 'lib/lifecycle-logger' or usage of lifecycle logging functions
- Gap: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- Next: Import 'lib/lifecycle-logger' and implement createLifecycleLogger with logStart and logResult calls

**prompt-engineering** — Level 2
- Evidence: Uses the 'basicSummarize' prompt constant imported from prompts/index.js, applies tokenBudget from prompts, and uses llm() call with modelOptions. The chain uses a summarization helper function and integrates prompt fragments like tokenBudget and basicSummarize. No explicit system prompt or temperature tuning is set in the llm call. No response_format usage is evident.
- Gap: Missing system prompts, temperature tuning, and response_format usage to reach level 3.
- Next: Introduce system prompts to set context, tune temperature settings explicitly, and implement response_format with JSON schemas for output structuring.

**testing** — Level 4
- Evidence: Has index.spec.js with unit tests and index.examples.js using aiExpect


### tag-vocabulary (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: At 285 LOC in a single module with clear separation of core functions (generateInitialVocabulary, computeTagStatistics, refineVocabulary), the design is proportional to the problem complexity and uses library primitives without reimplementing batch processing.
- Next: Maintain modularity and clear function boundaries.

**composition-fit** — Level 2
- Evidence: The chain exports core functions but does not appear to build on or expose the library's batch processing primitives (map, filter, reduce) as composable steps, limiting its integration as a pipeline component.
- Gap: Refactor to expose spec/apply pattern and instruction builders to align with library composition primitives.
- Next: Design and implement spec/apply interfaces and instruction builders for tag vocabulary generation and refinement.

**design-efficiency** — Level 3
- Evidence: The implementation is 285 LOC with a few helper functions, proportional to the complexity of generating and refining tag vocabularies with LLM calls and statistical analysis.
- Next: Continue to monitor for unnecessary complexity as features evolve.

**generalizability** — Level 4
- Evidence: The chain accepts natural language specifications and arbitrary sample arrays, with no hard dependencies on specific runtimes or data formats, making it fully general and adaptable across domains.
- Next: Ensure continued adherence to natural language instruction patterns for broad applicability.

**strategic-value** — Level 3
- Evidence: The tag-vocabulary chain enables generation and refinement of tag vocabularies for categorization, a core capability frequently needed in AI pipelines for data labeling and analysis. It supports workflows that were previously manual or ad hoc.
- Next: Promote usage examples to highlight integration in AI pipelines.


#### Implementation Quality

**api-surface** — Level 2
- Evidence: Exports 'computeTagStatistics', 'generateInitialVocabulary', 'refineVocabulary' (no default export), config params include 'topN', 'bottomN', 'problematicSampleSize', 'llm', 'maxAttempts', 'onProgress', 'now', 'tagger', 'sampleSize'
- Gap: No instruction builders or spec/apply split
- Next: Implement instruction builders and spec/apply function split

**browser-server** — Level 0
- Evidence: No usage of 'lib/env' or runtime environment detection; no browser/server compatibility code
- Gap: Use 'lib/env' for environment detection to support isomorphic operation
- Next: Refactor environment reads to use 'lib/env' proxy for cross-platform support

**code-quality** — Level 3
- Evidence: Clean separation of pure helper functions and core async functions; descriptive naming; no dead code; extracted pure functions like computeTagStatistics
- Gap: Further modularization and composability for reference-quality example
- Next: Refactor to increase composability and add explicit transformation layers

**composability** — Level 2
- Evidence: Exports multiple functions but no spec/apply split or instruction builders; deterministic ceiling is level 2
- Gap: No spec/apply split or instruction builders
- Next: Refactor to export spec/apply functions and add instruction builders

**documentation** — Level 3
- Evidence: README has Usage section with example import and call to default export 'tagVocabulary', Core Functions section documents 'generateInitialVocabulary' and 'computeTagStatistics' with parameters and return values, Advanced Usage and Hierarchical Vocabularies sections present
- Gap: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- Next: Add detailed architecture overview and performance considerations to README

**errors-retry** — Level 1
- Evidence: Imports 'lib/retry' and uses retry() for LLM calls with default retry policy; no input validation or custom error handling
- Gap: Add input validation, conditional retry policies, and defined failure modes
- Next: Implement input validation and enhance retry logic with conditional policies and error context

**events** — Level 0
- Evidence: Imports do not include 'lib/progress-callback', no event emission or onProgress calls beyond pass-through
- Gap: Emit standard lifecycle events using 'lib/progress-callback' emitters
- Next: Add event emission for start, complete, and step events using progress-callback

**logging** — Level 0
- Evidence: Imports do not include 'lib/lifecycle-logger', no usage of createLifecycleLogger or logger calls
- Gap: Add lifecycle logging with createLifecycleLogger and logStart/logResult calls
- Next: Integrate 'lib/lifecycle-logger' and wrap core functions with lifecycle logging

**prompt-engineering** — Level 4
- Evidence: Uses asXML for variable wrapping from '../../prompts/wrap-variable.js'; uses promptConstants.onlyJSON from '../../prompts/index.js'; employs response_format with JSON schema for structured output; uses retry and callLlm utilities for robust LLM calls; multi-stage prompt pipeline with initial vocabulary generation, tagging, and refinement stages; explicit prompt templates with detailed instructions; no explicit temperature setting but advanced prompt engineering patterns evident.

**testing** — Level 4
- Evidence: Has 'index.spec.js' with unit tests and 'index.examples.js' using 'aiExpect'

**token-management** — Level 0
- Evidence: No import or usage of 'lib/text-batch' or createBatches; no token budget management observed
- Gap: Implement token-budget-aware batching using createBatches
- Next: Integrate 'lib/text-batch' createBatches for token-aware input chunking


### tags (standard)

#### Design Fitness

**architectural-fitness** — Level 2
- Evidence: At 400 lines of code in a single file, the chain is relatively large but builds on existing primitives like the map chain and uses spec/apply pattern. Some complexity is present but generally proportional to the problem.
- Gap: Reduce complexity by splitting into smaller modules or extracting helper utilities.
- Next: Refactor the chain to separate concerns and reduce file size for clearer architecture.

**composition-fit** — Level 4
- Evidence: The chain uses the spec/apply pattern and instruction builders, composes with the map chain for batch processing, and exposes a rich set of exports enabling novel workflows and integration with other library chains.

**design-efficiency** — Level 2
- Evidence: With 400 lines and multiple exports, the chain is moderately complex. While it leverages existing chains and patterns, the size suggests some design strain and potential for simplification.
- Gap: Simplify the implementation to reduce LOC and helper functions, improving maintainability.
- Next: Audit and streamline code to remove unnecessary complexity and helper functions.

**generalizability** — Level 4
- Evidence: The chain accepts natural language instructions and arbitrary vocabularies, works with any item type, and has no hard dependencies on specific runtimes or data formats, making it fully general and context-agnostic.

**strategic-value** — Level 3
- Evidence: The tags chain is a core capability frequently needed in AI pipelines for categorization and tagging tasks, enabling flexible vocabulary-based tagging workflows that were previously impractical. It is used across many projects as indicated by its exports and integration with other chains.


#### Implementation Quality

**api-surface** — Level 4
- Evidence: Exports 'tagSpec', 'applyTags', 'tagItem', 'mapTags', 'mapInstructions', 'filterInstructions', 'reduceInstructions', 'findInstructions', 'groupInstructions', 'createTagExtractor', 'createTagger', no default export

**browser-server** — Level 0
- Evidence: No usage of 'lib/env' or runtime environment detection; no browser/server compatibility code
- Gap: Use 'lib/env' for environment detection to support both browser and server
- Next: Refactor environment reads to use 'lib/env' proxy instead of direct process.env or node APIs

**code-quality** — Level 3
- Evidence: Well-structured with clear separation of concerns, extracted pure functions (tagSpec, applyTags), consistent naming, no dead code
- Gap: Further improve composability and add explicit transformation layers
- Next: Refactor to isolate transformation logic into composable pure functions

**composability** — Level 4
- Evidence: Exports spec/apply split functions 'tagSpec()', 'applyTags()', instruction builders 'mapInstructions', 'filterInstructions', 'reduceInstructions', 'findInstructions', 'groupInstructions', factory functions 'createTagger', 'createTagExtractor'

**documentation** — Level 4
- Evidence: README has API section with Default Export 'tags(instructions, config)', Core Functions 'tagItem', 'mapTags', 'tagSpec', 'applyTags', 'createTagger', 'createTagExtractor', shared config params 'llm', 'maxAttempts', 'onProgress', 'now' documented, multiple usage examples, behavioral notes, integration examples with collection processing and advanced usage

**errors-retry** — Level 1
- Evidence: Imports and uses 'lib/retry' with default retry policy; no input validation or custom error handling
- Gap: Add input validation and defined failure modes; enhance retry strategy with conditional retry and error context
- Next: Implement input validation and extend retry logic with conditional retry and error context attachment

**events** — Level 1
- Evidence: Imports include 'onProgress' config param and passes it through to retry calls, but no direct event emission
- Gap: Emit standard lifecycle events (start, complete, step) using 'lib/progress-callback'
- Next: Implement event emission calls such as emitStart, emitComplete around key operations

**logging** — Level 0
- Evidence: Imports do not include 'lib/lifecycle-logger'; no usage of createLifecycleLogger or logger calls
- Gap: Add lifecycle logging using 'lib/lifecycle-logger' with logStart/logResult
- Next: Import 'lib/lifecycle-logger' and instrument core functions with createLifecycleLogger and logStart/logResult calls

**testing** — Level 4
- Evidence: Has 'index.spec.js' with unit tests, 'index.examples.js' using 'aiExpect' for semantic validation

**token-management** — Level 0
- Evidence: No usage of 'lib/text-batch' or createBatches for token budget management
- Gap: Implement token-budget-aware batching using createBatches
- Next: Integrate 'lib/text-batch' createBatches to manage input size and token budgets


### test (development)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: Compact implementation (75 LOC, 2 files) with clear phases: read file, build prompt, call LLM, parse result; uses retry and LLM libs appropriately.
- Gap: Minor simplifications possible but overall design proportional to problem complexity.
- Next: Review for any redundant abstractions or helper functions to streamline further.

**composition-fit** — Level 1
- Evidence: Does not use or expose library's batch processing primitives (map, filter, reduce); acts as a standalone chain without composable spec/apply pattern.
- Gap: Refactor to expose spec/apply interfaces and leverage existing composition primitives.
- Next: Redesign to integrate with library's composition model, enabling chaining with other modules.

**design-efficiency** — Level 4
- Evidence: Minimal code (75 LOC) with focused functionality; no excessive helpers; straightforward implementation matching problem complexity.

**generalizability** — Level 3
- Evidence: Accepts any file path and natural language instructions; no hard dependency on specific test frameworks or data formats; uses generic LLM calls.
- Gap: Could improve by removing any implicit assumptions about code language or file types.
- Next: Document and test usage with diverse codebases and file types to ensure broad applicability.

**strategic-value** — Level 3
- Evidence: Enables AI-powered code analysis with actionable feedback, useful for developers and automation; unlocks workflows for code quality checks not easily done manually.
- Gap: Could increase adoption by integrating with more test frameworks or expanding use cases.
- Next: Add support for additional test frameworks and broaden analysis scope.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default function 'test' only, no named exports
- Gap: No instruction builders or spec/apply split
- Next: Introduce instruction builders and spec/apply split to improve composability and API clarity

**browser-server** — Level 0
- Evidence: Imports 'node:fs/promises' indicating Node-only environment
- Gap: Use 'lib/env' for environment detection to support browser and server
- Next: Refactor to use 'lib/env' and avoid Node-only imports for isomorphic support

**composability** — Level 2
- Evidence: No spec/apply split or instruction builders, deterministic ceiling at level 2
- Gap: Lacks spec/apply split and instruction builders
- Next: Refactor to export spec/apply functions and instruction builders to reach level 3 composability

**documentation** — Level 3
- Evidence: README has API section with parameters 'path', 'instructions', usage examples showing expected outputs, and features section describing behavior
- Gap: Missing architecture section, edge cases, performance notes, and composition guidance
- Next: Add comprehensive documentation including architecture, edge cases, performance, and composition guidance

**errors-retry** — Level 1
- Evidence: Imports 'lib/retry' and uses retry() with default 429-only policy; basic retry implemented
- Gap: Add input validation and defined failure modes beyond basic retry
- Next: Implement input validation and handle failure modes explicitly with error context

**events** — Level 0
- Evidence: No import of 'lib/progress-callback' or calls to emit events; only accepts onProgress param but does not emit
- Gap: Emit standard lifecycle events using progress-callback
- Next: Integrate 'lib/progress-callback' and emit start, complete, and step events during processing

**logging** — Level 0
- Evidence: No import of 'lib/lifecycle-logger' or usage of createLifecycleLogger or logger methods
- Gap: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- Next: Import 'lib/lifecycle-logger' and implement createLifecycleLogger with logStart and logResult calls

**prompt-engineering** — Level 3
- Evidence: Uses asXML for variable wrapping of code input via asXML(code, { tag: 'code-to-analyze' }) and asJSON prompt constant. Uses response_format with JSON schema (testResultJsonSchema) in llm call. No explicit system prompt or temperature setting found in the source code.
- Gap: Missing explicit system prompt and temperature tuning to reach level 4.
- Next: Introduce a system prompt to set the assistant's role and tune temperature settings for improved response control.

**testing** — Level 4
- Evidence: Has 'index.spec.js' with unit tests, 'index.examples.js' using 'aiExpect'

**token-management** — Level 0
- Evidence: No use of 'lib/text-batch' or createBatches; no token budget management
- Gap: Implement token-budget-aware batching using createBatches
- Next: Integrate 'lib/text-batch' createBatches to split input respecting token budgets


### test-analysis (internal)

#### Design Fitness

**architectural-fitness** — Level 1
- Evidence: The module is very large (4147 LOC) and split across 31 files, indicating high complexity. It implements bespoke event processing and coordination logic rather than building on existing library primitives, suggesting strained architecture relative to the core idea.
- Gap: Refactor to decompose the module into smaller, composable chains leveraging existing primitives like map, filter, and reduce to reduce bespoke infrastructure.
- Next: Identify core processing phases and extract reusable chain components to replace custom coordination layers.

**composition-fit** — Level 1
- Evidence: The chain does not use other library chains internally and does not expose composable interfaces. It acts as a standalone monolith focused on test event processing and reporting.
- Gap: Redesign to build on the library's batch processing primitives (map, filter, reduce) and expose spec/apply patterns to enable composition.
- Next: Refactor processing steps into composable chains and provide instruction builders for integration with other chains.

**design-efficiency** — Level 1
- Evidence: The very high LOC count (4147) for a single default export and numerous helper files suggests significant design strain. The module likely contains complex coordination and bespoke logic that could be simplified.
- Gap: Simplify design by reducing helper functions and splitting responsibilities into smaller, focused chains to improve maintainability and clarity.
- Next: Perform a design audit to identify redundant or overly complex components and refactor accordingly.

**generalizability** — Level 1
- Evidence: The chain is tightly coupled to the Vitest test framework and Redis ring buffer infrastructure, limiting reuse outside this specific runtime and data format.
- Gap: Abstract dependencies on Vitest and Redis to enable broader applicability across test frameworks and storage backends.
- Next: Extract core analysis logic from framework-specific event handling to create a general-purpose test event processor.

**strategic-value** — Level 4
- Evidence: The test-analysis chain is a large internal module (4147 LOC, 31 files) providing test event processing, analysis, and reporting capabilities for Vitest. It enables AI-powered test analysis workflows that were previously impractical, unlocking novel feedback loops for developers.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default only from './reporter.js'
- Gap: Add named exports and document shared config destructuring
- Next: Introduce named exports and document API surface with config parameters

**browser-server** — Level 0
- Evidence: Uses Node.js specific modules and patterns, no evidence of `lib/env` usage or browser compatibility
- Gap: No support for browser environment or use of `lib/env` for environment detection
- Next: Refactor to use `lib/env` for environment detection and add browser compatibility

**code-quality** — Level 3
- Evidence: Code is well-structured with clear separation of concerns, extracted pure functions, and explicit transformations in base-processor.js
- Gap: Could improve to reference-quality by adding comprehensive documentation and example usage
- Next: Add detailed documentation and examples to elevate code quality to reference level

**composability** — Level 2
- Evidence: No spec/apply split exports; default export only
- Gap: Implement spec/apply split and instruction builders
- Next: Refactor to export spec and apply functions separately and add instruction builders

**documentation** — Level 0
- Evidence: No README present
- Gap: Add a README with at least a basic description
- Next: Create a README file describing the chain's purpose and usage

**errors-retry** — Level 0
- Evidence: No evidence of error handling or retry logic using `lib/retry` or custom error handling
- Gap: Missing basic retry mechanisms and error handling
- Next: Implement basic retry logic with `lib/retry` and add error handling to improve robustness

**events** — Level 1
- Evidence: Imports `lib/progress-callback` but only emits basic events or passes through `onProgress` without batch-level or phase-level events
- Gap: Does not emit standard batch-level or phase-level lifecycle events
- Next: Enhance event emission to include batch-level events like `batchStart`, `batchProcessed`, and `batchComplete`

**logging** — Level 3
- Evidence: Imports `lib/lifecycle-logger`, uses lifecycle logging methods such as `createLifecycleLogger`, `logStart`, `logResult` in processors/base-processor.js
- Gap: Missing full lifecycle logging with `logConstruction`, `logProcessing`, `logEvent`, and child loggers
- Next: Implement full lifecycle logging with `logConstruction`, `logProcessing`, `logEvent`, and child loggers to reach level 4

**prompt-engineering** — Level 0
- Evidence: No prompt imports detected; prompts appear to be inline strings or absent; no use of promptConstants; no system prompts; no temperature settings; no response_format usage; chain source code is primarily event processing and reporting logic without prompt engineering patterns.
- Gap: Use of asXML for variable wrapping and shared prompt utilities is missing.
- Next: Refactor prompts to use asXML for variable wrapping and integrate shared prompt utilities from src/prompts/ to improve maintainability and consistency.

**testing** — Level 2
- Evidence: Has 'index.examples.js' with example tests; no spec tests or aiExpect usage
- Gap: Add unit tests and aiExpect coverage
- Next: Add unit tests with vitest and integrate aiExpect for semantic validation

**token-management** — Level 0
- Evidence: No evidence of token management or use of `lib/text-batch` or `createBatches`
- Gap: No token-aware input chunking or budget management
- Next: Integrate token-budget-aware batching using `createBatches` to improve token management


### test-analyzer (internal)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: 157 LOC single file focused on one core function; clear phases for log extraction, code window calculation, prompt construction; no reimplementation of batch primitives.

**composition-fit** — Level 1
- Evidence: Does not use or expose library batch processing chains; standalone function with no spec/apply pattern or instruction builders.
- Gap: Refactor to use spec/apply pattern and integrate with map/filter primitives for composability.
- Next: Extract core analysis as spec generation and apply chains to enable composition.

**design-efficiency** — Level 3
- Evidence: 157 LOC with a few helper functions; implementation proportional to problem complexity; no excessive helpers or workarounds.

**generalizability** — Level 1
- Evidence: Tightly coupled to test logs with specific event types and file extraction; depends on test framework conventions limiting reuse.
- Gap: Decouple from specific test log formats and framework conventions to increase applicability.
- Next: Refactor to accept generic log formats and abstract test event detection.

**strategic-value** — Level 4
- Evidence: Enables AI-driven test failure analysis unlocking new debugging workflows; highly valuable for developers automating test diagnostics.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default function analyzeTestError, config params maxAttempts, onProgress, now
- Gap: Add named exports with instruction builders and spec/apply split
- Next: Refactor exports to include instruction builders and spec/apply split functions

**browser-server** — Level 0
- Evidence: No import or usage of lib/env or runtime environment checks
- Gap: No environment abstraction for browser/server compatibility
- Next: Use lib/env to detect environment and adapt code accordingly

**code-quality** — Level 3
- Evidence: Clear separation of pure functions (isEvent, getTestStart, calculateCodeWindow), descriptive naming, no dead code, extracted logic
- Gap: Could improve to reference-quality with more composability and documentation
- Next: Refactor for composability and add detailed documentation to reach level 4

**composability** — Level 2
- Evidence: Single default export function analyzeTestError, no spec/apply split or instruction builders
- Gap: Implement spec/apply split and instruction builders for composability
- Next: Introduce spec/apply split functions and instruction builders to improve composability

**documentation** — Level 0
- Evidence: No README present
- Gap: Add a README with basic description and API section
- Next: Create README with basic description and API section including config params maxAttempts, onProgress, now

**errors-retry** — Level 1
- Evidence: Imports lib/retry and uses retry() with default 429-only policy, basic retry implementation
- Gap: No input validation, no multi-level retry, no error context attachment
- Next: Add input validation and enhance retry strategy with conditional retry and error context

**events** — Level 1
- Evidence: Accepts onProgress config param but only passes it to retry call, no import or usage of lib/progress-callback
- Gap: No emission of standard lifecycle events via progress-callback
- Next: Implement event emission using lib/progress-callback to report start, progress, and completion

**logging** — Level 1
- Evidence: Uses console.error for error messages in analyzeTestError function, no import or usage of lib/lifecycle-logger
- Gap: No structured logging or logger config usage
- Next: Integrate lib/lifecycle-logger and replace console.error with structured logger calls

**prompt-engineering** — Level 0
- Evidence: The chain uses a raw inline template literal for the prompt construction without any shared prompt utilities or constants. There is no usage of asXML for variable wrapping, no system prompt, no temperature setting, and no response_format usage. The prompt is constructed directly in the source code as a string template assigned to the variable 'prompt'.
- Gap: Missing use of shared prompt utilities such as asXML for variable wrapping, promptConstants, system prompts, temperature tuning, and response_format usage.
- Next: Refactor the prompt to use asXML for variable wrapping and incorporate promptConstants to improve modularity and maintainability.

**testing** — Level 2
- Evidence: Has index.examples.js using aiExpect, no spec tests
- Gap: Add unit tests covering edge cases and error paths
- Next: Add unit tests with vitest covering edge cases and error paths

**token-management** — Level 0
- Evidence: No import or usage of lib/text-batch or createBatches, no token budget management
- Gap: No token-aware input chunking or batching
- Next: Integrate createBatches for token-budget-aware input splitting


### themes (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: The chain is concise (30 LOC), uses existing 'reduce' and 'shuffle' modules, and has a clear two-phase design (collect and consolidate themes). The design is proportional to the problem with no unnecessary complexity.
- Gap: None; design is clean and proportional.
- Next: Maintain current design; consider minor refactoring if new features added.

**composition-fit** — Level 1
- Evidence: The chain uses the 'reduce' chain internally but does not expose spec/apply patterns or instruction builders itself, limiting its composability within the library.
- Gap: Refactor to expose spec/apply interfaces and instruction builders to align with library composition patterns.
- Next: Implement spec generation and application steps and provide instruction builders for integration with other chains.

**design-efficiency** — Level 4
- Evidence: At 30 LOC with minimal helper functions and clear logic, the implementation is minimal and the design makes the implementation obvious.

**generalizability** — Level 4
- Evidence: The chain operates on generic text input, uses natural language prompts, and has no hard dependencies on specific runtimes or data formats, making it fully general and context-agnostic.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default function 'themes' only, no named exports, config params chunkSize, topN, llm destructured
- Gap: No instruction builders or spec/apply split
- Next: Introduce instruction builders and spec/apply split to improve composability and API clarity

**browser-server** — Level 0
- Evidence: No usage of 'lib/env' or runtime environment detection, no isomorphic environment handling
- Gap: Use 'lib/env' for environment detection to support both browser and server
- Next: Refactor to use 'lib/env' for environment reads instead of direct environment checks

**code-quality** — Level 3
- Evidence: Clean, concise 29-line implementation with clear function splitText and well-named variables, no dead code
- Gap: Further separation of concerns or composability could improve to level 4
- Next: Refactor to separate orchestration and core logic into composable functions for reference quality

**composability** — Level 2
- Evidence: No spec/apply split or instruction builders, but composes internally by calling reduce chain
- Gap: Missing spec/apply split and instruction builders
- Next: Implement spec/apply split functions and instruction builders to reach level 3 composability

**documentation** — Level 3
- Evidence: README has API usage example with import and call to themes(text, { sentenceMap: true })
- Gap: Missing architecture section, edge cases, performance notes, composition guidance
- Next: Add comprehensive documentation including architecture, edge cases, performance, and composition guidance

**errors-retry** — Level 0
- Evidence: No try/catch, no import or usage of retry library, no error handling
- Gap: Add basic retry logic with 'lib/retry' and error handling
- Next: Implement retry with default 429-only policy using 'lib/retry' and add error handling

**events** — Level 0
- Evidence: No import of 'lib/progress-callback', no event emission or onProgress usage
- Gap: Accept onProgress callback and emit standard lifecycle events
- Next: Implement event emission using 'lib/progress-callback' and emit start, complete events

**logging** — Level 0
- Evidence: No import of 'lib/lifecycle-logger', no usage of createLifecycleLogger or logger methods
- Gap: Add logger parameter and use createLifecycleLogger with logStart/logResult
- Next: Add lifecycle logging by importing 'lib/lifecycle-logger' and instrumenting main function with logStart and logResult

**prompt-engineering** — Level 0
- Evidence: The chain uses inline template literals for prompts such as 'Update the accumulator with short themes from this text...' and 'Refine the accumulator by merging similar themes...'. There is no use of shared prompt utilities, promptConstants, system prompts, temperature settings, or response_format. The chain imports shuffle and reduce utilities but does not use any prompt helper modules or constants.
- Gap: Missing use of shared prompt utilities like asXML for variable wrapping, promptConstants, system prompts, temperature tuning, and response_format usage.
- Next: Refactor prompts to use shared prompt utilities such as asXML for variable wrapping and incorporate promptConstants to improve prompt engineering maturity.

**testing** — Level 4
- Evidence: Has 'index.spec.js' with unit tests and 'index.examples.js' using 'aiExpect'

**token-management** — Level 0
- Evidence: No use of 'lib/text-batch' or createBatches, manual chunking by splitting text by paragraphs
- Gap: Use token-budget-aware batching with createBatches
- Next: Integrate 'lib/text-batch' createBatches to manage token budgets automatically


### timeline (standard)

#### Design Fitness

**architectural-fitness** — Level 2
- Evidence: 355 LOC across 2 files is moderate complexity; uses existing primitives like map and reduce but also includes bespoke chunking, retry, and parallel batch logic, indicating some unnecessary complexity.
- Gap: Simplify architecture by extracting chunking and retry logic into reusable primitives or better leveraging existing library chains.
- Next: Refactor chunk processing and retry mechanisms to use or extend existing batch processing chains.

**composition-fit** — Level 2
- Evidence: Uses map and reduce internally but does not expose spec/apply or instruction builders for external composition; functions as a pipeline step but is mostly a black box.
- Gap: Expose spec/apply interfaces and instruction builders to enable composition with other chains.
- Next: Design and export spec/apply functions and instruction builders for timeline extraction to improve composability.

**design-efficiency** — Level 2
- Evidence: 355 LOC with multiple helper functions and several internal imports; some complexity due to chunking, retry, and parallel batch processing; code comments indicate workarounds.
- Gap: Reduce helper functions and internal complexity by better abstraction or decomposition.
- Next: Refactor to minimize helper functions and consolidate chunking and retry logic for cleaner implementation.

**generalizability** — Level 4
- Evidence: Accepts arbitrary text input and natural language instructions; no hard dependencies on specific runtimes or data formats; isomorphic design.

**strategic-value** — Level 3
- Evidence: Enables extraction of chronological events from narrative text, supporting multi-format dates and relative timestamps, which is a core capability frequently needed in AI pipelines for timeline reconstruction.
- Gap: Could increase frequency of use by exposing more composable interfaces or integrations.
- Next: Develop additional instruction builders or spec/apply patterns to increase integration with other chains.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default 'timeline' function only, accepts shared config params 'llm', 'chunkSize', 'maxParallel', 'onProgress', 'enrichWithKnowledge', 'batchSize', 'now'
- Gap: No instruction builders or spec/apply split exports
- Next: Implement instruction builders and split spec/apply functions to enhance API composability

**browser-server** — Level 1
- Evidence: Directly accesses `process.env.VERBLETS_DEBUG` for debug logging
- Gap: Does not use `lib/env` abstraction for environment detection
- Next: Refactor to use `lib/env` for environment variables and runtime detection

**code-quality** — Level 3
- Evidence: Well-structured code with clear separation of concerns, extracted pure functions like `extractFromChunk`, `mergeTimelineEvents`, and `sortTimelineEvents`, no dead code
- Gap: Could improve by further composability and explicit transformations
- Next: Refactor complex functions into smaller composable units and add more explicit data transformations

**composability** — Level 2
- Evidence: Composes other chains internally such as 'map' and 'reduce' for knowledge enrichment
- Gap: No exported spec/apply split functions or instruction builders
- Next: Export spec/apply split functions and instruction builders to reach level 3 composability

**documentation** — Level 3
- Evidence: README has API section 'timeline(text, config)' with detailed parameters and returns, multiple usage examples including enrichment, and behavioral notes on features and knowledge enrichment
- Gap: Lacks comprehensive architecture section, edge cases, performance notes, and composition guidance
- Next: Add architecture overview, edge case handling, performance considerations, and guidance on composing with other chains

**errors-retry** — Level 1
- Evidence: Uses `retry` library for basic retry with default 429-only policy in `parallelBatch` processing
- Gap: No input validation, no multi-level or conditional retry, no error context attached
- Next: Add input validation and enhance retry strategy with conditional retry and error context

**events** — Level 1
- Evidence: Accepts `onProgress` callback and calls it to report progress during chunk processing
- Gap: Does not emit standardized lifecycle events via `lib/progress-callback`
- Next: Integrate `lib/progress-callback` to emit standard start, complete, and step events

**logging** — Level 1
- Evidence: Uses `console.log` and `console.warn` for debug and error messages, e.g., `console.log` in VERBLETS_DEBUG block and `remainingOptions.logger?.warn` for warnings
- Gap: Does not accept a `logger` config or use `logger?.info()` inline
- Next: Add a `logger` config parameter and replace console calls with `logger?.info()` calls

**prompt-engineering** — Level 3
- Evidence: Uses systemPrompt 'extractTimelineInstructions' as a system prompt; uses response_format with JSON schema 'timelineEventJsonSchema'; calls callLlm with modelOptions including systemPrompt and response_format; uses retry and parallelBatch utilities; no promptConstants used; temperature not explicitly set (default used); no asXML or prompt builder functions used.
- Gap: Missing promptConstants usage and extracted prompt builder functions to reach level 4; no temperature tuning or multi-stage prompt pipelines beyond basic multi-chunk processing.
- Next: Refactor prompts to use promptConstants and extracted prompt builder functions; introduce temperature tuning and multi-stage prompt pipelines for improved control.

**testing** — Level 4
- Evidence: Has 'index.spec.js' with unit tests, 'index.examples.js' using 'aiExpect' for semantic validation

**token-management** — Level 1
- Evidence: Manual chunking of input text using `chunkSentences` for splitting into chunks
- Gap: Does not use `createBatches` or token-budget-aware splitting
- Next: Adopt `createBatches` for token-budget-aware chunking to optimize token usage


### to-object (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: At 200 lines of code with a single export and no use of other chains, the design is clean and proportional to the problem complexity. It uses clear phases: direct parse, LLM-assisted repair, and retries. No unnecessary abstractions or reimplementation of batch primitives.
- Gap: Minor simplifications possible but overall design is sound.
- Next: Review for any redundant helper functions to streamline further.

**composition-fit** — Level 1
- Evidence: The chain does not use or expose the library's batch processing primitives (map, filter, reduce) and is a standalone monolith focused on JSON repair. It does not compose with other chains and is a black box.
- Gap: Refactor to expose spec/apply pattern or instruction builders to integrate with collection chains.
- Next: Design a spec/apply interface to allow JSON repair to be used as a step in batch processing pipelines.

**design-efficiency** — Level 3
- Evidence: With 200 LOC and a focused single export, the implementation is efficient and proportional to the problem complexity. It uses a few helper functions and imports but no excessive workarounds.

**generalizability** — Level 4
- Evidence: The module works with any text input and optional JSON schema, with no hard dependencies on specific runtimes or data formats. It is isomorphic and context-agnostic, suitable for broad use cases.

**strategic-value** — Level 3
- Evidence: The to-object chain addresses a common and critical problem in AI pipelines: repairing and validating JSON output from LLM calls. It enables workflows that require reliable JSON parsing and validation, which developers frequently need. It is not transformative but is a core capability used often.
- Gap: Could increase strategic value by enabling more advanced JSON repair or integration features.
- Next: Explore adding support for more complex schema validations or error recovery strategies.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default async function toObject(text, schema, config)
- Gap: No named exports, no instruction builders or spec/apply split
- Next: Introduce named exports for spec/apply functions or instruction builders

**browser-server** — Level 0
- Evidence: No use of 'lib/env' or environment detection; no browser/server compatibility code
- Gap: Use 'lib/env' for environment detection to support both browser and server
- Next: Integrate 'lib/env' and add environment checks to enable cross-platform support

**code-quality** — Level 3
- Evidence: Clear function separation (e.g., 'extractJson', 'parseAndValidate', 'logDebugInfo'), consistent naming, no dead code
- Gap: Reference-quality example with comprehensive documentation and composable internals
- Next: Refactor to improve composability and add detailed documentation for public functions

**composability** — Level 2
- Evidence: No spec/apply split exports; composability capped at level 2 per ceiling
- Gap: Lacks spec/apply split and instruction builders for higher composability
- Next: Refactor to export spec/apply functions and instruction builders to improve composability

**documentation** — Level 2
- Evidence: README has Usage section with example showing default export usage and config params llm, maxAttempts, onProgress, now
- Gap: Missing detailed API parameter table, behavioral notes, and integration examples
- Next: Add comprehensive API section with parameter table and multiple usage examples

**errors-retry** — Level 1
- Evidence: Imports 'lib/retry' and uses 'retry' function with default retry policy; basic retry implemented
- Gap: Add input validation, defined failure modes, and error context attachment
- Next: Enhance error handling with input validation and richer error context

**events** — Level 1
- Evidence: Accepts 'onProgress' in config but only passes it through to 'retry' calls; no direct event emission
- Gap: Emit standard lifecycle events (start, complete, step) via 'lib/progress-callback'
- Next: Implement event emission using 'lib/progress-callback' to signal operation progress

**logging** — Level 1
- Evidence: No import of 'lib/lifecycle-logger'; uses console.error in 'logDebugInfo' function
- Gap: Accepts 'logger' config and uses 'logger?.info()' inline
- Next: Add 'logger' parameter and replace console.error calls with 'logger?.info()' calls

**prompt-engineering** — Level 3
- Evidence: Uses promptConstants: contentIsSchema, contentToJSON, onlyJSON, shapeAsJSON; uses asXML for variable wrapping; constructs prompts via buildJsonPrompt function; uses system prompt patterns via promptConstants; temperature is not explicitly set (default assumed); no explicit response_format usage noted; multi-attempt retry logic with LLM prompt repair attempts; uses shared prompt utilities from prompts module.
- Gap: No explicit temperature tuning or response_format with JSON schemas; no multi-stage prompt pipelines with frequency/presence penalty tuning.
- Next: Introduce explicit temperature settings and response_format with JSON schema to improve output reliability and control.

**testing** — Level 4
- Evidence: Has index.spec.js with unit tests and index.examples.js using aiExpect

**token-management** — Level 0
- Evidence: No use of 'createBatches' or token-budget-aware splitting
- Gap: Implement token-budget-aware input chunking using 'createBatches'
- Next: Add token management by integrating 'createBatches' for input splitting


### truncate (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: At 117 LOC, the chain is concise and focused on its problem. It uses a clear two-phase approach: chunking text and scoring chunks. It does not reimplement batch primitives but uses the score chain. The design is proportional and clear.
- Gap: Minor improvements could be made to further simplify chunk management or leverage more library primitives.
- Next: Refactor chunk creation to use existing primitives if possible, or document design decisions for clarity.

**composition-fit** — Level 2
- Evidence: The chain uses the score chain internally but does not expose a spec/apply interface or instruction builders. It works as a standalone pipeline step but is not fully composable with other library primitives.
- Gap: Expose spec/apply pattern and instruction builders to better integrate with library composition philosophy.
- Next: Refactor to split scoring and truncation phases into composable spec/apply chains with instruction builders.

**design-efficiency** — Level 3
- Evidence: The implementation is clean and concise (117 LOC) with a few helper functions. It avoids unnecessary complexity and the LOC is proportional to the problem complexity.
- Gap: Could reduce helper functions or simplify chunking logic further.
- Next: Review helper functions for potential consolidation or reuse to streamline implementation.

**generalizability** — Level 4
- Evidence: The chain accepts arbitrary text and natural language instructions for removal criteria, with no hard dependencies on frameworks or data formats. It is isomorphic and broadly applicable across domains.

**strategic-value** — Level 2
- Evidence: The truncate chain solves a real problem of intelligently removing unwanted trailing content from text, useful in many AI workflows. It is moderately sized (117 LOC) and is referenced alongside other standard chains, indicating moderate frequency and utility.
- Gap: Could increase strategic value by enabling more novel workflows or tighter integration with other chains.
- Next: Explore compositional patterns to integrate truncate with other batch processing chains for enhanced pipeline use.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default 'truncate' function only, no named exports or instruction builders
- Gap: No documented named exports or shared config destructuring
- Next: Introduce named exports and document shared config parameters explicitly

**browser-server** — Level 0
- Evidence: No usage of lib/env or runtime environment detection; no browser/server compatibility code
- Gap: Use lib/env for environment detection to support both browser and server
- Next: Refactor to use lib/env for environment checks to enable isomorphic support

**code-quality** — Level 3
- Evidence: Clear function separation (createChunks, truncate), descriptive naming, no dead code, consistent style
- Gap: Further modularization or composability improvements
- Next: Consider extracting scoring logic or chunk processing into smaller composable units

**composability** — Level 0
- Evidence: Single default export 'truncate' function, no spec/apply split or instruction builders
- Gap: No spec/apply split, instruction builders, or factory functions
- Next: Refactor to export spec/apply functions and instruction builders to improve composability

**documentation** — Level 3
- Evidence: README has API section with parameter table for 'truncate(text, removalCriteria, config)', multiple usage examples, and behavioral notes on backwards processing and threshold-based scoring
- Gap: Missing architecture section, edge cases, performance notes, and composition guidance
- Next: Add comprehensive architecture and performance notes, edge case handling, and guidance on composing truncate with other chains

**errors-retry** — Level 0
- Evidence: No error handling or retry logic observed; no try/catch or retry imports
- Gap: Add basic retry logic and error handling
- Next: Implement retry with lib/retry and add error handling around async calls

**events** — Level 0
- Evidence: No import of 'lib/progress-callback' or any event emission functions
- Gap: Implement event emission using progress-callback
- Next: Add onProgress callback support and emit standard lifecycle events

**logging** — Level 0
- Evidence: No import of 'lib/lifecycle-logger' or usage of createLifecycleLogger or logger calls
- Gap: Add logger parameter and use logger.info() calls
- Next: Add a logger config parameter and use logger.info() for key operations

**testing** — Level 4
- Evidence: Has 'index.spec.js' with unit tests and 'index.examples.js' using 'aiExpect' for semantic validation

**token-management** — Level 1
- Evidence: Manual chunking by character count in createChunks function
- Gap: Use createBatches or token-budget-aware splitting
- Next: Integrate createBatches from lib/text-batch for token-aware chunking


### veiled-variants (standard)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: At 108 lines of code with a single file and no use of other chains, the design is clean and proportional to the problem complexity. The chain uses clear phases with three distinct prompt builders and a straightforward orchestration function, avoiding unnecessary abstractions or complexity.
- Gap: No significant architectural improvements needed; design is proportional and clear.
- Next: Maintain current design clarity and modular prompt functions.

**composition-fit** — Level 1
- Evidence: The chain does not use other library chains internally and does not expose spec/apply or instruction builder patterns for batch processing. It acts as a standalone module with a black-box interface, limiting its composability within the library's batch processing ecosystem.
- Gap: Refactor to build on existing primitives like map or score and expose spec/apply interfaces.
- Next: Decompose the chain into composable instruction builders and spec/apply functions to integrate with batch chains.

**design-efficiency** — Level 3
- Evidence: With 108 LOC and a small number of helper functions focused on prompt construction and orchestration, the implementation is efficient and proportional to the problem complexity. There are no signs of workarounds or duplicated logic.
- Gap: No major design efficiency improvements needed.
- Next: Continue to keep implementation minimal and focused on core functionality.

**generalizability** — Level 3
- Evidence: The chain accepts natural language prompts and works with any text input, using privacy-preserving LLM models. It does not depend on specific frameworks or data formats, making it general purpose across domains requiring sensitive text transformation.
- Gap: Could improve by decoupling from specific privacy model defaults to increase adaptability.
- Next: Allow configurable model options to support broader LLM usage scenarios.

**strategic-value** — Level 1
- Evidence: The veiled-variants chain provides niche utility for privacy-preserving text transformations, useful in specific workflows like legal document anonymization and customer support analysis. It is not a core or frequently used tool across all AI pipelines, as indicated by its 108 LOC and single file module, and its usage is specialized rather than general.
- Gap: Increase applicability across more general AI workflows to raise frequency of use.
- Next: Explore integration with core batch processing chains to broaden use cases.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports 'scientificFramingPrompt', 'causalFramePrompt', 'softCoverPrompt', and default export 'veiledVariants'
- Gap: No instruction builders or spec/apply split
- Next: Implement instruction builders and spec/apply function split to improve composability and API clarity

**browser-server** — Level 0
- Evidence: No usage of 'lib/env' or runtime environment detection; no isomorphic environment handling
- Gap: Use 'lib/env' for environment detection to support both browser and server
- Next: Refactor to use 'lib/env' for environment reads instead of direct environment checks

**code-quality** — Level 2
- Evidence: Clean code with clear naming, no dead code, but uses console.warn and magic numbers (length > 200, length > 20) for fallback parsing
- Gap: Remove console.warn in favor of logger; replace magic numbers with named constants
- Next: Replace console.warn with logger calls and define named constants for parsing thresholds

**composability** — Level 2
- Evidence: Chain composes internally by calling multiple prompt functions within 'veiledVariants' async function
- Gap: No exported spec/apply split functions or instruction builders
- Next: Export spec/apply functions and instruction builders to enable external composition

**documentation** — Level 3
- Evidence: README has API section with 'veiledVariants(text, context, config)', multiple usage examples including Legal Document Processing and Customer Support Analysis, and detailed Features section
- Gap: Missing architecture section, edge cases, performance notes, and composition guidance
- Next: Add architecture overview, edge case handling, performance considerations, and guidance on composing with other chains in README

**errors-retry** — Level 0
- Evidence: No error handling or retry logic observed; no usage of 'lib/retry' or try/catch blocks
- Gap: Add basic retry logic with 'lib/retry' and error handling
- Next: Implement try/catch with retry using 'lib/retry' for transient errors

**events** — Level 0
- Evidence: No import of 'lib/progress-callback' or usage of event emission functions
- Gap: Add event emission using 'lib/progress-callback' with standard events
- Next: Import 'lib/progress-callback' and emit start, complete, and step events during processing

**logging** — Level 0
- Evidence: No import of 'lib/lifecycle-logger' or usage of createLifecycleLogger or logger calls
- Gap: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- Next: Import 'lib/lifecycle-logger' and implement lifecycle logging with logStart and logResult calls

**prompt-engineering** — Level 2
- Evidence: Uses promptConstants.onlyJSONStringArray for JSON array output enforcement; uses asXML for variable wrapping of prompt input; prompt builder functions scientificFramingPrompt, causalFramePrompt, softCoverPrompt are extracted and reused; no system prompt or temperature tuning observed; no response_format usage; imports promptConstants and asXML from shared prompts module.
- Gap: Missing system prompts, temperature tuning, and response_format usage to reach level 3.
- Next: Introduce system prompts and configure temperature and response_format with JSON schemas for output.

**testing** — Level 2
- Evidence: Has 'index.spec.js' with unit tests and 'index.examples.js' with example tests, but no aiExpect usage
- Gap: Lacks aiExpect semantic validation and property-based tests
- Next: Add aiExpect assertions in example tests and introduce property-based tests for robustness

**token-management** — Level 0
- Evidence: No token management code or usage of 'lib/text-batch' or createBatches
- Gap: Implement token-budget-aware input chunking using createBatches
- Next: Integrate 'lib/text-batch' createBatches for token-aware input splitting

