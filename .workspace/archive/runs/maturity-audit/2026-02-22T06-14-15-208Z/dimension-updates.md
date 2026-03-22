# Suggested Dimension Updates
> Generated 2026-02-21
> Review and merge relevant observations into .workspace/maturity/*.md

## Synthesis

DESIGN ASSESSMENT: The audit reveals mixed design fitness across chains. Strategic-value shows strong maturity with 35 at L3 and 3 at L4, indicating sound strategic design. Architectural-fitness is similarly strong with 33 at L3 and 4 at L4. Generalizability is weaker, with only 13 at L3 but a high 32 at L4, suggesting some chains excel while others lag. Composition-fit is concerning, with 18 at L1 and 23 at L2 but only 4 at L3 and 5 at L4, indicating many chains need redesign before implementation. Design-efficiency is moderate with 29 at L3 and 6 at L4. Chains related to composition-fit and generalizability require redesign focus before hardening.

IMPLEMENTATION PATTERNS: Logging and events show high immaturity with many at L0 and L1 (logging: 28 L0, 6 L1; events: 19 L0, 13 L1), indicating cross-cutting implementation gaps in observability. Testing shows improvement with 31 at L4 but still some at lower levels, suggesting uneven test coverage. Token-management and errors-retry have many at low levels (token-management: 23 L0, 14 L1; errors-retry: 14 L0, 23 L1), highlighting implementation weaknesses in reliability and security.

PRIORITY ORDERING: Design fixes in composition-fit and generalizability should precede implementation hardening. Chains with poor design fitness should defer Tier 2 work such as logging and testing improvements until redesign is complete.

TOP 5 IMPROVEMENTS:
1. Redesign chains with low composition-fit (high L1 and L2) to improve modularity and integration.
2. Enhance generalizability in chains with uneven maturity to support reuse and adaptability.
3. Improve logging and event implementation across all chains to ensure observability.
4. Strengthen token-management and error-retry mechanisms to enhance security and reliability.
5. Expand testing coverage in chains with lower maturity to ensure robustness post-design fixes.

TOTALS: 50 chains, 719 findings across 16 dimensions

## Per-Dimension Findings

### api-surface

**Distribution:**
- Level 1: central-tendency, conversation-turn-reduce, date, detect-patterns, detect-threshold, dismantle, document-shrink, filter, filter-ambiguous, find, group, intersections, join, map, people, pop-reference, reduce, set-interval, socratic, split, summary-map, test, test-analysis, test-analyzer, themes, timeline, to-object, truncate, veiled-variants
- Level 2: ai-arch-expect, category-samples, collect-terms, disambiguate, expect, extract-blocks, extract-features, glossary, list, llm-logger, sort, tag-vocabulary
- Level 3: score
- Level 4: anonymize, entities, relations, scale, tags

**Gaps:**
- ai-arch-expect: No instruction builders or spec/apply split exports
- category-samples: No instruction builders or spec/apply split
- central-tendency: No instruction builders or spec/apply split
- collect-terms: No instruction builders or spec/apply split
- conversation-turn-reduce: No named exports or shared config destructuring
- date: No instruction builders or spec/apply split exports
- detect-patterns: No instruction builders or spec/apply split
- detect-threshold: No instruction builders or spec/apply split exports
- disambiguate: No instruction builders or spec/apply split
- dismantle: Missing documented shared config destructuring and instruction builders
- document-shrink: No default export and no documented instruction builders or spec/apply split
- expect: No instruction builders or spec/apply split exports
- extract-blocks: No instruction builders or spec/apply split
- extract-features: No instruction builders or spec/apply split
- filter: No instruction builders or spec/apply split exports
- filter-ambiguous: No documented named exports or instruction builders
- find: No documented instruction builders or spec/apply split
- glossary: No instruction builders or spec/apply split exports
- group: No instruction builders or spec/apply split exports
- intersections: No instruction builders or spec/apply split
- join: No instruction builders or spec/apply split exports
- list: Missing instruction builders and spec/apply split
- llm-logger: No instruction builders or spec/apply split present
- map: No instruction builders or spec/apply split to reach level 2+
- people: No instruction builders or spec/apply split exports.
- pop-reference: No instruction builders or spec/apply split exports
- reduce: No instruction builders or spec/apply split exports
- score: Missing factory functions and calibration utilities to reach level 4.
- set-interval: No instruction builders or spec/apply split
- socratic: No additional exports or shared config destructuring documented
- sort: No instruction builders or spec/apply split
- split: No instruction builders or spec/apply split exports
- summary-map: No named exports, no instruction builders or spec/apply split
- tag-vocabulary: No instruction builders or spec/apply split
- test: No instruction builders or spec/apply split
- test-analysis: Add named exports with documented shared config destructuring
- test-analyzer: Add named exports with documented shared config destructuring
- themes: No documented named exports or instruction builders
- timeline: No instruction builders or spec/apply split exports
- to-object: No named exports, no instruction builders or spec/apply split
- truncate: No documented named exports or shared config destructuring
- veiled-variants: No instruction builders or spec/apply split exports

### architectural-fitness

**Distribution:**
- Level 1: document-shrink, test-analysis
- Level 2: ai-arch-expect, anonymize, dismantle, expect, extract-blocks, llm-logger, map, relations, tag-vocabulary, tags, timeline
- Level 3: category-samples, collect-terms, conversation, conversation-turn-reduce, date, detect-patterns, detect-threshold, disambiguate, entities, filter, filter-ambiguous, find, glossary, group, intersections, join, list, pop-reference, questions, reduce, scale, scan-js, set-interval, socratic, sort, split, summary-map, test, test-analyzer, themes, to-object, truncate, veiled-variants
- Level 4: central-tendency, extract-features, people, score

**Gaps:**
- ai-arch-expect: Refactor to better leverage existing batch processing chains and decompose responsibilities to reduce complexity.
- anonymize: Refactor to leverage existing batch processing chains (map, filter, reduce) and reduce bespoke coordination logic.
- category-samples: Minor simplifications possible in retry logic to reduce complexity.
- collect-terms: Minor improvements could be made to further simplify chunking or unify processing steps.
- conversation: Minor simplifications could be made to reduce complexity in turn policy handling.
- conversation-turn-reduce: None; design is clean and proportional.
- detect-threshold: Minor simplifications could be made to reduce LOC or helper functions, but overall design is sound.
- disambiguate: Minor simplifications could be made but overall design is proportional and clean.
- dismantle: Simplify the decomposition and enhancement phases to reduce code complexity and improve clarity.
- document-shrink: Refactor to decompose the monolithic implementation into smaller composable chains or leverage existing primitives more fully.
- expect: Reduce complexity by modularizing or simplifying code context and introspection features.
- extract-blocks: Refactor to leverage existing batch processing chains and reduce bespoke coordination code.
- filter-ambiguous: Minor simplifications possible but overall design is proportional and clean.
- glossary: Minor simplifications possible but overall design is proportional and clean.
- intersections: Minor complexity in batch processing could be simplified further.
- llm-logger: Refactor to leverage existing batch processing chains and reduce bespoke coordination layers.
- map: Refactor to leverage existing library primitives for batch processing and retry to reduce bespoke infrastructure.
- relations: Refactor to decompose the chain into smaller composable parts and leverage existing batch processing chains internally.
- scan-js: Minor simplifications possible but overall design is proportional and clean.
- set-interval: Minor simplifications possible but overall proportional to problem complexity.
- socratic: Could simplify by extracting some logic into reusable primitives or leveraging existing batch processing chains more.
- tag-vocabulary: Refactor to separate concerns more cleanly and reduce module size for improved clarity.
- tags: Refactor to reduce module size by splitting responsibilities or simplifying complex logic.
- test-analysis: Simplify architecture by decomposing responsibilities and leveraging existing batch processing chains where possible.
- test-analyzer: Minor simplifications possible but overall design proportional to problem complexity.
- themes: Minor improvements could be made by adopting spec/apply pattern for clearer intent.
- timeline: Reduce bespoke orchestration and chunk management by composing existing batch processing chains more directly.
- truncate: Minor improvements could be made to clarify chunk indexing logic.

### browser-server

**Distribution:**
- Level 0: ai-arch-expect, anonymize, category-samples, collect-terms, conversation, date, detect-patterns, detect-threshold, disambiguate, dismantle, document-shrink, entities, extract-blocks, extract-features, filter, filter-ambiguous, find, glossary, group, intersections, join, list, llm-logger, map, people, pop-reference, questions, reduce, scale, scan-js, set-interval, socratic, split, summary-map, test, test-analysis, test-analyzer, themes, to-object, truncate
- Level 1: sort
- Level 2: expect

**Gaps:**
- ai-arch-expect: Refactor to use 'lib/env' for environment detection and support browser environment
- anonymize: Use 'lib/env' for environment detection to support both browser and server.
- category-samples: Use lib/env for environment detection to support both browser and server
- collect-terms: Use 'lib/env' for environment detection to support both browser and server
- conversation: Use `lib/env` for environment reads to support both browser and server
- date: Add environment detection using `lib/env` to support both browser and server environments
- detect-patterns: Use 'lib/env' for environment detection to support both browser and server
- detect-threshold: Use 'lib/env' for environment detection to support both browser and server
- disambiguate: Use 'lib/env' for environment detection to support both browser and server
- dismantle: Use 'lib/env' for environment reads to support isomorphic operation
- document-shrink: Use 'lib/env' for environment detection to support both browser and server
- entities: Use 'lib/env' for environment detection to support both browser and server
- expect: Add tests for both browser and server environments and implement graceful degradation
- extract-blocks: No environment abstraction or detection for browser/server compatibility
- extract-features: Use `lib/env` for environment detection to support both browser and server
- filter: No environment abstraction or detection for browser/server
- filter-ambiguous: Use 'lib/env' for environment detection to support both browser and server
- find: Add environment detection using 'lib/env' to support both browser and server
- glossary: Use `lib/env` for environment detection to support both browser and server
- group: Add environment abstraction using 'lib/env' to support both browser and server environments.
- intersections: Use 'lib/env' for environment detection to support isomorphic operation
- join: Use 'lib/env' for environment reads to support both browser and server
- list: Use 'lib/env' for environment reads to support both browser and server
- llm-logger: Use 'lib/env' for environment detection to support both browser and server
- map: No environment abstraction or detection for browser/server compatibility.
- people: Use 'lib/env' for environment detection to support both browser and server
- pop-reference: Use 'lib/env' for environment detection to support isomorphic operation
- questions: Use 'lib/env' for environment detection to support both browser and server
- reduce: Add environment detection using 'lib/env' to support both browser and server
- scale: Use 'lib/env' for environment detection to support both browser and server environments
- scan-js: Use 'lib/env' for environment detection to support browser and server
- set-interval: Use lib/env for environment reads to ensure isomorphic compatibility
- socratic: Add environment detection using `lib/env` to support both browser and server
- sort: Does not use `lib/env` abstraction for environment detection
- split: Use lib/env for environment detection to support both browser and server
- summary-map: Use 'lib/env' for environment detection instead of direct process.env usage
- test: Use 'lib/env' for environment detection to support browser and server
- test-analysis: No cross-environment support; uses Node-only APIs.
- test-analyzer: No environment abstraction for browser/server compatibility
- themes: Use 'lib/env' for environment detection to support both browser and server.
- to-object: Use 'lib/env' for environment reads to support both browser and server
- truncate: Use 'lib/env' for environment detection to support both browser and server

### code-quality

**Distribution:**
- Level 2: disambiguate, people, sort
- Level 3: ai-arch-expect, anonymize, category-samples, detect-patterns, detect-threshold, expect, extract-blocks, extract-features, filter, find, intersections, join, list, llm-logger, pop-reference, scale, scan-js, set-interval, split, summary-map, test-analysis, test-analyzer, to-object, truncate
- Level 4: entities

**Gaps:**
- ai-arch-expect: Further modularization and composability to reach reference-quality
- anonymize: Further modularize and document transformations for reference-quality example.
- category-samples: Further modularization and composability to reach reference-quality
- detect-patterns: Improve to reference-quality with comprehensive documentation and example usage
- detect-threshold: Further modularization and composability for reference-quality code
- disambiguate: Extract duplicated createModelOptions to shared utility; improve separation of concerns
- expect: Improve composability and explicit transformations for reference-quality code
- extract-blocks: Could improve with more explicit transformations and composable internals for reference-quality
- extract-features: No explicit mention of composable internals or extracted pure functions
- filter: Minor use of magic numbers in logging previews (e.g., 'substring(0, 50)', 'substring(0, 500)')
- find: Could improve with more explicit transformations and composable internals
- intersections: Further modularization and composability for reference-quality implementation
- join: Could improve separation of concerns and composability for reference-quality
- list: Further separation of concerns and composable internals for reference-quality
- llm-logger: Further separation of concerns and composability could be improved
- people: Improve structure by separating concerns and adding composable internals
- pop-reference: Further separation of concerns and composability for reference-quality code
- scale: Further modularize code for composability and add explicit transformation layers
- scan-js: Further modularization and composability to reach reference-quality
- set-interval: Reference-quality example with comprehensive documentation and composable internals
- sort: Some code duplication (e.g., `createModelOptions` pattern), uses `console.warn` instead of logger, minor magic numbers
- split: Could improve with more explicit transformations and composable internals
- summary-map: Further separation of concerns and composability for reference-quality
- test-analysis: Could improve to reference-quality with exemplary documentation and composable internals.
- test-analyzer: Could improve with more composable internals or explicit transformations
- to-object: Could improve with more composable internals or explicit transformations
- truncate: Improve to reference-quality with comprehensive documentation and example usage

### composability

**Distribution:**
- Level 1: people, split, test-analyzer
- Level 2: ai-arch-expect, category-samples, central-tendency, collect-terms, conversation, date, detect-patterns, detect-threshold, disambiguate, dismantle, document-shrink, expect, extract-blocks, extract-features, filter, find, group, intersections, list, llm-logger, map, pop-reference, questions, reduce, scan-js, set-interval, socratic, sort, summary-map, test-analysis, themes, timeline, to-object, truncate, veiled-variants
- Level 3: score
- Level 4: anonymize, entities, relations, scale, tags

**Gaps:**
- ai-arch-expect: Lacks spec/apply function split and factory functions
- category-samples: Missing spec/apply split and instruction builders for higher composability
- central-tendency: No exported spec/apply functions or instruction builders
- collect-terms: No exported spec/apply functions or instruction builders
- conversation: Lacks explicit spec/apply split and instruction builders
- date: Lacks exported spec/apply split functions and instruction builders
- detect-patterns: Missing spec/apply split and instruction builders
- detect-threshold: Missing spec/apply split exports and instruction builders
- disambiguate: Missing spec/apply split and instruction builders for composability level 3
- dismantle: No spec/apply split or instruction builders to enable higher composability
- document-shrink: Missing spec/apply split and instruction builders for composability level 3
- expect: Lacks spec/apply split and instruction builders for higher composability
- extract-blocks: No spec/apply split or instruction builders to reach level 3
- extract-features: No exported spec/apply functions or instruction builders
- filter: Lacks spec/apply split functions and instruction builders
- find: No spec/apply split functions or instruction builders for multiple chains
- group: No exported spec/apply split functions or instruction builders
- intersections: Lacks spec/apply split and instruction builders for composability
- list: Lacks spec/apply split and instruction builders
- llm-logger: Missing spec/apply function split and instruction builders for higher composability
- map: No spec/apply split or instruction builders to reach level 3
- people: No internal composition of other chains or spec/apply split exports.
- pop-reference: Lacks spec/apply split and instruction builders for higher composability
- questions: Lacks spec/apply split and instruction builders for higher composability
- reduce: No exported spec/apply split functions or instruction builders
- scan-js: Missing spec/apply split and instruction builders
- score: No factory functions for full composability level 4.
- set-interval: Missing spec/apply split and instruction builders for higher composability
- socratic: Missing spec/apply split and instruction builders
- sort: Missing spec/apply split and instruction builders
- split: Does not compose other chains internally or provide spec/apply split functions
- summary-map: Lacks spec/apply function split and instruction builders
- test-analysis: Implement spec/apply split and instruction builders
- test-analyzer: Implement spec/apply split and instruction builders for composability
- themes: Missing spec/apply split and instruction builders for higher composability
- timeline: No exported spec/apply functions or instruction builders
- to-object: Missing spec/apply function split and instruction builders
- truncate: Lacks spec/apply function split and instruction builders for better composability
- veiled-variants: No exported spec/apply split functions or instruction builders

### composition-fit

**Distribution:**
- Level 1: ai-arch-expect, conversation, dismantle, document-shrink, extract-blocks, llm-logger, map, people, pop-reference, scan-js, set-interval, socratic, test-analysis, test-analyzer, themes, timeline, to-object, veiled-variants
- Level 2: anonymize, category-samples, collect-terms, conversation-turn-reduce, date, detect-patterns, disambiguate, expect, filter, find, glossary, group, intersections, join, list, questions, reduce, sort, split, summary-map, tag-vocabulary, test, truncate
- Level 3: detect-threshold, extract-features, filter-ambiguous, score
- Level 4: central-tendency, entities, relations, scale, tags

**Gaps:**
- ai-arch-expect: Redesign to expose a cleaner composable interface and leverage existing primitives for batch processing and scoring.
- anonymize: Refactor to build on core batch processing chains and enable internal composition.
- category-samples: Expose spec/apply interfaces and instruction builders to enable composition with other chains.
- collect-terms: Expose spec/apply pattern and instruction builders to become a full composition citizen.
- conversation: Refactor to expose spec/apply pattern and instruction builders to align with library composition philosophy.
- conversation-turn-reduce: Expose a cleaner composable interface to allow use as a pipeline step or composition citizen.
- date: Refactor to leverage spec/apply pattern and integrate with batch processing chains to improve composability.
- detect-patterns: Expose spec/apply pattern and instruction builders to integrate with other collection chains for full composition fit.
- detect-threshold: Expose spec/apply interfaces and instruction builders to fully align with library composition patterns.
- disambiguate: Refactor to expose spec/apply pattern and instruction builders to align fully with library composition patterns.
- dismantle: Refactor to build on existing batch processing chains and expose spec/apply patterns to improve composability.
- document-shrink: Redesign to expose spec/apply patterns and instruction builders to enable composition with other library chains.
- expect: Refactor to expose spec/apply pattern and integrate with existing batch processing chains for better composability.
- extract-blocks: Refactor to build on library primitives like map, filter, and retry chains to improve composability.
- extract-features: Expose spec/apply pattern or instruction builders to increase composability.
- filter: Increase internal use of library primitives and expose spec/apply pattern or instruction builders to enhance composability.
- filter-ambiguous: Could expose spec/apply pattern or instruction builders to increase composability.
- find: Expose spec/apply pattern and instruction builders to integrate with other collection chains for full composition fit.
- glossary: Refactor to follow spec/apply pattern and provide instruction builders to become a full composition citizen.
- group: Expose spec/apply pattern and instruction builders to integrate with other collection chains.
- intersections: Refactor to use and expose library's spec/apply and instruction builder patterns for full composition.
- join: Refactor to leverage existing batch processing chains and spec/apply patterns to improve composability.
- list: Refactor to build on existing batch processing chains and adopt spec/apply pattern to improve composability.
- llm-logger: Redesign to express processing as compositions of existing chains (map, filter, reduce) and expose spec/apply patterns.
- map: Redesign to build on existing library primitives (map, filter, reduce) and expose composable interfaces.
- people: Refactor to use spec/apply pattern and integrate with batch processing chains to enable composition.
- pop-reference: Refactor to expose spec/apply pattern and build on existing library primitives like map or score.
- questions: Refactor to leverage existing batch processing chains (map, filter) and spec/apply patterns to improve composability.
- reduce: Adopt spec/apply pattern and provide instruction builders to better integrate with library composition primitives.
- scan-js: Refactor to expose spec/apply interfaces and instruction builders to integrate with library's composition model.
- set-interval: Refactor to leverage existing batch primitives and expose spec/apply interfaces to improve composability.
- socratic: Refactor to express the questioning steps as compositions of existing batch processing chains to align with library composition philosophy.
- sort: Refactor to leverage existing collection chains and spec/apply patterns to improve composability.
- split: Refactor to leverage existing batch processing primitives and spec/apply patterns to improve composability.
- summary-map: Refactor to expose spec/apply interfaces and integrate with library's batch processing chains.
- tag-vocabulary: Expose spec/apply pattern and instruction builders to align with library composition philosophy.
- test: Refactor to leverage core batch processing chains and spec/apply pattern to improve composability.
- test-analysis: Refactor to expose composable functions and leverage existing map/filter/reduce chains for processing.
- test-analyzer: Refactor to leverage map/filter/reduce chains and expose spec/apply interfaces for composability.
- themes: Expose spec/apply interfaces and instruction builders to enable composition with other chains.
- timeline: Expose spec/apply interfaces and instruction builders; leverage existing batch processing chains internally instead of bespoke orchestration.
- to-object: Refactor to expose spec/apply pattern or integrate with batch processing chains to improve composability.
- truncate: Refactor to expose spec/apply pattern and instruction builders to better integrate with library primitives.
- veiled-variants: Refactor to expose spec/apply interfaces and build on existing batch processing chains to enable composition.

### design-efficiency

**Distribution:**
- Level 1: ai-arch-expect, document-shrink, llm-logger, test-analysis
- Level 2: anonymize, detect-threshold, dismantle, expect, extract-blocks, map, relations, score, tag-vocabulary, tags, timeline
- Level 3: category-samples, conversation, conversation-turn-reduce, date, detect-patterns, disambiguate, entities, filter, filter-ambiguous, find, glossary, group, intersections, join, list, pop-reference, questions, scale, scan-js, set-interval, socratic, sort, split, summary-map, test, test-analyzer, to-object, truncate, veiled-variants
- Level 4: central-tendency, collect-terms, extract-features, people, reduce, themes

**Gaps:**
- ai-arch-expect: Simplify design to reduce LOC and helper functions by leveraging existing library capabilities and clearer abstractions.
- anonymize: Reduce code size by decomposing responsibilities and reusing existing library functions.
- category-samples: Could reduce configuration complexity by consolidating related options.
- conversation: Could reduce some configuration complexity and helper function count for improved clarity.
- conversation-turn-reduce: None; implementation is efficient and straightforward.
- detect-threshold: Reduce helper function count and simplify batch processing logic to improve efficiency.
- dismantle: Reduce helper function count and simplify retry and prompt construction logic to improve efficiency.
- document-shrink: Simplify token budget management and reduce internal complexity by leveraging existing abstractions.
- expect: Simplify helper functions and reduce code duplication to improve efficiency.
- extract-blocks: Simplify code by reducing helper functions and leveraging existing library utilities for retry and progress.
- filter-ambiguous: No significant gaps; design and implementation are well aligned.
- intersections: Could reduce LOC by leveraging more existing primitives for batch processing.
- llm-logger: Simplify design by reducing bespoke infrastructure and leveraging existing library abstractions.
- map: Simplify by reducing bespoke logic and helper functions through reuse of existing abstractions.
- relations: Simplify the implementation by reducing helper functions and splitting responsibilities to improve maintainability.
- scan-js: No significant design inefficiencies detected.
- score: Reduce code complexity and helper function count to improve maintainability.
- socratic: Could reduce LOC by leveraging existing library primitives for batch processing and progress management.
- tag-vocabulary: Simplify API surface and reduce helper function count to improve design efficiency.
- tags: Simplify implementation to reduce LOC and helper function count, improving maintainability.
- test-analysis: Reduce complexity by simplifying abstractions and minimizing bespoke infrastructure.
- test-analyzer: Could reduce helper functions slightly for improved cohesion.
- timeline: Simplify orchestration and reduce helper functions by leveraging existing primitives; reduce code size where possible.

### documentation

**Distribution:**
- Level 0: test-analysis, test-analyzer, test-analysis, test-analyzer
- Level 1: conversation-turn-reduce
- Level 2: filter-ambiguous, to-object
- Level 3: ai-arch-expect, anonymize, category-samples, central-tendency, collect-terms, conversation, date, detect-patterns, detect-threshold, disambiguate, dismantle, document-shrink, expect, extract-blocks, extract-features, filter, find, glossary, group, intersections, join, llm-logger, map, people, pop-reference, questions, reduce, scan-js, set-interval, socratic, sort, split, summary-map, tag-vocabulary, test, themes, timeline, truncate, veiled-variants
- Level 4: entities, list, relations, scale, score, tags

**Gaps:**
- test-analysis: Create README.md with description, API section, parameter table, example
- test-analyzer: Create README.md with description, API section, parameter table, example
- ai-arch-expect: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- anonymize: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- category-samples: Lacks comprehensive architecture section, edge cases, performance notes, and composition guidance
- central-tendency: Missing architecture section, edge cases, performance notes, composition guidance
- collect-terms: Missing architecture section, edge cases, performance notes, and composition guidance
- conversation: Missing architecture section, edge cases, performance notes, and composition guidance
- conversation-turn-reduce: Missing API section with parameter table and shared config reference
- date: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- detect-patterns: Missing architecture section, edge cases, performance notes, composition guidance
- detect-threshold: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- disambiguate: Missing comprehensive architecture, edge cases, performance notes, and composition guidance
- dismantle: Lacks comprehensive architecture section, edge cases, performance notes, and composition guidance
- document-shrink: Missing architecture section, edge cases, performance notes, composition guidance
- expect: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- extract-blocks: Missing architecture section, edge cases, performance notes, composition guidance
- extract-features: Missing architecture section, edge cases, performance notes, and composition guidance
- filter: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- filter-ambiguous: Missing API section with parameter table and shared config reference
- find: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- glossary: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- group: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- intersections: Missing architecture section, edge cases, performance notes, and composition guidance
- join: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- llm-logger: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- map: Missing architecture section, edge cases, performance notes, and composition guidance
- people: Missing architecture section, edge cases, performance notes, and composition guidance.
- pop-reference: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- questions: Missing architecture section, edge cases, performance notes, and composition guidance
- reduce: Missing architecture section, edge cases, performance notes, and composition guidance
- scan-js: Missing explicit API section with parameter table and shared config references
- set-interval: Lacks comprehensive architecture section, edge cases, performance notes, and composition guidance
- socratic: Missing architecture section, edge cases, performance notes, and composition guidance
- sort: Missing architecture section, edge cases, performance notes, and composition guidance
- split: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- summary-map: Missing architecture section, edge cases, performance notes, and composition guidance
- tag-vocabulary: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- test: Missing architecture section, edge cases, performance notes, and composition guidance
- test-analysis: Add a README with basic description
- test-analyzer: Add a README with basic description
- themes: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- timeline: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- to-object: Missing detailed API parameter table, behavioral notes, and integration examples
- truncate: Missing architecture section, edge cases, performance notes, and composition guidance
- veiled-variants: Missing architecture section, edge cases, performance notes, and composition guidance

### errors-retry

**Distribution:**
- Level 0: ai-arch-expect, collect-terms, conversation, detect-patterns, document-shrink, expect, extract-features, filter-ambiguous, glossary, llm-logger, summary-map, test-analysis, themes, truncate
- Level 1: date, detect-threshold, disambiguate, dismantle, entities, extract-blocks, group, intersections, join, list, people, pop-reference, questions, reduce, scale, scan-js, set-interval, socratic, sort, split, test, test-analyzer, to-object
- Level 2: anonymize, filter, find
- Level 3: category-samples, map

**Gaps:**
- ai-arch-expect: Add retry logic with 'lib/retry' and define failure modes
- anonymize: Add multi-level retry with conditional retry policies and attach error context to results.
- category-samples: Add custom error types, structured error context, and attach logs for richer error handling
- collect-terms: Add basic retry using 'lib/retry' with default 429-only policy
- conversation: Add basic retry with default 429-only policy
- date: No input validation or defined failure modes beyond retry; no custom error types or error context attached
- detect-patterns: Add basic retry logic using 'lib/retry' with default policies
- detect-threshold: Add multi-level retry, conditional retry, and attach error context
- disambiguate: Add input validation, defined failure modes, and enhanced retry strategies
- dismantle: Add input validation, conditional retry, and error context attachment
- document-shrink: Add basic retry logic using 'lib/retry' with default 429-only policy
- entities: Add input validation, conditional retry, and defined failure modes
- expect: Add basic retry logic and error handling using 'lib/retry' with default policies
- extract-blocks: No input validation, no multi-level or conditional retry, no error context attachment
- extract-features: Add basic retry logic using `lib/retry`
- filter: No multi-level retry, conditional retry, or error context attached to results
- filter-ambiguous: Add basic retry with 'lib/retry' and error handling
- find: No multi-level retry, conditional retry, or error context attached to results
- glossary: Add basic retry logic with `lib/retry` and error handling
- group: No input validation, no multi-level or conditional retry, no error context attached.
- intersections: Add input validation and defined failure modes beyond basic retry
- join: Add input validation and defined failure modes beyond basic retry
- list: Add input validation, defined failure modes, and enhanced retry strategies
- llm-logger: Adopt structured retry logic with 'lib/retry' and defined failure modes
- map: No custom error types or structured error vocabulary with attached logs.
- people: Add input validation, defined failure modes, and error context attachment
- pop-reference: Add input validation, conditional retry logic, and defined failure modes
- questions: Add input validation, conditional retry, and defined failure modes
- reduce: Add input validation, conditional retry, and error context attachment
- scale: Add input validation, conditional retry logic, and defined failure modes
- scan-js: Add input validation and defined failure modes beyond basic retry
- set-interval: Add input validation and defined failure modes beyond basic retry
- socratic: Add input validation, conditional retry, and error context attachment
- sort: No input validation, no multi-level or conditional retry, no error context attached
- split: Add input validation, defined failure modes, and enhanced retry strategies
- summary-map: Implement basic retry with 'lib/retry' and error handling
- test: Add input validation and defined failure modes beyond basic retry
- test-analysis: No error handling or retry mechanisms implemented.
- test-analyzer: No input validation or defined failure modes beyond basic retry
- themes: Add basic error handling and retry logic using 'lib/retry' with default policies.
- to-object: Add input validation with defined failure modes and multi-level retry strategies
- truncate: Add basic retry mechanism using 'lib/retry' with default 429-only policy

### events

**Distribution:**
- Level 0: ai-arch-expect, collect-terms, conversation, detect-patterns, detect-threshold, document-shrink, expect, extract-features, filter-ambiguous, glossary, llm-logger, people, questions, scale, scan-js, summary-map, test, themes, truncate
- Level 1: anonymize, category-samples, date, dismantle, intersections, join, list, pop-reference, set-interval, split, test-analysis, test-analyzer, to-object
- Level 2: disambiguate, sort
- Level 3: entities, extract-blocks, filter, find, map, reduce
- Level 4: group, socratic

**Gaps:**
- ai-arch-expect: Implement event emission using 'lib/progress-callback' with standard events
- anonymize: Emit standardized lifecycle events (start, complete, step) using 'lib/progress-callback'.
- category-samples: Emit standard lifecycle events (start, complete, step) using lib/progress-callback
- collect-terms: Implement event emission using progress-callback standard events
- conversation: Accepts `onProgress` and emits standard lifecycle events
- date: Does not emit standard lifecycle events (start, complete, step) via `lib/progress-callback`
- detect-patterns: Implement event emission using 'lib/progress-callback'
- detect-threshold: Emit standard lifecycle events using 'lib/progress-callback' emitters
- disambiguate: Emit batch-level events such as batchStart, batchProcessed, batchComplete
- dismantle: Emit standard lifecycle events (start, complete, step) via progress-callback
- document-shrink: Emit standard lifecycle events using 'lib/progress-callback' emitters
- entities: Implement phase-level events for multi-phase operations
- expect: Add event emission using 'lib/progress-callback' with standard events like start and complete
- extract-blocks: No phase-level event emissions for multi-phase operations
- extract-features: Add event emission using `lib/progress-callback`
- filter: No phase-level events for multi-phase operations
- filter-ambiguous: Accept 'onProgress' and emit standard lifecycle events
- find: No phase-level events for multi-phase operations
- glossary: Add event emission using `lib/progress-callback` with standard events
- intersections: Emit standard lifecycle events (start, complete, step) using lib/progress-callback
- join: Emit standard events (start, complete, step) via progress-callback
- list: Emit standard lifecycle events (start, complete, step) via progress-callback
- llm-logger: Add event emission using 'lib/progress-callback' with standard events
- map: No phase-level event emission for multi-phase operations.
- people: Implement event emission using 'lib/progress-callback' and emit standard lifecycle events
- pop-reference: Emit standard lifecycle events (start, complete, step) using 'lib/progress-callback'
- questions: Emit standard lifecycle events (start, complete, step) using progress-callback
- reduce: No phase-level events for multi-phase operations
- scale: Implement event emission using 'lib/progress-callback' to emit start, complete, and step events
- scan-js: Implement standardized event emission using 'lib/progress-callback'
- set-interval: Emit standard lifecycle events (start, complete, step) via progress-callback
- sort: No batch-level or phase-level event emissions
- split: Emits standard lifecycle events using lib/progress-callback
- summary-map: Implement event emission using 'lib/progress-callback' with standard events
- test: Emit standard lifecycle events using 'lib/progress-callback'
- test-analysis: Does not emit standard lifecycle events such as start, complete, or step.
- test-analyzer: No emission of standard lifecycle events via progress-callback
- themes: Implement event emission using 'lib/progress-callback' to emit lifecycle events.
- to-object: Emit standard events (start, complete, step) via progress-callback
- truncate: Implement event emission using 'lib/progress-callback' with standard events like start and complete

### generalizability

**Distribution:**
- Level 1: test-analysis, test-analyzer
- Level 2: scan-js
- Level 3: ai-arch-expect, conversation-turn-reduce, document-shrink, entities, expect, filter, filter-ambiguous, llm-logger, map, pop-reference, relations, score, veiled-variants
- Level 4: anonymize, category-samples, central-tendency, collect-terms, conversation, date, detect-patterns, detect-threshold, disambiguate, dismantle, extract-blocks, extract-features, find, glossary, group, intersections, join, list, people, questions, reduce, scale, set-interval, split, summary-map, tag-vocabulary, tags, test, themes, timeline, to-object, truncate

**Gaps:**
- ai-arch-expect: Further decouple from file system specifics to increase adaptability to other data sources.
- conversation-turn-reduce: Could improve by decoupling further from conversation-specific data structures to serve broader contexts.
- expect: Abstract file system and git operations to enable isomorphic usage beyond Node.js.
- filter-ambiguous: Could improve by supporting non-text data or more diverse input formats.
- scan-js: Abstract analysis to support other languages or generic text inputs.
- test-analysis: Abstract away framework and runtime dependencies to support multiple test frameworks or generic event sources.
- test-analyzer: Abstract log format and event detection to support multiple test frameworks.

### logging

**Distribution:**
- Level 0: ai-arch-expect, anonymize, category-samples, collect-terms, detect-patterns, detect-threshold, disambiguate, dismantle, document-shrink, entities, expect, filter-ambiguous, find, glossary, intersections, join, list, llm-logger, people, pop-reference, questions, reduce, scale, scan-js, summary-map, test, themes, truncate
- Level 1: conversation, set-interval, sort, split, test-analyzer, to-object
- Level 2: filter, group
- Level 3: extract-blocks, map, test-analysis
- Level 4: date, extract-features, socratic

**Gaps:**
- ai-arch-expect: Add lifecycle logging using 'lib/lifecycle-logger' with logStart and logResult
- anonymize: Add lifecycle logging using 'lib/lifecycle-logger' with logStart and logResult.
- category-samples: Add lifecycle logging with createLifecycleLogger and logStart/logResult calls
- collect-terms: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- conversation: Accepts `logger` config and uses `logger?.info()` inline
- detect-patterns: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- detect-threshold: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- disambiguate: Add lifecycle logging using 'lib/lifecycle-logger' with logStart and logResult
- dismantle: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- document-shrink: Add lifecycle logging using 'lib/lifecycle-logger' with logStart and logResult
- entities: Add lifecycle logging using createLifecycleLogger with logStart and logResult
- expect: Implement lifecycle logging using 'lib/lifecycle-logger' with logStart and logResult
- extract-blocks: Missing full lifecycle logging features like `logConstruction`, `logProcessing`, `logEvent`, and child loggers
- filter: Does not use 'createLifecycleLogger' with 'logStart'/'logResult' framing
- filter-ambiguous: Add logger parameter and use 'logger?.info()' or lifecycle logger
- find: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- glossary: Add lifecycle logging with `createLifecycleLogger` and use `logStart` and `logResult`
- group: Does not use 'createLifecycleLogger' with 'logStart'/'logResult' framing.
- intersections: Add lifecycle logging with createLifecycleLogger and logStart/logResult calls
- join: Accepts 'logger' config and uses logger?.info() inline
- list: Add lifecycle logger usage with logStart and logResult
- llm-logger: Implement lifecycle logging using 'lib/lifecycle-logger' with logStart/logResult
- map: Missing full lifecycle logging features like `logConstruction`, child loggers.
- people: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- pop-reference: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- questions: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- reduce: Add lifecycle logging using 'lib/lifecycle-logger' with logStart and logResult
- scale: Add lifecycle logging using 'lib/lifecycle-logger' with logStart and logResult
- scan-js: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- set-interval: Accepts a logger config and uses logger.info() inline
- sort: No structured logging with `createLifecycleLogger` or `logger` parameter
- split: Accepts logger config and uses logger?.info() for inline logging
- summary-map: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- test: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- test-analysis: Missing full lifecycle logging features like `logConstruction`, `logProcessing`, `logEvent`, and child loggers.
- test-analyzer: No structured logging or logger parameter usage
- themes: Add lifecycle logging using 'createLifecycleLogger' and related calls.
- to-object: Accepts 'logger' config and uses logger.info() inline
- truncate: Add lifecycle logging with createLifecycleLogger and logStart/logResult calls

### prompt-engineering

**Distribution:**
- Level 0: collect-terms, conversation, conversation-turn-reduce, extract-features, filter-ambiguous, join, test-analysis, test-analyzer, themes
- Level 1: map
- Level 2: category-samples, group, set-interval, summary-map, veiled-variants
- Level 3: central-tendency, date, detect-patterns, detect-threshold, disambiguate, entities, extract-blocks, filter, glossary, intersections, list, people, pop-reference, questions, reduce, scale, scan-js, socratic, sort, split, test, timeline, to-object
- Level 4: dismantle, tag-vocabulary

**Gaps:**
- category-samples: Missing system prompt usage, temperature tuning, and response_format with JSON schemas to reach level 3.
- central-tendency: Explicit temperature tuning and multi-stage prompt pipelines are missing.
- collect-terms: Missing use of shared prompt utilities such as asXML for variable wrapping, promptConstants, system prompts, temperature tuning, and response_format usage.
- conversation: Missing use of shared prompt utilities such as asXML for variable wrapping, promptConstants for reusable fragments, system prompts, temperature tuning, and response_format for structured output.
- conversation-turn-reduce: Missing use of shared prompt utilities like asXML for variable wrapping, promptConstants for reusable fragments, system prompts, temperature tuning, and response_format for structured output.
- date: No explicit temperature tuning or multi-stage prompt pipelines with frequency/presence penalty tuning.
- detect-patterns: Does not use promptConstants or extracted prompt builder functions; no multi-stage prompt pipelines or temperature tuning beyond defaults.
- detect-threshold: Missing explicit system prompt and temperature tuning to reach level 4.
- disambiguate: Missing explicit system prompt and temperature tuning for finer control.
- entities: Missing multi-stage prompt pipelines and advanced tuning like frequency/presence penalty to reach level 4.
- extract-blocks: No explicit system prompt or temperature tuning present.
- extract-features: Use of asXML for variable wrapping to improve prompt structure.
- filter: Missing explicit system prompt and temperature tuning to reach level 4.
- filter-ambiguous: Missing use of prompt helper utilities like asXML for variable wrapping, promptConstants for standardized prompt fragments, system prompts, temperature tuning, and response_format usage.
- glossary: No use of promptConstants, asXML wrapping, or temperature tuning to reach level 4.
- group: Missing system prompts, explicit temperature tuning, and response_format usage with JSON schemas to reach level 3.
- intersections: Missing system prompt usage and explicit temperature tuning to reach level 4.
- join: Missing use of shared prompt utilities like promptConstants, asXML wrapping, system prompts, temperature tuning, and response_format usage.
- list: No explicit system prompt usage or temperature tuning; lacks multi-stage prompt pipelines and advanced tuning like frequency/presence penalties.
- map: Missing extracted prompt builder functions and promptConstants usage to reach level 2.
- people: Missing explicit system prompt and temperature tuning to reach level 4.
- pop-reference: No system prompt or temperature tuning used.
- questions: Missing multi-stage prompt pipelines and frequency/presence penalty tuning to reach level 4.
- reduce: No explicit system prompt setting role or temperature tuning; no multi-stage prompt pipelines or advanced tuning like frequency/presence penalties.
- scale: Missing multi-stage prompt pipelines and advanced tuning such as frequency/presence penalty.
- scan-js: Missing explicit system prompt and temperature tuning; no use of promptConstants; no multi-stage prompt pipeline or penalty tuning.
- set-interval: Missing system prompts, temperature tuning, and response_format usage to reach level 3.
- socratic: Missing multi-stage prompt pipelines and frequency/presence penalty tuning to reach level 4.
- sort: Missing explicit system prompt and temperature tuning; no multi-stage prompt pipelines or advanced prompt engineering patterns; no use of prompt fragment library beyond one imported prompt constant; no use of asXML or promptConstants for variable wrapping.
- split: Missing system prompt usage and response_format with JSON schemas to reach level 4.
- summary-map: Missing system prompts, temperature tuning, and response_format usage to reach level 3.
- test: Missing explicit system prompt and temperature tuning to reach level 4.
- test-analysis: Use of asXML for variable wrapping and shared prompt utilities is missing.
- test-analyzer: Missing use of shared prompt utilities such as asXML for variable wrapping to reach level 1.
- themes: Missing use of shared prompt utilities like asXML, promptConstants, system prompts, temperature tuning, and response_format.
- timeline: No temperature tuning or promptConstants usage; no asXML or prompt builder functions; no frequency/presence penalty tuning.
- to-object: No explicit response_format usage with JSON schema enforcement; no frequency/presence penalty tuning; no multi-stage prompt pipelines beyond retries.
- veiled-variants: Missing system prompts, temperature tuning, and response_format usage to reach level 3.

### strategic-value

**Distribution:**
- Level 1: pop-reference, veiled-variants
- Level 2: collect-terms, conversation-turn-reduce, disambiguate, filter-ambiguous, glossary, people, scan-js, test-analysis, themes, truncate
- Level 3: anonymize, category-samples, central-tendency, conversation, date, detect-patterns, detect-threshold, dismantle, document-shrink, entities, extract-blocks, extract-features, filter, find, group, intersections, join, list, llm-logger, map, questions, reduce, relations, scale, score, set-interval, socratic, sort, split, summary-map, tag-vocabulary, tags, test, timeline, to-object
- Level 4: ai-arch-expect, expect, test-analyzer

**Gaps:**
- category-samples: Could increase frequency of use by expanding integration with other chains for broader workflows.
- collect-terms: Increase its integration with other core chains to enable more frequent use in AI pipelines.
- conversation: Could increase strategic value by enabling more novel workflows or tighter integration with other chains for feedback loops.
- conversation-turn-reduce: Increase direct usability or expose more general interfaces to broaden developer reach.
- detect-threshold: Could increase transformative impact by enabling more novel feedback loops or automation patterns.
- disambiguate: Increase frequency of use by enabling broader integration or novel workflows.
- filter-ambiguous: Increase generality and integration to broaden use cases beyond text ambiguity detection.
- glossary: Increase integration with other chains to enable more novel workflows.
- intersections: Could increase frequency of use by integrating more tightly with other core chains or exposing spec/apply patterns.
- people: Increase integration with other chains to enable more complex AI workflows involving personas.
- pop-reference: Increase frequency of use by broadening applicability or integrating with core workflows.
- scan-js: Increase general adoption by exposing capabilities for broader developer use beyond internal codebases.
- set-interval: Could increase adoption by providing more out-of-the-box use cases or integrations.
- socratic: Could increase frequency of use by integrating more tightly with other chains or expanding use cases.
- tag-vocabulary: Could increase frequency of use by broadening integration with other chains or exposing more composable interfaces.
- test-analysis: Increase general applicability beyond Vitest and Redis to broaden usage scenarios.
- themes: Increase integration with other chains to enable broader workflow use cases.
- timeline: Could increase frequency of use by exposing more composable interfaces or integrations.
- truncate: Increase frequency of use by integrating with more pipelines or enabling novel workflows.
- veiled-variants: Increase applicability and frequency of use by broadening use cases or integrating with more common workflows.

### testing

**Distribution:**
- Level 1: ai-arch-expect
- Level 2: category-samples, central-tendency, conversation-turn-reduce, detect-threshold, extract-blocks, extract-features, filter-ambiguous, intersections, llm-logger, map, scale, scan-js, score, set-interval, test-analysis, test-analyzer, veiled-variants
- Level 3: glossary
- Level 4: anonymize, collect-terms, conversation, date, detect-patterns, disambiguate, dismantle, document-shrink, entities, expect, filter, find, group, join, list, people, pop-reference, questions, reduce, relations, socratic, sort, split, summary-map, tag-vocabulary, tags, test, themes, timeline, to-object, truncate

**Gaps:**
- ai-arch-expect: Missing unit tests and aiExpect coverage
- category-samples: Lacks unit tests covering edge cases and error paths
- central-tendency: No unit tests covering edge cases or error paths
- conversation-turn-reduce: No aiExpect coverage for semantic validation
- detect-threshold: Lacks unit tests covering edge cases and error paths
- extract-blocks: No aiExpect or property-based tests
- extract-features: Missing unit tests covering edge cases and error paths
- filter-ambiguous: No aiExpect coverage for semantic validation
- glossary: No property-based or regression tests
- intersections: No unit tests covering edge cases or error paths
- llm-logger: Lacks aiExpect coverage for semantic validation
- map: No aiExpect or property-based tests to reach level 3+
- scale: Add unit tests covering edge cases and error paths
- scan-js: No unit tests covering edge cases or error paths
- score: Lacks `aiExpect` coverage and property-based or regression tests to reach level 3.
- set-interval: No aiExpect or property-based tests for semantic validation
- test-analysis: Add unit tests and aiExpect coverage
- test-analyzer: Add unit tests covering edge cases and error paths
- veiled-variants: Lacks aiExpect semantic validation and property-based or regression tests

### token-management

**Distribution:**
- Level 0: ai-arch-expect, anonymize, category-samples, conversation, date, detect-patterns, entities, expect, extract-features, intersections, join, list, llm-logger, people, pop-reference, scale, scan-js, set-interval, test, test-analysis, test-analyzer, themes, to-object
- Level 1: collect-terms, detect-threshold, disambiguate, dismantle, document-shrink, extract-blocks, filter-ambiguous, glossary, questions, socratic, sort, split, summary-map, truncate
- Level 2: filter, find, group, map, reduce

**Gaps:**
- ai-arch-expect: Implement token-budget-aware batching using 'createBatches' from 'lib/text-batch'
- anonymize: Implement token-budget-aware batching using 'createBatches' for large inputs.
- category-samples: Implement token-budget-aware batching using createBatches
- collect-terms: Use 'createBatches' for token-budget-aware splitting
- conversation: Implement token-budget-aware input splitting
- date: Implement token-budget-aware input splitting using `createBatches`
- detect-patterns: Implement token-budget-aware input splitting using createBatches
- detect-threshold: Implement token-budget-aware batching using createBatches
- disambiguate: Implement proportional multi-value budget management with auto-summarization
- dismantle: Implement proportional multi-value budget management with auto-summarization
- document-shrink: Use 'createBatches' from 'lib/text-batch' for token-budget-aware chunking
- entities: Implement token-budget-aware input splitting using createBatches
- expect: Implement token-budget-aware input splitting using 'createBatches' or similar
- extract-blocks: Lacks model-aware token budget management and automatic batching
- extract-features: Implement token-budget-aware batching using `createBatches`
- filter: No model-aware budget calculation or proportional multi-value budget management
- filter-ambiguous: Use 'createBatches' for token-budget-aware splitting
- find: No model-aware budget calculation or proportional multi-value budget management
- glossary: Implement token-budget-aware batching using `createBatches` from `lib/text-batch`
- group: Does not implement model-aware budget calculation or proportional multi-value budget management.
- intersections: Implement token-budget-aware batching using createBatches
- join: Implement token-budget-aware batching using 'createBatches'
- list: Implement token-budget-aware input chunking using createBatches
- llm-logger: Implement token-budget-aware batching using 'lib/text-batch' createBatches
- map: No model-aware budget calculation or proportional multi-value budget management.
- people: Implement token-budget-aware batching using createBatches
- pop-reference: Implement token-budget-aware batching using createBatches
- questions: Implement token-budget-aware splitting using createBatches
- reduce: No model-aware budget calculation or proportional multi-value budget management
- scale: Implement token-budget-aware batching using 'createBatches' to manage input size
- scan-js: Implement token-budget-aware input chunking using 'createBatches'
- set-interval: Implement token-budget-aware input splitting using createBatches
- socratic: Implement token-budget-aware splitting using `createBatches`
- sort: Does not use `createBatches` or token-budget-aware splitting
- split: Use createBatches for token-budget-aware splitting
- summary-map: Adopt 'createBatches' for token-budget-aware splitting
- test: Implement token-budget-aware input chunking using createBatches
- test-analysis: No token awareness or budget management implemented.
- test-analyzer: No token budget management or chunking
- themes: Implement token-budget-aware batching using 'createBatches' for efficient token management.
- to-object: Implement token-budget-aware input splitting using createBatches
- truncate: Integrate 'createBatches' for token-budget-aware chunking

