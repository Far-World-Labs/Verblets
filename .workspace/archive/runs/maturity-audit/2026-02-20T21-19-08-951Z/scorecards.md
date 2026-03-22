# Maturity Audit Scorecards
> Generated 2026-02-20
> 13 chains audited, 171 dimension evaluations

## Tier 1 — Design Fitness

| Chain | Tier | architectural-fitness | composition-fit | design-efficiency | generalizability | strategic-value | Avg |
|-------|------|---|---|---|---|---|-----|
| anonymize | standard | 2 | 2 | 2 | — | — | 2.0 |
| dismantle | standard | 2 | — | 2 | 3 | 2 | 2.3 |
| document-shrink | standard | 1 | 1 | 1 | 2 | 2 | 1.4 |
| entities | core | 2 | 4 | 2 | 3 | 3 | 2.8 |
| expect | standard | 2 | 2 | 2 | 3 | 3 | 2.4 |
| filter | core | 3 | 2 | 3 | 3 | 3 | 2.8 |
| group | core | 2 | 2 | 2 | — | — | 2.0 |
| llm-logger | standard | 2 | 1 | 2 | — | — | 1.7 |
| map | core | 2 | 2 | 3 | — | — | 2.3 |
| reduce | core | 3 | 3 | 4 | — | — | 3.3 |
| score | core | 4 | 3 | 3 | — | — | 3.3 |
| sort | core | — | — | — | — | — | — |
| test-analysis | internal | — | 0 | 4 | — | — | 2.0 |

### Design Alerts

These chains score below 2.0 on design fitness. NFR hardening (Tier 2) should wait until design issues are addressed.

- **document-shrink**: avg 1.4 — consider redesign before hardening
- **llm-logger**: avg 1.7 — consider redesign before hardening

## Tier 2 — Implementation Quality

| Chain | Tier | api-surface | browser-server | code-quality | composability | documentation | errors-retry | events | logging | prompt-engineering | testing | token-management | Avg |
|-------|------|---|---|---|---|---|---|---|---|---|---|---|-----|
| anonymize | standard | 3 | 0 | — | 3 | 2 | 1 | 1 | 2 | 4 | 4 | 0 | 2.0 |
| dismantle | standard | 1 | 0 | — | — | 2 | 1 | 1 | 0 | 3 | 3 | 1 | 1.3 |
| document-shrink | standard | 1 | 0 | 2 | 0 | 2 | 0 | 1 | 0 | 0 | 3 | 1 | 0.9 |
| entities | core | 4 | 0 | 4 | 4 | 3 | 1 | 2 | 0 | 3 | 3 | 0 | 2.2 |
| expect | standard | 2 | 2 | — | 1 | 3 | 0 | 0 | 2 | 2 | 3 | 0 | 1.5 |
| filter | core | 2 | 0 | — | — | 3 | 2 | 3 | 2 | — | 3 | 2 | 2.1 |
| group | core | 1 | 0 | 3 | — | 3 | 1 | 4 | 0 | 2 | 3 | 2 | 1.9 |
| llm-logger | standard | 2 | 0 | 2 | — | 3 | 0 | 0 | 2 | 0 | 3 | 0 | 1.2 |
| map | core | 2 | 1 | — | — | 3 | 3 | 3 | 3 | 2 | 2 | 2 | 2.3 |
| reduce | core | 1 | 1 | — | — | 3 | 1 | — | 2 | — | 3 | — | 1.8 |
| score | core | 3 | 0 | 3 | 3 | 3 | 1 | 1 | 2 | 3 | 3 | 0 | 2.0 |
| sort | core | 2 | 1 | 2 | — | 3 | 1 | 2 | 1 | 3 | 3 | 0 | 1.8 |
| test-analysis | internal | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0.2 |

## Detail

### anonymize (standard)

#### Design Fitness

**architectural-fitness** — Level 2
- Evidence: The chain has 410 lines of code, indicating some unnecessary complexity for its purpose. It uses multiple helper functions and imports, suggesting a potential for simplification.
- Gap: Refactor to reduce LOC and simplify the architecture, possibly by leveraging existing library primitives more effectively.
- Next: Conduct a code review to identify areas where existing library functions can replace custom implementations.

**composition-fit** — Level 2
- Evidence: While the chain uses library primitives like map and filter, it does not expose itself as a composable element in larger pipelines.
- Gap: Expose the chain as a composable element that can be integrated into larger workflows.
- Next: Refactor the chain to expose a clean function interface that can be used as a pipeline step.

**design-efficiency** — Level 2
- Evidence: The chain's 410 lines of code and multiple helper functions suggest moderate complexity, with potential for simplification.
- Gap: Reduce the number of helper functions and streamline the code to align with the core problem complexity.
- Next: Simplify the code by reducing helper functions and leveraging existing library capabilities.


#### Implementation Quality

**api-surface** — Level 3
- Evidence: Exports `anonymizeMethod`, `anonymizeSpec`, `applyAnonymization`, `createAnonymizer`
- Gap: Missing factory functions and calibration utilities
- Next: Introduce factory functions and utilities for calibration

**browser-server** — Level 0
- Evidence: No evidence of environment-specific handling or use of `lib/env`.
- Gap: Lacks environment-agnostic code to support both browser and server.
- Next: Incorporate `lib/env` to ensure compatibility across environments.

**composability** — Level 3
- Evidence: Exports `anonymizeSpec()` and `applyAnonymization()` split
- Gap: Lacks factory functions for all collection chains
- Next: Develop factory functions to enhance composability

**documentation** — Level 2
- Evidence: README has API section listing `anonymizeMethod`, `anonymizeSpec`, `applyAnonymization`
- Gap: Lacks multiple examples, behavioral notes, and integration examples
- Next: Add more examples and detailed usage scenarios in the README

**errors-retry** — Level 1
- Evidence: Uses `retry` library with default retry policy in `anonymizeSpec`.
- Gap: No input validation or defined failure modes beyond basic retry.
- Next: Enhance error handling with input validation and defined failure modes.

**events** — Level 1
- Evidence: Accepts `onProgress` in config but only passes through to inner calls in `anonymizeSpec`.
- Gap: Does not emit standard events via `progress-callback`.
- Next: Implement standard event emission using `progress-callback` for better lifecycle management.

**logging** — Level 2
- Evidence: Accepts `logger` config, uses `logger?.info()` inline in `anonymizeSpec` function.
- Gap: Missing use of `createLifecycleLogger` for structured logging.
- Next: Integrate `createLifecycleLogger` to enhance structured logging capabilities.

**prompt-engineering** — Level 4
- Evidence: - Uses `asXML` for variable wrapping in `specUserPrompt`.
- System prompt: `specSystemPrompt` is defined and used.
- No explicit temperature setting found.
- Uses `response_format` with JSON schemas in `anonymizeSpec` function.
- Utilizes shared prompt utilities like `retry` and `asXML`.

**testing** — Level 4
- Evidence: Has `index.spec.js` with unit tests and `index.examples.js` using `aiExpect`

**token-management** — Level 0
- Evidence: No evidence of token management or chunking strategies.
- Gap: Lacks token-budget-aware splitting or management.
- Next: Implement `createBatches` for token-budget-aware processing.


### dismantle (standard)

#### Design Fitness

**architectural-fitness** — Level 2
- Evidence: With 355 lines of code and 6 files, the architecture is adequate but shows some unnecessary complexity, such as the lack of a spec pattern and reliance on multiple imports.
- Gap: Simplify the architecture by reducing the number of files and consolidating logic where possible.
- Next: Refactor to reduce the number of files and streamline the logic to improve clarity and maintainability.

**design-efficiency** — Level 2
- Evidence: The implementation shows moderate efficiency with some unnecessary complexity, indicated by the high LOC and multiple helper functions.
- Gap: Reduce the number of helper functions and streamline the code to align with the core problem complexity.
- Next: Conduct a code review to identify and eliminate redundant logic and simplify the implementation.

**generalizability** — Level 3
- Evidence: The chain is mostly general, leveraging natural language instructions and working with various data inputs, but could be more adaptable to different runtime environments.
- Gap: Ensure runtime dependencies are optional or swappable to enhance adaptability.
- Next: Abstract runtime dependencies to allow for easier adaptation to different environments.

**strategic-value** — Level 2
- Evidence: The 'dismantle' chain provides a useful tool for breaking down complex systems into components, which can be moderately frequent in AI-driven projects that require system analysis or component extraction.
- Gap: To increase strategic value, the chain could integrate more deeply with other AI-driven processes, enabling new workflows.
- Next: Explore integration with other AI modules to enhance its utility in broader contexts.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports `simplifyTree`, `dismantle`, default export present
- Gap: All exports need documentation and shared config destructuring
- Next: Document all exports and ensure shared config destructuring is clear

**browser-server** — Level 0
- Evidence: No usage of `lib/env` or checks for `runtime.isBrowser`/`runtime.isNode`.
- Gap: Needs to use `lib/env` for environment checks to ensure compatibility.
- Next: Integrate `lib/env` to handle environment-specific logic.

**documentation** — Level 2
- Evidence: README has API section listing `dismantle(name, [options])` and example usage
- Gap: Lacks multiple examples, behavioral notes, and integration examples
- Next: Add more examples and detailed usage scenarios in the README

**errors-retry** — Level 1
- Evidence: Uses `retry` library for basic retry in `defaultDecompose` and `defaultEnhance`.
- Gap: Lacks input validation and defined failure modes.
- Next: Add input validation and define clear failure modes for error handling.

**events** — Level 1
- Evidence: Accepts `onProgress` in `defaultDecompose` and `defaultEnhance` but only passes through.
- Gap: Does not emit any standard events using `lib/progress-callback`.
- Next: Implement event emission using `lib/progress-callback` for start, complete, and step events.

**logging** — Level 0
- Evidence: No imports or usage of `lib/lifecycle-logger` or any logging functions like `logStart`, `logResult`.
- Gap: Needs to import and utilize `lib/lifecycle-logger` for structured logging.
- Next: Integrate `lib/lifecycle-logger` and implement basic logging functions like `logStart` and `logResult`.

**prompt-engineering** — Level 3
- Evidence: - Uses `promptConstants` such as `asJSON` and `asWrappedArrayJSON`.
- System prompts are defined in `subComponentsPrompt` and `componentOptionsPrompt` functions.
- Temperature settings are explicitly set to 0.7 and 0.3 in `defaultDecompose` and `defaultEnhance` functions respectively.
- `response_format` is used with JSON schemas in `defaultDecompose` and `defaultEnhance` functions.
- Gap: To reach level 4, the chain could implement multi-stage prompt pipelines and further tune frequency/presence penalties.
- Next: Implement multi-stage prompt pipelines and explore tuning frequency/presence penalties for more refined control over the output.

**testing** — Level 3
- Evidence: Has `index.spec.js` with unit tests and `index.examples.js` using `aiExpect`
- Gap: Lacks property-based tests and regression tests
- Next: Implement property-based tests and regression tests to cover more scenarios

**token-management** — Level 1
- Evidence: Uses `model.budgetTokens` for budget calculation in `defaultDecompose` and `defaultEnhance`.
- Gap: Does not implement proportional multi-value budget management.
- Next: Implement proportional multi-value budget management with auto-summarization.


### document-shrink (standard)

#### Design Fitness

**architectural-fitness** — Level 1
- Evidence: The chain has 611 lines of code, which is high for the core idea of document shrinking. It lacks the use of the library's primitives like map or filter, indicating potential reimplementation of existing capabilities.
- Gap: Refactor the chain to leverage existing library primitives for batch processing and scoring, reducing the overall complexity.
- Next: Identify parts of the code that can be replaced with existing library functions and refactor accordingly.

**composition-fit** — Level 1
- Evidence: The chain uses other chains internally but does not expose a composable interface, making it a black box rather than a pipeline step.
- Gap: Expose a clean function interface that allows the chain to be used as a step in larger pipelines.
- Next: Refactor the chain to expose its internal processing steps as composable functions that can be used independently.

**design-efficiency** — Level 1
- Evidence: The chain's high LOC and multiple helper functions suggest that the implementation is fighting the design, with potential reimplementation of existing capabilities.
- Gap: Simplify the design by reducing the number of helper functions and leveraging existing library capabilities.
- Next: Conduct a code review to identify redundant logic and refactor to streamline the implementation.

**generalizability** — Level 2
- Evidence: The chain is mostly general but has some context-specific elements, such as the reliance on TF-IDF and specific LLM configurations, which may limit its applicability across different domains.
- Gap: Decouple the chain from specific LLM configurations and make it adaptable to various text processing contexts.
- Next: Introduce configuration options that allow users to plug in different models or algorithms for document processing.

**strategic-value** — Level 2
- Evidence: The document-shrink chain provides a useful tool for reducing document size while maintaining relevance, which is a common need in AI-driven text processing workflows. However, it is not transformative as it doesn't enable entirely new workflows.
- Gap: To increase strategic value, the chain could integrate more advanced AI capabilities that allow for more nuanced document transformations.
- Next: Explore integrating additional AI models that can enhance the document transformation process, such as sentiment analysis or entity recognition.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default `documentShrink`, lacks shared config destructuring
- Gap: All exports need documentation and shared config destructuring
- Next: Document all exports and implement shared config destructuring

**browser-server** — Level 0
- Evidence: No usage of `lib/env` or `runtime.isBrowser`/`runtime.isNode`.
- Gap: Lacks environment compatibility.
- Next: Use `lib/env` to ensure compatibility across environments.

**code-quality** — Level 2
- Evidence: Functions like `calculateReductionRatio` and `createChunks` are pure and well-named.
- Gap: Could improve structure and separation of concerns.
- Next: Refactor to separate concerns and improve composability.

**composability** — Level 0
- Evidence: Single-purpose function, no composition interfaces
- Gap: Needs to accept/return standard types for manual chaining
- Next: Refactor to accept/return standard types for better chaining

**documentation** — Level 2
- Evidence: README has API section listing `documentShrink(article, query, { targetSize, tokenBudget })`
- Gap: Lacks multiple examples, behavioral notes, and integration examples
- Next: Add more examples and integration notes to README

**errors-retry** — Level 0
- Evidence: No error handling or retry logic found.
- Gap: Lacks error handling and retry mechanisms.
- Next: Implement basic error handling and retry logic using `lib/retry`.

**events** — Level 1
- Evidence: Accepts `onProgress` in `expandQuery` but does not emit events.
- Gap: Does not emit any events.
- Next: Implement event emission using `lib/progress-callback`.

**logging** — Level 0
- Evidence: No imports or usage of `lib/lifecycle-logger` or `console.log` found.
- Gap: No logging mechanism present.
- Next: Introduce basic logging using `console.log` for error handling.

**prompt-engineering** — Level 0
- Evidence: No prompt-related imports or usage of prompt patterns like template literals, prompt constants, system prompts, temperature settings, or response_format. The code relies on inline string concatenation and lacks shared utilities.
- Gap: To reach level 1, the chain should start using asXML for variable wrapping or other shared utilities.
- Next: Integrate asXML for variable wrapping to improve prompt engineering maturity.

**testing** — Level 3
- Evidence: Has `index.spec.js` with unit tests and `index.examples.js` using `aiExpect`
- Gap: Lacks property-based tests and regression tests
- Next: Implement property-based and regression tests

**token-management** — Level 1
- Evidence: Manual token allocation in `calculateTokenAllocation`.
- Gap: Does not use `createBatches` for token management.
- Next: Integrate `createBatches` for better token management.


### entities (core)

#### Design Fitness

**architectural-fitness** — Level 2
- Evidence: The module has 296 lines of code spread across 6 files, which suggests some unnecessary complexity. The use of multiple helper functions indicates that the design could be simplified.
- Gap: Simplify the architecture by reducing the number of helper functions and consolidating logic where possible.
- Next: Review the module to identify opportunities for reducing complexity and improving clarity.

**composition-fit** — Level 4
- Evidence: The 'entities' chain follows the spec/apply pattern and integrates with all collection chains, making it a full composition citizen.

**design-efficiency** — Level 2
- Evidence: The module's 296 lines of code and multiple helper functions suggest moderate complexity that could be streamlined.
- Gap: Reduce the number of helper functions and streamline the code to better align with the core design.
- Next: Conduct a code review to identify redundant logic and opportunities for simplification.

**generalizability** — Level 3
- Evidence: The chain uses natural language instructions and works with any text data, making it broadly applicable across domains.

**strategic-value** — Level 3
- Evidence: The 'entities' chain is a core capability frequently needed in AI pipelines for extracting named entities from text, which is a common requirement in many AI applications.


#### Implementation Quality

**api-surface** — Level 4
- Evidence: Exports `entitySpec`, `applyEntities`, `extractEntities`, `mapInstructions`, `filterInstructions`, `reduceInstructions`, `findInstructions`, `groupInstructions`, `createEntityExtractor`. Follows full spec + factory functions + calibration utilities pattern.

**browser-server** — Level 0
- Evidence: No evidence of `lib/env` usage or environment-specific code.
- Gap: Ensure compatibility with both browser and server environments using `lib/env`.
- Next: Refactor code to use `lib/env` for environment checks and compatibility.

**code-quality** — Level 4
- Evidence: Reference quality with consistent instruction builder pattern and clean spec/apply split.

**composability** — Level 4
- Evidence: Exports `entitySpec()` and `applyEntities()` split; instruction builders for all 5 collection chains: `mapInstructions`, `filterInstructions`, `reduceInstructions`, `findInstructions`, `groupInstructions`.

**documentation** — Level 3
- Evidence: README has API section listing `entities(prompt, config)`, `extractEntities(text, instructions, config)`, `entitySpec(prompt, config)`, `applyEntities(text, specification, config)`, `createEntityExtractor(specification, config)` with examples and performance notes.
- Gap: Missing architecture section and composition guidance.
- Next: Add an architecture section and detailed composition guidance to the README.

**errors-retry** — Level 1
- Evidence: Basic retry mechanism using `retry` with default settings.
- Gap: Enhance error handling with input validation and defined failure modes.
- Next: Implement input validation and structured error handling for robustness.

**events** — Level 2
- Evidence: Uses `emitStepProgress` from `lib/progress-callback` to emit standard events.
- Gap: Implement batch-level events like `batchStart`, `batchProcessed`.
- Next: Enhance event emission to include batch-level events for better granularity.

**logging** — Level 0
- Evidence: No evidence of `lib/lifecycle-logger` or `logger` usage in the code.
- Gap: Import and utilize `lib/lifecycle-logger` for structured logging.
- Next: Integrate `createLifecycleLogger` and use `logStart`, `logResult` for logging.

**prompt-engineering** — Level 3
- Evidence: - Uses `asXML` for variable wrapping, indicating level 1 maturity.
- Utilizes `promptConstants` such as `onlyJSON`, indicating level 2 maturity.
- Incorporates system prompts and `response_format` with JSON schemas, indicating level 3 maturity.
- No explicit temperature settings found, which is a gap for level 4.
- Gap: Explicit temperature tuning is missing to reach level 4.
- Next: Introduce temperature settings to fine-tune the model's creativity and consistency.

**testing** — Level 3
- Evidence: Has `index.spec.js` with unit tests and `index.examples.js` using `aiExpect`.
- Gap: Lacks property-based tests and regression tests.
- Next: Implement property-based tests and regression tests to enhance coverage.

**token-management** — Level 0
- Evidence: No evidence of token management or chunking strategies.
- Gap: Implement token-aware processing using `createBatches`.
- Next: Integrate `createBatches` to manage token budgets effectively.


### expect (standard)

#### Design Fitness

**architectural-fitness** — Level 2
- Evidence: The chain has 252 lines of code spread across 9 files, indicating some complexity. While it provides advanced features, the architecture could be simplified to reduce LOC and improve clarity.
- Gap: Simplify the architecture by reducing the number of files and consolidating related functions.
- Next: Review the file structure and identify opportunities to merge related functionalities into fewer files.

**composition-fit** — Level 2
- Evidence: The chain exports functions that can be used in pipelines, but it does not fully leverage the library's composition patterns like spec/apply.
- Gap: Integrate spec/apply patterns to enhance composability.
- Next: Refactor the chain to expose spec/apply interfaces, enabling it to work seamlessly with other library chains.

**design-efficiency** — Level 2
- Evidence: The chain's LOC is relatively high for its functionality, and it imports several internal libraries, suggesting some inefficiencies in design.
- Gap: Reduce the number of helper functions and streamline imports to improve efficiency.
- Next: Conduct a code review to identify redundant helpers and unnecessary imports, and refactor to simplify the design.

**generalizability** — Level 3
- Evidence: The chain is mostly general, with no hard dependencies on specific frameworks or data formats. It uses natural language instructions, making it adaptable across domains.

**strategic-value** — Level 3
- Evidence: The 'expect' chain provides advanced debugging and assertion capabilities, which are core needs in AI development pipelines. It enhances basic assertions with intelligent advice and structured results, making it a frequently used tool for developers.


#### Implementation Quality

**api-surface** — Level 2
- Evidence: Exports `expect`, `aiExpect`, `expectSimple`, but `aiExpect` and `expectSimple` are undocumented.
- Gap: Instruction builders and spec/apply split are missing.
- Next: Document `aiExpect` and `expectSimple` in the README and consider adding instruction builders.

**browser-server** — Level 2
- Evidence: Uses `lib/env` for environment reads, ensuring compatibility.
- Gap: Not tested in both environments with graceful degradation.
- Next: Conduct tests in both environments and implement graceful degradation strategies.

**composability** — Level 1
- Evidence: Exports `expect` which can be used in a chain, but lacks spec/apply split.
- Gap: Does not compose other chains internally or provide a spec/apply split.
- Next: Introduce a spec/apply split to enhance composability.

**documentation** — Level 3
- Evidence: README has API section listing `expect(actual, expected?, constraint?)`, multiple examples, and behavioral notes.
- Gap: Missing architecture section, edge cases, performance notes, and composition guidance.
- Next: Add an architecture section and notes on edge cases and performance in the README.

**errors-retry** — Level 0
- Evidence: No error handling or retry mechanisms observed.
- Gap: Lacks basic error handling and retry strategies.
- Next: Introduce basic retry mechanisms using `lib/retry` and implement error handling.

**events** — Level 0
- Evidence: No imports or usage of `lib/progress-callback` for event emission.
- Gap: Lacks event emission capabilities.
- Next: Introduce `lib/progress-callback` and implement basic event emission.

**logging** — Level 2
- Evidence: Imports `lib/logger` and uses `extractFileContext` for logging context.
- Gap: Missing use of `createLifecycleLogger` for structured logging.
- Next: Integrate `createLifecycleLogger` to enhance structured logging capabilities.

**prompt-engineering** — Level 2
- Evidence: - Uses `wrapVariable` for XML wrapping of variables.
- Utilizes `chatgpt` for generating responses with specific model options.
- Employs `prompt` constants like `asXML` for variable wrapping.
- No explicit temperature settings or `response_format` usage observed.
- Gap: To reach level 3, the chain needs to incorporate system prompts, temperature tuning, and `response_format` with JSON schemas.
- Next: Introduce system prompts and experiment with temperature settings to enhance response variability and control.

**testing** — Level 3
- Evidence: Has `index.spec.js` with unit tests and `index.examples.js` using `aiExpect`.
- Gap: Lacks property-based tests and regression tests.
- Next: Add property-based tests and regression tests to improve coverage.

**token-management** — Level 0
- Evidence: No evidence of token management or chunking strategies.
- Gap: Lacks token management strategies.
- Next: Implement manual chunking or use `createBatches` for token management.


### filter (core)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: The design is clean and proportional to the problem, with a clear batch processing approach and minimal unnecessary abstractions.

**composition-fit** — Level 2
- Evidence: The filter chain exposes a clean function interface and works as a pipeline step, but does not fully leverage the library's composition patterns.
- Gap: Consider integrating spec/apply patterns to enhance composability.
- Next: Integrate spec/apply patterns to enhance composability.

**design-efficiency** — Level 3
- Evidence: The implementation is efficient, with LOC proportional to the complexity of batch processing and retry logic.

**generalizability** — Level 3
- Evidence: The filter chain is general purpose, working with any text data and accepting natural language instructions.

**strategic-value** — Level 3
- Evidence: The filter chain is a core capability in AI pipelines, frequently needed for tasks like content moderation and data cleaning.


#### Implementation Quality

**api-surface** — Level 2
- Evidence: Exports `filterOnce`, accepts shared config params `llm`, `maxAttempts`, `onProgress`
- Gap: Lacks instruction builders and spec/apply split
- Next: Implement instruction builders and spec/apply split

**browser-server** — Level 0
- Evidence: No evidence of environment-specific handling or `lib/env` usage.
- Gap: Lacks environment adaptability and testing.
- Next: Incorporate `lib/env` for environment checks and ensure compatibility across environments.

**documentation** — Level 3
- Evidence: README has API section listing `filter(list, instructions, config)`, multiple examples, and shared config reference
- Gap: Lacks comprehensive architecture section and performance notes
- Next: Add architecture section and performance notes to README

**errors-retry** — Level 2
- Evidence: Uses `retry` for error handling with rethrow strategy on failure.
- Gap: Lacks multi-level retry and custom error types.
- Next: Develop custom error types and implement multi-level retry strategies.

**events** — Level 3
- Evidence: Emits batch-level events using `emitBatchStart`, `emitBatchProcessed`, and `emitBatchComplete`.
- Gap: Missing phase-level events for multi-phase operations.
- Next: Implement phase-level events to capture more granular lifecycle stages.

**logging** — Level 2
- Evidence: Accepts `logger` config, uses `logger?.info()` inline for structured logging.
- Gap: Missing use of `createLifecycleLogger` for more comprehensive logging.
- Next: Integrate `createLifecycleLogger` to enhance logging capabilities.

**testing** — Level 3
- Evidence: Has `index.spec.js` with unit tests and `index.examples.js` using `aiExpect`
- Gap: Lacks property-based tests and regression tests
- Next: Add property-based tests and regression tests

**token-management** — Level 2
- Evidence: Uses `createBatches` for token-budget-aware splitting.
- Gap: Lacks model-aware budget calculation and proportional multi-value management.
- Next: Implement model-aware budget calculations to optimize token usage.


### group (core)

#### Design Fitness

**architectural-fitness** — Level 2
- Evidence: The module has 247 lines of code, which is relatively high for its purpose. It uses multiple imports and has a complex structure, indicating some unnecessary complexity.
- Gap: Simplify the architecture by reducing the number of helper functions and imports.
- Next: Review the code to identify and eliminate redundant abstractions and streamline the process flow.

**composition-fit** — Level 2
- Evidence: While the chain uses batch processing, it does not fully leverage the library's composition patterns, such as spec/apply.
- Gap: Integrate spec/apply patterns to enhance composability.
- Next: Refactor the chain to expose a spec/apply interface, enabling it to be used more flexibly in compositions.

**design-efficiency** — Level 2
- Evidence: The chain has a high LOC relative to its functionality, with multiple helper functions and imports, suggesting some inefficiency.
- Gap: Reduce the number of helper functions and streamline the code to align with the core functionality.
- Next: Conduct a code review to identify areas of redundancy and refactor to improve efficiency.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default `group`, lacks additional named exports
- Gap: No additional named exports or instruction builders
- Next: Document any additional exports and consider adding instruction builders

**browser-server** — Level 0
- Evidence: No usage of `lib/env` or `runtime.isBrowser`/`runtime.isNode`.
- Gap: Use `lib/env` for environment checks.
- Next: Implement `lib/env` to ensure compatibility across environments.

**code-quality** — Level 3
- Evidence: Clean two-phase design with extracted prompt builders and fallback to 'other' category.
- Gap: Refactor to achieve reference-quality code.
- Next: Review and refine code structure for potential improvements.

**documentation** — Level 3
- Evidence: README has API section listing `group(list, instructions, config)`, includes parameter table and multiple examples
- Gap: Lacks comprehensive architecture section and performance notes
- Next: Add architecture section and performance notes to README

**errors-retry** — Level 1
- Evidence: Uses `retry` with default settings.
- Gap: Implement input validation and defined failure modes.
- Next: Add input validation and define clear failure modes.

**events** — Level 4
- Evidence: Uses `lib/progress-callback` with `emitBatchStart`, `emitBatchComplete`, `emitBatchProcessed`, `emitPhaseProgress`.

**logging** — Level 0
- Evidence: No imports or usage of `lib/lifecycle-logger` or `logger` config.
- Gap: Import and use `lib/lifecycle-logger` for structured logging.
- Next: Integrate `createLifecycleLogger` and use `logStart`, `logResult` for logging.

**prompt-engineering** — Level 2
- Evidence: - Uses `asXML` for variable wrapping in `createCategoryDiscoveryPrompt` function.
- Extracted prompt builder functions: `createCategoryDiscoveryPrompt`, `createAssignmentInstructions`.
- No use of `promptConstants`.
- No system prompts, temperature settings, or `response_format` usage observed.
- Gap: To reach level 3, the chain needs to incorporate system prompts, temperature tuning, and `response_format` with JSON schemas.
- Next: Integrate system prompts and consider using `response_format` for structured output.

**testing** — Level 3
- Evidence: Has `index.spec.js` with unit tests and `index.examples.js` using `aiExpect`
- Gap: Lacks property-based tests and regression tests
- Next: Implement property-based tests and regression tests

**token-management** — Level 2
- Evidence: Uses `createBatches` for token-budget-aware splitting.
- Gap: Implement model-aware budget calculation.
- Next: Integrate `budgetTokens` for model-aware budget management.


### llm-logger (standard)

#### Design Fitness

**architectural-fitness** — Level 2
- Evidence: The module has 652 lines of code, which is relatively high for a logging utility. It includes multiple helper functions and imports, indicating some complexity.
- Gap: Simplify the architecture by reducing the number of helper functions and consolidating similar functionalities.
- Next: Review the helper functions to identify opportunities for consolidation and simplification.

**composition-fit** — Level 1
- Evidence: The llm-logger does not use or expose the library's composition patterns, making it less composable with other chains.
- Gap: Refactor the logger to utilize the library's primitives like map, filter, and reduce for better integration.
- Next: Explore how the logger can be refactored to use existing library primitives for batch processing and filtering.

**design-efficiency** — Level 2
- Evidence: The implementation is moderately complex with 652 lines of code and multiple configuration parameters, indicating some inefficiencies.
- Gap: Reduce the number of configuration parameters and streamline the code to focus on core functionalities.
- Next: Conduct a code review to identify redundant configurations and streamline the codebase.


#### Implementation Quality

**api-surface** — Level 2
- Evidence: Exports `initLogger`, `log`, `createConsoleWriter`, `createFileWriter`, `createHostLoggerIntegration`, `createLLMLogger`.
- Gap: Lacks instruction builders and spec/apply split.
- Next: Introduce instruction builders and spec/apply split for enhanced API surface.

**browser-server** — Level 0
- Evidence: No evidence of environment-specific handling.
- Gap: Does not handle browser-server compatibility.
- Next: Use `lib/env` for environment detection and handling.

**code-quality** — Level 2
- Evidence: Clear function definitions, no dead code, uses `setAtPath` and `getAtPath` for JSON path operations.
- Gap: Could improve by separating concerns and enhancing composability.
- Next: Refactor to separate concerns and improve composability.

**documentation** — Level 3
- Evidence: README has API section listing `createLLMLogger`, `createConsoleWriter`, and parameter table for `config`.
- Gap: Missing architecture section and performance notes.
- Next: Add architecture section and performance notes to README.

**errors-retry** — Level 0
- Evidence: No error handling or retry logic present.
- Gap: Lacks error handling and retry mechanisms.
- Next: Introduce basic error handling and retry logic using `lib/retry`.

**events** — Level 0
- Evidence: No imports or usage of `lib/progress-callback`.
- Gap: Lacks event emission capabilities.
- Next: Implement event emission using `lib/progress-callback`.

**logging** — Level 2
- Evidence: Imports `lib/logger`, uses `createConsoleWriter` and `createFileWriter` for logging.
- Gap: Missing lifecycle logging with `createLifecycleLogger`.
- Next: Integrate `createLifecycleLogger` for structured lifecycle logging.

**prompt-engineering** — Level 0
- Evidence: No prompt-related imports or usage of prompt patterns such as template literals, prompt constants, system prompts, temperature settings, or response_format.
- Gap: The module lacks any structured prompt engineering practices, such as using asXML for variable wrapping or any shared utilities.
- Next: Introduce basic prompt engineering practices by using asXML for variable wrapping to improve prompt structure and consistency.

**testing** — Level 3
- Evidence: Has `index.spec.js` with unit tests and `index.examples.js` using example tests.
- Gap: Lacks aiExpect coverage and property-based tests.
- Next: Integrate aiExpect for semantic validation and add property-based tests.

**token-management** — Level 0
- Evidence: No evidence of token management or chunking.
- Gap: Lacks token management capabilities.
- Next: Implement token management using `createBatches` from `lib/text-batch`.


### map (core)

#### Design Fitness

**architectural-fitness** — Level 2
- Evidence: The chain has 309 lines of code, which is relatively high for its purpose. It uses multiple imports and has a complex configuration setup.
- Gap: Simplify the configuration and reduce the number of helper functions.
- Next: Refactor to streamline configuration parameters and reduce LOC by consolidating helper functions.

**composition-fit** — Level 2
- Evidence: While it uses library primitives, it does not expose a spec/apply pattern, limiting its composability.
- Gap: Implement a spec/apply pattern to enhance composability.
- Next: Introduce a spec/apply pattern to allow the 'map' chain to be more easily integrated into larger compositions.

**design-efficiency** — Level 3
- Evidence: The implementation is clean with LOC proportional to its complexity, but there is room for improvement in reducing helper functions.
- Gap: Reduce the number of helper functions to streamline the design.
- Next: Consolidate helper functions to improve design efficiency and reduce complexity.


#### Implementation Quality

**api-surface** — Level 2
- Evidence: Exports `mapOnce`, no default export, config params `maxParallel`, `onProgress`, `now`, `chainStartTime`, `maxAttempts`, `logger`
- Gap: Lacks instruction builders and spec/apply split
- Next: Introduce instruction builders and spec/apply split for enhanced API surface

**browser-server** — Level 1
- Evidence: Uses `process.env` directly
- Gap: Does not use `lib/env` for environment reads
- Next: Refactor to use `lib/env` for environment variable access

**documentation** — Level 3
- Evidence: README has API section listing `map(list, instructions, [config])`, includes multiple examples and integration notes
- Gap: Lacks comprehensive architecture section and performance notes
- Next: Add architecture section and performance notes to README

**errors-retry** — Level 3
- Evidence: Multi-level retry with batch + item retry, uses `retry` library
- Gap: Lacks custom error types and structured error context
- Next: Develop custom error types and attach structured context to errors

**events** — Level 3
- Evidence: Emits batch-level events using `emitBatchStart`, `emitBatchProcessed`, `emitBatchComplete`
- Gap: Missing phase-level events for multi-phase operations
- Next: Introduce phase-level events to capture multi-phase operations

**logging** — Level 3
- Evidence: Uses `createLifecycleLogger` for structured logging, calls `logStart` and `logResult`
- Gap: Missing full lifecycle logging with `logConstruction`, `logProcessing`, `logEvent`, child loggers
- Next: Implement full lifecycle logging with additional log points and child loggers

**prompt-engineering** — Level 2
- Evidence: - Uses `asXML` for variable wrapping in prompts.
- Compiled prompt includes structured instructions with XML tags.
- No mention of system prompts, temperature settings, or response_format usage.
- Utilizes shared utilities like `listBatch`, `retry`, and `parallelBatch`.
- Gap: To reach level 3, the chain needs to incorporate system prompts, temperature tuning, and response_format with JSON schemas.
- Next: Integrate system prompts and experiment with temperature settings to enhance prompt flexibility and control.

**testing** — Level 2
- Evidence: Has `index.spec.js` with unit tests and `index.examples.js` using example tests
- Gap: Lacks aiExpect coverage and property-based tests
- Next: Incorporate aiExpect coverage and property-based tests to improve testing maturity

**token-management** — Level 2
- Evidence: Uses `createBatches` for token-budget-aware splitting
- Gap: Lacks model-aware budget calculation
- Next: Implement model-aware budget calculation via `budgetTokens`


### reduce (core)

#### Design Fitness

**architectural-fitness** — Level 3
- Evidence: The design is clean and proportional to the problem, with 158 lines of code and no unnecessary abstractions.

**composition-fit** — Level 3
- Evidence: The 'reduce' chain follows library composition patterns and can be used as both a consumer and provider in pipelines.

**design-efficiency** — Level 4
- Evidence: The implementation is efficient, with minimal code and a design that makes the implementation obvious.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default `reduce`, no other exports documented
- Gap: All exports documented, shared config destructuring
- Next: Document all exports and ensure shared config destructuring is clear

**browser-server** — Level 1
- Evidence: Uses `process.env` directly
- Gap: Does not use `lib/env` for environment reads
- Next: Refactor to use `lib/env` for environment reads to improve isomorphic compatibility.

**documentation** — Level 3
- Evidence: README has API section listing `reduce(list, instructions, config)`, parameter table, shared config reference, multiple examples
- Gap: Comprehensive architecture section, edge cases, performance notes, composition guidance
- Next: Add architecture section and edge case handling notes to README

**errors-retry** — Level 1
- Evidence: Uses `retry` with default 429-only policy
- Gap: Lacks multi-level retry and error context attachment
- Next: Implement multi-level retry and attach error context to results for better error handling.

**logging** — Level 2
- Evidence: Accepts `logger` config, uses `logger?.info()` inline
- Gap: Missing use of `createLifecycleLogger` for structured logging
- Next: Integrate `createLifecycleLogger` to enhance structured logging capabilities.

**testing** — Level 3
- Evidence: Has `index.spec.js` with unit tests and `index.examples.js` using `aiExpect`
- Gap: Property-based tests, regression tests
- Next: Implement property-based tests and regression tests


### score (core)

#### Design Fitness

**architectural-fitness** — Level 4
- Evidence: The design is elegant with minimal code for maximum capability. The spec/apply pattern enables natural composition.

**composition-fit** — Level 3
- Evidence: Follows library composition patterns, working as both consumer and provider with spec/apply and instruction builders.

**design-efficiency** — Level 3
- Evidence: The implementation is efficient with clean code proportional to genuine complexity, using the spec/apply pattern effectively.


#### Implementation Quality

**api-surface** — Level 3
- Evidence: Exports `scoreSpec`, `applyScore`, `scoreItem`, `mapScore`, `mapInstructions`, `filterInstructions`, `reduceInstructions`, `findInstructions`, `groupInstructions`, `buildCalibrationReference`, `formatCalibrationBlock`
- Gap: Missing factory functions and calibration utilities for full maturity
- Next: Introduce factory functions and expand calibration utilities

**browser-server** — Level 0
- Evidence: No evidence of using `lib/env` or `runtime.isBrowser`/`runtime.isNode`.
- Gap: Lacks environment adaptability.
- Next: Incorporate `lib/env` to ensure compatibility across environments.

**code-quality** — Level 3
- Evidence: Spec-based architecture with multiple extracted pure instruction builders. No dead code, clear naming.
- Gap: Could improve by further separating concerns and enhancing composability.
- Next: Refactor to enhance composability and further separate concerns.

**composability** — Level 3
- Evidence: Exports `scoreSpec()` and `applyScore()` split, instruction builders for multiple chains
- Gap: Lacks factory functions for all collection chains
- Next: Develop factory functions for all collection chains

**documentation** — Level 3
- Evidence: README has API section listing `mapScore(list, instructions, config)`, `scoreItem(item, instructions, config)`, `scoreSpec(instructions, config)`, `applyScore(item, specification, config)` with examples
- Gap: Lacks comprehensive architecture section, edge cases, and performance notes
- Next: Add detailed architecture section and performance notes to README

**errors-retry** — Level 1
- Evidence: Uses `retry` library with default retry policy in `applyScore`.
- Gap: Lacks input validation and defined failure modes.
- Next: Introduce input validation and define clear failure modes for better error handling.

**events** — Level 1
- Evidence: Accepts `onProgress` in config, passes through to inner calls in `mapScore`.
- Gap: Does not emit standard events via `progress-callback`.
- Next: Implement standard event emission using `progress-callback` for start, complete, and step events.

**logging** — Level 2
- Evidence: Accepts `logger` config, uses `logger?.info()` inline in `applyScore` and `mapScore` functions.
- Gap: Missing use of `createLifecycleLogger` for structured logging.
- Next: Integrate `createLifecycleLogger` to enhance structured logging capabilities.

**prompt-engineering** — Level 3
- Evidence: - Uses `asXML` for variable wrapping, indicating level 1 maturity.
- Utilizes `promptConstants` with `onlyJSON`, indicating level 2 maturity.
- Implements `response_format` with JSON schema for structured output, indicating level 3 maturity.
- No evidence of system prompts or temperature settings, which are typical of level 3.
- Gap: Incorporate system prompts and temperature tuning to reach level 4.
- Next: Introduce system prompts to define roles and experiment with temperature settings for better control over response creativity and consistency.

**testing** — Level 3
- Evidence: Has `index.spec.js` with unit tests and `index.examples.js` using example tests
- Gap: No aiExpect or property-based tests
- Next: Integrate aiExpect and add property-based tests

**token-management** — Level 0
- Evidence: No evidence of token management or chunking.
- Gap: Lacks token awareness and management.
- Next: Implement token management using `createBatches` for token-budget-aware splitting.


### sort (core)

#### Implementation Quality

**api-surface** — Level 2
- Evidence: Exports `defaultSortChunkSize`, `defaultSortExtremeK`, `defaultSortIterations`, `useTestSortPrompt`
- Gap: Instruction builders, spec/apply split
- Next: Implement instruction builders and spec/apply split for better API surface

**browser-server** — Level 1
- Evidence: Uses `process.env.VERBLETS_DEBUG` directly, indicating compatibility with both environments but not using `lib/env`.
- Gap: Does not use `lib/env` for environment reads.
- Next: Refactor to use `lib/env` for environment variable access to ensure isomorphic compatibility.

**code-quality** — Level 2
- Evidence: Good algorithm structure, but `createModelOptions` is duplicated and `console.warn` is used instead of a logger.
- Gap: Duplication of `createModelOptions` and use of `console.warn`.
- Next: Extract `createModelOptions` to a shared utility and replace `console.warn` with a logger.

**documentation** — Level 3
- Evidence: README has API section listing `sort(list, criteria, config)`, parameter table, shared config reference, multiple examples
- Gap: Comprehensive: architecture section, edge cases, performance notes, composition guidance
- Next: Add architecture section and edge case handling notes to README

**errors-retry** — Level 1
- Evidence: Uses `retry` from `lib/retry` with default settings.
- Gap: No input validation or defined failure modes.
- Next: Introduce input validation and define clear failure modes, such as rethrowing or returning default values.

**events** — Level 2
- Evidence: Emits standard events using `emitStart`, `emitComplete`, and `emitStepProgress` from `lib/progress-callback`.
- Gap: Does not emit batch-level or phase-level events.
- Next: Implement batch-level events such as `batchStart` and `batchComplete` using `emitBatchStart` and `emitBatchProcessed`.

**logging** — Level 1
- Evidence: Uses `console.warn` in `process.env.VERBLETS_DEBUG` mode.
- Gap: Does not accept a `logger` config or use `logger?.info()`.
- Next: Introduce a `logger` parameter and replace `console.warn` with `logger?.info()` calls.

**prompt-engineering** — Level 3
- Evidence: - Uses `response_format` with JSON schema for structured outputs.
- Imports and uses `sortPromptInitial` from shared `prompts` module.
- No explicit temperature setting found.
- System prompts not explicitly mentioned, but uses structured prompt patterns.
- Utilizes `retry` and `progress-callback` for robust execution.
- Gap: To reach level 4, the chain could implement multi-stage prompt pipelines and explore frequency/presence penalty tuning.
- Next: Introduce multi-stage prompt pipelines to handle complex sorting scenarios and experiment with frequency/presence penalty settings to optimize LLM responses.

**testing** — Level 3
- Evidence: Has `index.spec.js` with unit tests and `index.examples.js` using `aiExpect`
- Gap: Unit + example + aiExpect/ai-arch-expect, property-based tests, regression tests
- Next: Add property-based tests and regression tests to enhance coverage

**token-management** — Level 0
- Evidence: No evidence of token management or chunking based on token budget.
- Gap: Lacks any form of token management or chunking.
- Next: Implement token-aware chunking using `createBatches` from `lib/text-batch`.


### test-analysis (internal)

#### Design Fitness

**composition-fit** — Level 0
- Evidence: The chain does not utilize or expose any of the library's composition patterns, acting as a standalone module.
- Gap: Integrate with existing library primitives.
- Next: Refactor to use map, filter, or reduce where applicable.

**design-efficiency** — Level 4
- Evidence: The implementation is minimal, with only 8 lines of code, indicating high design efficiency.


#### Implementation Quality

**api-surface** — Level 1
- Evidence: Exports default from './reporter.js'
- Gap: All exports documented, shared config destructuring
- Next: Document the default export and any shared configuration parameters.

**browser-server** — Level 0
- Evidence: No evidence of environment-specific code or imports like `lib/env`.
- Gap: Ensure compatibility with both browser and server environments.
- Next: Refactor code to use `lib/env` for environment checks.

**code-quality** — Level 0
- Evidence: Minimal code provided, no evidence of code quality practices.
- Gap: Implement basic code quality practices such as clear naming and separation of concerns.
- Next: Refactor code to improve readability and maintainability.

**composability** — Level 0
- Evidence: Single default export, no composition interfaces
- Gap: Accepts/returns standard types, can be chained manually
- Next: Modify the chain to accept and return standard types to enable manual chaining.

**documentation** — Level 0
- Evidence: No README
- Gap: README with basic description
- Next: Create a README with a basic description of the chain's functionality.

**errors-retry** — Level 0
- Evidence: No error handling or retry logic found in the source code.
- Gap: Implement basic error handling and retry mechanisms.
- Next: Use `lib/retry` to add retry logic for error handling.

**events** — Level 0
- Evidence: No imports or usage of event-related libraries such as `lib/progress-callback`.
- Gap: Implement event emission using `lib/progress-callback`.
- Next: Add `onProgress` callback support and emit basic events like start and complete.

**logging** — Level 0
- Evidence: No imports related to logging found in the source code.
- Gap: Import and use a logging library such as `lib/lifecycle-logger`.
- Next: Integrate `lib/lifecycle-logger` and implement basic logging functions like `logStart` and `logResult`.

**prompt-engineering** — Level 0
- Evidence: No prompt-related imports or shared utilities are used. The source code relies on inline string concatenation without any prompt engineering patterns or utilities.
- Gap: The chain lacks the use of asXML for variable wrapping, which is necessary to reach level 1.
- Next: Introduce the use of asXML for variable wrapping to improve prompt engineering maturity.

**testing** — Level 1
- Evidence: Has index.examples.js, no spec tests, no aiExpect
- Gap: Example tests using vitest core wrappers, cover happy path
- Next: Add example tests using vitest core wrappers to cover the happy path.

**token-management** — Level 0
- Evidence: No imports or usage of token management libraries like `lib/text-batch`.
- Gap: Implement token management using `createBatches`.
- Next: Integrate `lib/text-batch` to handle token budgets effectively.

