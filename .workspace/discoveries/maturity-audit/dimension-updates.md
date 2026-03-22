# Suggested Dimension Updates
> Generated 2026-02-22
> Review and merge relevant observations into .workspace/maturity/*.md

## Synthesis

DESIGN ASSESSMENT: The audit reveals strong design fitness in strategic-value (L3=36, L4=4), architectural-fitness (L3=36, L4=3), and generalizability (L4=35), indicating these chains are well-designed. Composition-fit shows mixed results with high L1=19 and L2=21 but low L3=4 and L4=6, suggesting some design weaknesses needing attention before implementation. Design-efficiency is generally strong (L3=30, L4=8). DESIGN REDESIGN PRIORITY: Composition-fit requires redesign before implementation hardening due to lower high-level maturity. IMPLEMENTATION PATTERNS: Logging (L0=30) and events (L0=21) show significant low maturity, indicating cross-cutting implementation gaps in these areas even where design is sound. Testing shows low L0=0 but high L2=18 and L4=31, suggesting testing is better implemented in some chains but inconsistent overall. PRIORITY ORDERING: Focus on redesigning composition-fit before advancing implementation hardening. Defer Tier 2 improvements in chains with weak design fitness. TOP 5 IMPROVEMENTS: 1) Redesign composition-fit to improve high-level maturity. 2) Enhance logging implementation to reduce low maturity (L0=30). 3) Improve event handling implementation to address low maturity (L0=21). 4) Strengthen testing consistency across chains, focusing on low maturity areas. 5) Address token-management low maturity (L0=27) to improve implementation quality. This synthesis prioritizes design fixes before implementation hardening, citing evidence from dimension distributions. TOTALS: 50 chains, 741 findings across 16 dimensions.

## Per-Dimension Findings

### api-surface

**Distribution:**
- Level 1: central-tendency, conversation, conversation-turn-reduce, date, detect-patterns, detect-threshold, document-shrink, filter, filter-ambiguous, find, group, intersections, join, llm-logger, map, people, pop-reference, reduce, set-interval, socratic, split, test, test-analysis, test-analyzer, themes, timeline, to-object, truncate, veiled-variants
- Level 2: ai-arch-expect, category-samples, collect-terms, disambiguate, dismantle, expect, extract-blocks, extract-features, glossary, list, sort, tag-vocabulary
- Level 3: score
- Level 4: anonymize, entities, relations, scale, tags

**Gaps:**
- ai-arch-expect: No instruction builders or spec/apply split exports
- category-samples: No instruction builders or spec/apply split
- central-tendency: Lacks documented instruction builders and spec/apply split
- collect-terms: No instruction builders or spec/apply split
- conversation: No instruction builders or spec/apply split
- conversation-turn-reduce: No documented named exports or shared config destructuring
- date: No instruction builders or spec/apply split exports
- detect-patterns: No instruction builders or spec/apply split
- detect-threshold: No instruction builders or spec/apply split exports
- disambiguate: No instruction builders or spec/apply split
- dismantle: No instruction builders or spec/apply split exports
- document-shrink: Missing documented exports, instruction builders, spec/apply split
- expect: No instruction builders or spec/apply split exports
- extract-blocks: No instruction builders or spec/apply split
- extract-features: No instruction builders or spec/apply split
- filter: Lacks documented default export and instruction builders; no spec/apply split or factory functions.
- filter-ambiguous: No documented named exports or instruction builders
- find: Lacks documented instruction builders and spec/apply split
- glossary: No instruction builders or spec/apply split exports
- group: Lacks instruction builders and spec/apply split exports
- intersections: No instruction builders or spec/apply split exports
- join: No instruction builders or spec/apply split exports
- list: No instruction builders or spec/apply split
- llm-logger: Lacks documented instruction builders and spec/apply split
- map: Lacks instruction builders and spec/apply split for higher composability
- people: No instruction builders or spec/apply split exports.
- pop-reference: No instruction builders or spec/apply split
- reduce: No instruction builders or spec/apply split exports.
- score: Missing factory functions and calibration utilities to reach level 4.
- set-interval: No shared config destructuring or documented multiple exports
- socratic: No documented named exports or instruction builders
- sort: No instruction builders or spec/apply split
- split: No instruction builders or spec/apply split exports to support higher composability.
- tag-vocabulary: No instruction builders or spec/apply split
- test: No instruction builders or spec/apply split
- test-analysis: Add named exports and document shared config destructuring
- test-analyzer: Add named exports with instruction builders and spec/apply split
- themes: No instruction builders or spec/apply split
- timeline: No instruction builders or spec/apply split exports
- to-object: No named exports, no instruction builders or spec/apply split
- truncate: No documented named exports or shared config destructuring
- veiled-variants: No instruction builders or spec/apply split

### architectural-fitness

**Distribution:**
- Level 1: test-analysis
- Level 2: ai-arch-expect, anonymize, date, document-shrink, expect, extract-blocks, llm-logger, relations, tags, timeline
- Level 3: category-samples, collect-terms, conversation, conversation-turn-reduce, detect-patterns, detect-threshold, disambiguate, dismantle, entities, filter, filter-ambiguous, find, glossary, group, intersections, join, list, map, people, pop-reference, questions, reduce, scale, scan-js, set-interval, socratic, sort, split, summary-map, tag-vocabulary, test, test-analyzer, themes, to-object, truncate, veiled-variants
- Level 4: central-tendency, extract-features, score

**Gaps:**
- ai-arch-expect: Refactor to reduce module size and separate concerns to improve clarity and maintainability.
- anonymize: Refactor to leverage existing batch processing chains (map, filter, reduce) internally to reduce bespoke orchestration and complexity.
- category-samples: Minor simplifications could be made to further clarify processing phases.
- date: Refactor to use spec/apply pattern and reduce complexity by clearer phase separation.
- detect-threshold: Minor complexity in handling batch data strings and JSON schema could be simplified.
- disambiguate: Minor simplifications could be made but overall design is proportional and clear.
- dismantle: Some complexity could be reduced by leveraging more existing batch processing primitives for recursion and tree management.
- document-shrink: Refactor to split responsibilities into smaller modules or chains to reduce complexity and improve clarity.
- entities: Minor simplifications could be made to reduce helper functions or clarify phases further.
- expect: Refactor to leverage existing library primitives for batch processing and context extraction to reduce bespoke code and complexity.
- extract-blocks: Refactor to leverage existing library primitives for batch processing and reduce bespoke coordination logic.
- filter-ambiguous: Minor simplifications possible but overall design is proportional and clean.
- glossary: No significant architectural issues; design is proportional to problem complexity.
- intersections: Minor complexity in batch processing could be simplified.
- llm-logger: Refactor to leverage existing batch processing chains and reduce bespoke coordination logic.
- people: No significant architectural improvements needed; maintain simplicity and clarity.
- relations: Decompose the chain into smaller modules or leverage existing batch processing chains more to reduce complexity.
- scale: Minor simplifications could be made to reduce complexity, but overall design is clean.
- scan-js: Minor simplifications could improve clarity but overall design is sound.
- set-interval: Minor simplifications possible but overall design is clean and proportional.
- split: Minor complexity in retry and chunk management could be simplified but overall design is proportional.
- summary-map: Minor simplifications could be made to reduce complexity in budget calculations.
- tags: Reduce complexity by splitting into smaller modules or extracting helper utilities.
- test: Minor simplifications possible but overall design proportional to problem complexity.
- test-analysis: Refactor to decompose the module into smaller, composable chains leveraging existing primitives like map, filter, and reduce to reduce bespoke infrastructure.
- themes: None; design is clean and proportional.
- timeline: Simplify architecture by extracting chunking and retry logic into reusable primitives or better leveraging existing library chains.
- to-object: Minor simplifications possible but overall design is sound.
- truncate: Minor improvements could be made to further simplify chunk management or leverage more library primitives.
- veiled-variants: No significant architectural improvements needed; design is proportional and clear.

### browser-server

**Distribution:**
- Level 0: ai-arch-expect, anonymize, category-samples, central-tendency, collect-terms, conversation, conversation-turn-reduce, date, detect-patterns, detect-threshold, disambiguate, entities, extract-blocks, extract-features, filter-ambiguous, find, glossary, group, intersections, join, list, llm-logger, map, people, pop-reference, questions, reduce, scale, scan-js, set-interval, socratic, split, summary-map, tag-vocabulary, tags, test, test-analysis, test-analyzer, themes, to-object, truncate, veiled-variants
- Level 1: score, sort, timeline
- Level 2: expect

**Gaps:**
- ai-arch-expect: Use lib/env for environment detection and avoid direct node-only imports
- anonymize: Use 'lib/env' for environment detection to support isomorphic operation
- category-samples: Use 'lib/env' for environment detection to support both browser and server
- central-tendency: Add environment abstraction using `lib/env`
- collect-terms: Use 'lib/env' for environment detection to support both browser and server
- conversation: Use `lib/env` for environment reads to support both browser and server
- conversation-turn-reduce: Use 'lib/env' for environment detection to support both browser and server environments.
- date: Use `lib/env` for environment reads to support isomorphic operation
- detect-patterns: Use 'lib/env' for environment detection to support both browser and server environments.
- detect-threshold: Use 'lib/env' for environment detection to support both browser and server
- disambiguate: Use 'lib/env' for environment detection to support both browser and server
- entities: Use 'lib/env' for environment reads to support both browser and server
- expect: Add tests for both browser and server environments and implement graceful degradation.
- extract-blocks: No environment abstraction or detection for browser/server compatibility
- extract-features: Add environment detection using 'lib/env' to support both browser and server
- filter-ambiguous: Use 'lib/env' for environment detection to support both browser and server.
- find: Use 'lib/env' for environment reads to support both browser and server
- glossary: Use lib/env for environment detection to support both browser and server
- group: Add environment detection using 'lib/env'
- intersections: Use 'lib/env' for environment detection to support both browser and server
- join: Use 'lib/env' for environment reads to support both browser and server
- list: Use 'lib/env' for environment detection to support both browser and server
- llm-logger: Use 'lib/env' for environment detection to support both browser and server
- map: No environment abstraction or detection for browser/server compatibility.
- people: Use 'lib/env' for environment detection to support both browser and server
- pop-reference: Use 'lib/env' for environment detection instead of direct environment checks
- questions: Use 'lib/env' for environment detection to support both browser and server
- reduce: Does not use 'lib/env' for environment reads or support both browser and server environments.
- scale: Use 'lib/env' for environment detection to support isomorphic operation
- scan-js: Use 'lib/env' for environment detection to support browser and server
- score: Use 'lib/env' for environment detection instead of direct 'process.env' access
- set-interval: Use 'lib/env' for environment detection to support both browser and server
- socratic: Add environment detection using `lib/env` to support both browser and server environments
- sort: Use `lib/env` abstraction for environment detection and variable access
- split: Use lib/env for environment reads to support both browser and server
- summary-map: Use 'lib/env' for environment detection to support both browser and server
- tag-vocabulary: Use 'lib/env' for environment detection to support isomorphic operation
- tags: Use 'lib/env' for environment detection to support both browser and server
- test: Use 'lib/env' for environment detection to support browser and server
- test-analysis: No support for browser environment or use of `lib/env` for environment detection
- test-analyzer: No environment abstraction for browser/server compatibility
- themes: Use 'lib/env' for environment detection to support both browser and server
- timeline: Does not use `lib/env` abstraction for environment detection
- to-object: Use 'lib/env' for environment detection to support both browser and server
- truncate: Use lib/env for environment detection to support both browser and server
- veiled-variants: Use 'lib/env' for environment detection to support both browser and server

### code-quality

**Distribution:**
- Level 2: detect-patterns, disambiguate, sort, veiled-variants
- Level 3: ai-arch-expect, anonymize, category-samples, detect-threshold, extract-blocks, find, group, intersections, join, list, questions, scan-js, set-interval, split, tag-vocabulary, tags, test-analysis, test-analyzer, themes, timeline, to-object, truncate
- Level 4: date, entities, map

**Gaps:**
- ai-arch-expect: Further modularization and composability to reach reference-quality
- anonymize: Further modularization and composability for reference-quality example
- category-samples: Further modularization and explicit transformations to reach reference-quality
- detect-patterns: Improve separation of concerns and composability for higher level.
- detect-threshold: Further modularization and composability to reach reference-quality
- disambiguate: Extract duplicated createModelOptions to shared utility, improve structure for composability
- extract-blocks: Could improve with more explicit transformations and composable internals for reference-quality
- find: Further separation of concerns and composability for reference-quality code
- group: Improve separation of concerns and composability to reach level 4
- intersections: Further modularization and composability to reach reference-quality
- join: Reference-quality example with comprehensive lifecycle logging and composable internals
- list: Further separation of concerns and composability for reference-quality
- questions: Further separation of concerns and composable internals to reach reference-quality
- scan-js: Further modularization and composability for reference-quality code
- set-interval: Improve composability and explicit transformation separation for reference-quality code
- sort: Better reuse of common utilities (e.g., deduplicate `createModelOptions`), reduce `console.warn` usage, and remove minor code duplication
- split: Reference-quality documentation and example-level implementation
- tag-vocabulary: Further modularization and composability for reference-quality example
- tags: Further improve composability and add explicit transformation layers
- test-analysis: Could improve to reference-quality by adding comprehensive documentation and example usage
- test-analyzer: Could improve to reference-quality with more composability and documentation
- themes: Further separation of concerns or composability could improve to level 4
- timeline: Could improve by further composability and explicit transformations
- to-object: Reference-quality example with comprehensive documentation and composable internals
- truncate: Further modularization or composability improvements
- veiled-variants: Remove console.warn in favor of logger; replace magic numbers with named constants

### composability

**Distribution:**
- Level 0: truncate
- Level 1: join, people, split
- Level 2: ai-arch-expect, category-samples, central-tendency, collect-terms, date, detect-patterns, detect-threshold, disambiguate, dismantle, document-shrink, expect, extract-blocks, extract-features, filter, find, group, intersections, list, llm-logger, map, pop-reference, questions, reduce, scan-js, set-interval, socratic, summary-map, tag-vocabulary, test, test-analysis, test-analyzer, themes, timeline, to-object, veiled-variants
- Level 3: score
- Level 4: anonymize, entities, relations, scale, tags

**Gaps:**
- ai-arch-expect: Lacks spec/apply split and factory functions for higher composability
- category-samples: Missing spec/apply split and instruction builders for higher composability
- central-tendency: No exported spec/apply functions or instruction builders
- collect-terms: No exported spec/apply functions or instruction builders
- date: Missing spec/apply split and instruction builders for higher composability
- detect-patterns: Missing spec/apply split and instruction builders
- detect-threshold: Lacks spec/apply split and instruction builders for external composition
- disambiguate: Missing spec/apply split and instruction builders for higher composability
- dismantle: Lacks spec/apply split functions and instruction builders for higher composability
- document-shrink: Lacks spec/apply split and instruction builders for composability level 3
- expect: Lacks spec/apply split and instruction builders for higher composability
- extract-blocks: No spec/apply split or instruction builders to reach level 3
- extract-features: No exported spec/apply functions or instruction builders
- filter: Missing spec/apply function split and instruction builders for higher composability.
- find: No spec/apply function split or instruction builders to enable higher composability
- group: Missing spec/apply split and instruction builders for external composition
- intersections: Lacks exported spec/apply functions and instruction builders for composability
- join: No internal composition of other chains or spec/apply split exports
- list: Missing spec/apply function exports and instruction builders
- llm-logger: No spec/apply split or instruction builders for multiple chains
- map: No spec/apply split or instruction builders to reach level 3
- people: No internal composition of other chains or spec/apply split exports.
- pop-reference: Missing exported spec/apply functions and instruction builders
- questions: Missing spec/apply split and instruction builders
- reduce: No exported spec/apply functions or instruction builders for composability.
- scan-js: Missing spec/apply split and instruction builders
- score: No factory functions for full composability level 4.
- set-interval: Missing spec/apply split and instruction builders
- socratic: Missing spec/apply split exports and factory functions for higher composability
- split: Lacks spec/apply split exports and instruction builders for chain composition.
- summary-map: Lacks spec/apply split functions and instruction builders
- tag-vocabulary: No spec/apply split or instruction builders
- test: Lacks spec/apply split and instruction builders
- test-analysis: Implement spec/apply split and instruction builders
- test-analyzer: Implement spec/apply split and instruction builders for composability
- themes: Missing spec/apply split and instruction builders
- timeline: No exported spec/apply split functions or instruction builders
- to-object: Lacks spec/apply split and instruction builders for higher composability
- truncate: No spec/apply split, instruction builders, or factory functions
- veiled-variants: No exported spec/apply split functions or instruction builders

### composition-fit

**Distribution:**
- Level 1: ai-arch-expect, conversation, date, document-shrink, expect, extract-blocks, join, llm-logger, people, pop-reference, scan-js, set-interval, socratic, test, test-analysis, test-analyzer, themes, to-object, veiled-variants
- Level 2: anonymize, conversation-turn-reduce, detect-patterns, detect-threshold, disambiguate, dismantle, filter, find, glossary, group, intersections, list, map, questions, reduce, sort, split, summary-map, tag-vocabulary, timeline, truncate
- Level 3: category-samples, collect-terms, filter-ambiguous, score
- Level 4: central-tendency, entities, extract-features, relations, scale, tags

**Gaps:**
- ai-arch-expect: Leverage existing library primitives like map, reduce, and score to improve composability.
- anonymize: Internal orchestration should be refactored to build on existing batch processing chains to improve composability.
- category-samples: Could adopt spec/apply and instruction builder patterns to enhance composability.
- collect-terms: Expose spec/apply pattern and instruction builders to fully integrate with library composition model.
- conversation: Refactor to expose spec/apply pattern and instruction builders to enable composition with other chains.
- conversation-turn-reduce: Expose a clean function interface and instruction builders to enable composition with other chains.
- date: Refactor to build on existing library primitives like map or filter and expose spec/apply interfaces.
- detect-patterns: Expose spec/apply pattern and instruction builders to integrate with other chains and enable novel workflows.
- detect-threshold: Expose spec/apply interfaces and instruction builders to align with library composition patterns.
- disambiguate: Refactor to expose spec/apply interfaces and instruction builders to better align with the library's composition philosophy.
- dismantle: Refactor to express recursive decomposition as a composition of existing batch processing chains to improve composability.
- document-shrink: Expose internal steps as composable chains or spec/apply patterns to enable pipeline integration and reuse.
- expect: Refactor to expose spec/apply patterns and instruction builders to integrate with library's batch processing chains.
- extract-blocks: Refactor to build on the library's batch processing and spec/apply primitives to improve composition fit.
- filter: Increase internal use of library primitives (e.g., map, score) to improve composability.
- filter-ambiguous: Could expose spec/apply pattern or instruction builders to reach full composition citizenship.
- find: Expose spec/apply pattern and instruction builders to integrate with other collection chains for full composition fit.
- glossary: Expose spec/apply interfaces and instruction builders to enable composition with other chains.
- group: Expose spec/apply interfaces and instruction builders to enable composition with other chains.
- intersections: Could be refactored to expose spec/apply pattern and instruction builders to better fit library composition philosophy.
- join: Refactor to build on existing batch processing chains (map, reduce) and spec/apply patterns to improve composability.
- list: Refactor to leverage existing batch processing chains and spec/apply patterns to improve composability.
- llm-logger: Redesign to expose composable interfaces and build on existing library primitives.
- map: Refactor to build on existing library primitives like list-batch or other batch chains to improve composability.
- people: Refactor to expose spec/apply interfaces and leverage existing batch processing chains to improve composability.
- pop-reference: Refactor to expose spec/apply pattern and instruction builders to integrate with library primitives and enable composition.
- questions: Refactor to leverage existing batch processing chains and spec/apply patterns to improve composability.
- reduce: Integrate spec/apply pattern and instruction builders to enhance composability.
- scan-js: Expose spec/apply interfaces and instruction builders to integrate with batch processing chains.
- set-interval: Refactor to leverage existing batch processing chains and expose spec/apply interfaces to improve composability.
- socratic: Refactor to expose spec/apply pattern and instruction builders to integrate with existing map/filter/reduce chains.
- sort: Refactor to leverage existing batch processing chains (map, filter) for internal operations to improve composition fit.
- split: Refactor to use or expose spec/apply pattern and integrate with batch processing chains for better composability.
- summary-map: Refactor to expose a clean function interface and integrate with existing chain primitives to enable composition.
- tag-vocabulary: Refactor to expose spec/apply pattern and instruction builders to align with library composition primitives.
- test: Refactor to expose spec/apply interfaces and leverage existing composition primitives.
- test-analysis: Redesign to build on the library's batch processing primitives (map, filter, reduce) and expose spec/apply patterns to enable composition.
- test-analyzer: Refactor to use spec/apply pattern and integrate with map/filter primitives for composability.
- themes: Refactor to expose spec/apply interfaces and instruction builders to align with library composition patterns.
- timeline: Expose spec/apply interfaces and instruction builders to enable composition with other chains.
- to-object: Refactor to expose spec/apply pattern or instruction builders to integrate with collection chains.
- truncate: Expose spec/apply pattern and instruction builders to better integrate with library composition philosophy.
- veiled-variants: Refactor to build on existing primitives like map or score and expose spec/apply interfaces.

### design-efficiency

**Distribution:**
- Level 1: ai-arch-expect, document-shrink, llm-logger, test-analysis
- Level 2: anonymize, date, dismantle, expect, extract-blocks, relations, tags, timeline
- Level 3: category-samples, conversation, conversation-turn-reduce, detect-patterns, detect-threshold, disambiguate, entities, filter, find, glossary, group, intersections, join, list, map, pop-reference, questions, scale, scan-js, score, set-interval, socratic, sort, split, summary-map, tag-vocabulary, test-analyzer, to-object, truncate, veiled-variants
- Level 4: central-tendency, collect-terms, extract-features, filter-ambiguous, people, reduce, test, themes

**Gaps:**
- ai-arch-expect: Simplify design to reduce code size and helper function count.
- anonymize: Simplify design by reducing helper functions and configuration complexity, and by leveraging existing library primitives.
- category-samples: Minor improvements in helper function consolidation could improve efficiency.
- date: Reduce helper functions and simplify retry logic to improve efficiency.
- detect-threshold: Could reduce some manual data string batching and JSON schema handling to improve clarity.
- dismantle: Reduce helper function count and simplify prompt management to improve efficiency.
- document-shrink: Simplify token budget management and reduce helper function proliferation by better abstraction.
- entities: Could reduce lines slightly by consolidating minor helpers or simplifying configuration.
- expect: Simplify implementation by reducing helper functions and consolidating logic where possible.
- extract-blocks: Simplify code by reducing helper functions and leveraging existing abstractions to lower LOC and complexity.
- intersections: Could reduce configuration complexity by consolidating parameters.
- llm-logger: Simplify design by reducing bespoke coordination and leveraging existing abstractions.
- relations: Reduce module size and helper function count by better abstraction or decomposition.
- scale: Could reduce LOC slightly by consolidating helper functions or simplifying configuration.
- scan-js: No significant design efficiency issues detected.
- split: Could reduce helper function count or simplify prompt construction further.
- summary-map: Could reduce some internal complexity in cache management and summarization orchestration.
- tags: Simplify the implementation to reduce LOC and helper functions, improving maintainability.
- test-analysis: Simplify design by reducing helper functions and splitting responsibilities into smaller, focused chains to improve maintainability and clarity.
- timeline: Reduce helper functions and internal complexity by better abstraction or decomposition.
- truncate: Could reduce helper functions or simplify chunking logic further.
- veiled-variants: No major design efficiency improvements needed.

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
- category-samples: Lacks architecture section, edge cases, performance notes, and composition guidance
- central-tendency: Missing comprehensive architecture, edge cases, performance notes, and composition guidance
- collect-terms: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- conversation: Missing architecture section, edge cases, performance notes, and composition guidance
- conversation-turn-reduce: Missing API section with parameter table and shared config reference
- date: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- detect-patterns: Missing architecture section, edge cases, performance notes, composition guidance
- detect-threshold: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- disambiguate: Missing comprehensive architecture, edge cases, performance notes, and composition guidance
- dismantle: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- document-shrink: Missing architecture section, edge cases, performance notes, composition guidance
- expect: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- extract-blocks: Missing architecture section, edge cases, performance notes, composition guidance
- extract-features: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- filter: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance.
- filter-ambiguous: Missing API section with parameter table and shared config reference
- find: Missing architecture section, edge cases, performance notes, and composition guidance
- glossary: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- group: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- intersections: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- join: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- llm-logger: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- map: Missing architecture section, edge cases, performance notes, and composition guidance
- people: Missing architecture section, edge cases, performance notes, and composition guidance.
- pop-reference: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- questions: Missing architecture section, edge cases, performance notes, and composition guidance
- reduce: Missing architecture section, edge cases, performance notes, and composition guidance.
- scan-js: Missing explicit API section with parameter table and shared config references
- set-interval: Missing comprehensive architecture, edge cases, performance notes, and composition guidance
- socratic: Missing architecture section, edge cases, performance notes, and composition guidance
- sort: Missing architecture section, edge cases, performance notes, and composition guidance
- split: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance.
- summary-map: Missing architecture section, edge cases, performance notes, and composition guidance
- tag-vocabulary: Missing comprehensive architecture section, edge cases, performance notes, and composition guidance
- test: Missing architecture section, edge cases, performance notes, and composition guidance
- test-analysis: Add a README with at least a basic description
- test-analyzer: Add a README with basic description and API section
- themes: Missing architecture section, edge cases, performance notes, composition guidance
- timeline: Lacks comprehensive architecture section, edge cases, performance notes, and composition guidance
- to-object: Missing detailed API parameter table, behavioral notes, and integration examples
- truncate: Missing architecture section, edge cases, performance notes, and composition guidance
- veiled-variants: Missing architecture section, edge cases, performance notes, and composition guidance

### errors-retry

**Distribution:**
- Level 0: ai-arch-expect, collect-terms, conversation, conversation-turn-reduce, detect-patterns, extract-features, filter-ambiguous, glossary, llm-logger, summary-map, test-analysis, themes, truncate, veiled-variants
- Level 1: central-tendency, detect-threshold, disambiguate, entities, extract-blocks, group, intersections, join, list, people, pop-reference, questions, reduce, scale, scan-js, set-interval, socratic, sort, split, tag-vocabulary, tags, test, test-analyzer, timeline, to-object
- Level 2: anonymize, find
- Level 3: category-samples, date, map, score

**Gaps:**
- ai-arch-expect: Add retry logic with lib/retry and define failure modes
- anonymize: Add multi-level retry, conditional retry, and attach error context to results
- category-samples: Add custom error types, attach logs and structured context to errors
- central-tendency: Lacks multi-level retry, conditional retry, and error context attachment
- collect-terms: Add basic retry logic using 'lib/retry' with default 429-only policy
- conversation: Basic retry via `lib/retry` with default 429-only policy
- conversation-turn-reduce: Add retry logic using 'lib/retry' and input validation with defined failure modes.
- date: Add custom error types and attach structured error context
- detect-patterns: Add basic retry logic and error handling to improve robustness.
- detect-threshold: Implement multi-level retry strategies, conditional retry, and attach error context
- disambiguate: Add input validation, conditional retry, and defined failure modes
- entities: Add input validation, defined failure modes, and enhanced retry strategies
- extract-blocks: No input validation, no multi-level or conditional retry, no custom error types or attached error context
- extract-features: Add error handling and retry logic using 'lib/retry'
- filter-ambiguous: Implement basic retry using 'lib/retry' with default 429-only policy.
- find: Add multi-level retry, conditional retry, and error context attachment
- glossary: Implement basic retry with lib/retry and error handling
- group: Add input validation, multi-level retry, and error context attachment
- intersections: Add input validation, conditional retry logic, and defined failure modes
- join: Add input validation and defined failure modes with enhanced retry strategies
- list: Add input validation and defined failure modes beyond basic retry
- llm-logger: Adopt 'lib/retry' with defined retry policies and structured error handling
- map: No custom error types or structured error vocabulary with attached logs.
- people: Add input validation and defined failure modes beyond basic retry
- pop-reference: Add input validation and defined failure modes beyond basic retry
- questions: Add input validation and defined failure modes with error context
- reduce: No input validation, conditional retry, or error context attached to results.
- scale: Add input validation, conditional retry logic, and defined failure modes
- scan-js: Add input validation and defined failure modes beyond basic retry
- score: No custom error types or structured error context attached
- set-interval: Add input validation, defined failure modes, and error context attachment
- socratic: Add input validation, multi-level retry strategies, and error context attachment
- sort: Add input validation, multi-level retry strategies, and error context attachment
- split: Add input validation and defined failure modes
- summary-map: Add basic retry logic and error handling
- tag-vocabulary: Add input validation, conditional retry policies, and defined failure modes
- tags: Add input validation and defined failure modes; enhance retry strategy with conditional retry and error context
- test: Add input validation and defined failure modes beyond basic retry
- test-analysis: Missing basic retry mechanisms and error handling
- test-analyzer: No input validation, no multi-level retry, no error context attachment
- themes: Add basic retry logic with 'lib/retry' and error handling
- timeline: No input validation, no multi-level or conditional retry, no error context attached
- to-object: Add input validation, defined failure modes, and error context attachment
- truncate: Add basic retry logic and error handling
- veiled-variants: Add basic retry logic with 'lib/retry' and error handling

### events

**Distribution:**
- Level 0: ai-arch-expect, collect-terms, conversation, conversation-turn-reduce, detect-patterns, expect, extract-features, filter-ambiguous, glossary, intersections, llm-logger, people, questions, scale, scan-js, summary-map, tag-vocabulary, test, themes, truncate, veiled-variants
- Level 1: anonymize, category-samples, central-tendency, date, detect-threshold, join, list, pop-reference, set-interval, split, tags, test-analysis, test-analyzer, timeline, to-object
- Level 2: disambiguate, sort
- Level 3: entities, extract-blocks, find, map, reduce
- Level 4: group, score, socratic

**Gaps:**
- ai-arch-expect: Add event emission using lib/progress-callback and emit standard lifecycle events
- anonymize: Emit standard lifecycle events (start, complete, step) using progress-callback
- category-samples: Emit standard lifecycle events (start, complete, step) using 'lib/progress-callback'
- central-tendency: Does not emit standard lifecycle events like start, complete, step
- collect-terms: Implement event emission using progress-callback standard events
- conversation: Accepts `onProgress` callback and passes it through to inner calls
- conversation-turn-reduce: Add event emission using 'lib/progress-callback' with standard events like start and complete.
- date: Emit standard lifecycle events (start, complete, step) via progress-callback
- detect-patterns: Implement event emission using 'lib/progress-callback' to emit standard lifecycle events.
- detect-threshold: Emit standard lifecycle events like start, complete, and step using 'lib/progress-callback'
- disambiguate: Emit batch-level events like batchStart, batchProcessed, batchComplete
- entities: Implement phase-level events for multi-phase operations
- expect: Add support for event emission using 'lib/progress-callback' with standard events like start and complete.
- extract-blocks: No phase-level event emissions for multi-phase operations
- extract-features: Add standardized event emission using 'lib/progress-callback'
- filter-ambiguous: Accept 'onProgress' callback and emit standard events using 'lib/progress-callback'.
- find: Add phase-level events for multi-phase operations
- glossary: Add event emission using progress-callback standard events
- intersections: Emit standard lifecycle events using 'lib/progress-callback' emitters
- join: Emit standard events (start, complete, step) via progress-callback
- list: Emit standard lifecycle events (start, complete, step) via progress-callback
- llm-logger: Import and use 'lib/progress-callback' to emit standard lifecycle events
- map: No phase-level event emission for multi-phase operations.
- people: Implement event emission using 'lib/progress-callback' with standard events
- pop-reference: Emit standard lifecycle events (start, complete, step) using 'lib/progress-callback'
- questions: Emit standard lifecycle events using progress-callback
- reduce: No phase-level events for multi-phase operations.
- scale: Emit standard lifecycle events such as start, complete, and step using progress-callback
- scan-js: Implement standardized event emission using 'lib/progress-callback'
- set-interval: Emit standard lifecycle events (start, complete, step) using 'lib/progress-callback'
- sort: Emit batch-level events like `batchStart`, `batchProcessed`, `batchComplete`
- split: Emit standard lifecycle events (start, complete, step) via progress-callback
- summary-map: Implement event emission using 'lib/progress-callback' with standard events
- tag-vocabulary: Emit standard lifecycle events using 'lib/progress-callback' emitters
- tags: Emit standard lifecycle events (start, complete, step) using 'lib/progress-callback'
- test: Emit standard lifecycle events using progress-callback
- test-analysis: Does not emit standard batch-level or phase-level lifecycle events
- test-analyzer: No emission of standard lifecycle events via progress-callback
- themes: Accept onProgress callback and emit standard lifecycle events
- timeline: Does not emit standardized lifecycle events via `lib/progress-callback`
- to-object: Emit standard lifecycle events (start, complete, step) via 'lib/progress-callback'
- truncate: Implement event emission using progress-callback
- veiled-variants: Add event emission using 'lib/progress-callback' with standard events

### generalizability

**Distribution:**
- Level 1: test-analysis, test-analyzer
- Level 2: scan-js
- Level 3: ai-arch-expect, conversation, conversation-turn-reduce, expect, filter, llm-logger, map, pop-reference, relations, score, test, veiled-variants
- Level 4: anonymize, category-samples, central-tendency, collect-terms, date, detect-patterns, detect-threshold, disambiguate, dismantle, document-shrink, entities, extract-blocks, extract-features, filter-ambiguous, find, glossary, group, intersections, join, list, people, questions, reduce, scale, set-interval, socratic, sort, split, summary-map, tag-vocabulary, tags, themes, timeline, to-object, truncate

**Gaps:**
- ai-arch-expect: Further decouple from file system specifics to support broader data sources.
- expect: Abstract Node.js specific dependencies to enable broader runtime compatibility (e.g., browser).
- scan-js: Abstract language-specific dependencies to support multiple languages or generic text analysis.
- test: Could improve by removing any implicit assumptions about code language or file types.
- test-analysis: Abstract dependencies on Vitest and Redis to enable broader applicability across test frameworks and storage backends.
- test-analyzer: Decouple from specific test log formats and framework conventions to increase applicability.
- veiled-variants: Could improve by decoupling from specific privacy model defaults to increase adaptability.

### logging

**Distribution:**
- Level 0: ai-arch-expect, anonymize, category-samples, collect-terms, conversation-turn-reduce, detect-patterns, detect-threshold, disambiguate, entities, expect, filter-ambiguous, find, glossary, intersections, join, list, llm-logger, people, pop-reference, questions, scale, scan-js, set-interval, summary-map, tag-vocabulary, tags, test, themes, truncate, veiled-variants
- Level 1: conversation, sort, split, test-analyzer, timeline, to-object
- Level 2: group, reduce, score
- Level 3: extract-blocks, map, test-analysis
- Level 4: central-tendency, date, extract-features, socratic

**Gaps:**
- ai-arch-expect: Add lifecycle logging using createLifecycleLogger and logStart/logResult
- anonymize: Add lifecycle logging with createLifecycleLogger and logStart/logResult calls
- category-samples: Add lifecycle logging with createLifecycleLogger and logStart/logResult calls
- collect-terms: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- conversation: Accepts a logger config and uses `logger?.info()` inline
- conversation-turn-reduce: Add lifecycle logging using 'lib/lifecycle-logger' with 'createLifecycleLogger' and log framing.
- detect-patterns: Add lifecycle logging with createLifecycleLogger and logStart/logResult calls.
- detect-threshold: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- disambiguate: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- entities: Add lifecycle logging using 'lib/lifecycle-logger' with logStart and logResult
- expect: Implement lifecycle logging using 'createLifecycleLogger' with 'logStart' and 'logResult' calls.
- extract-blocks: Missing full lifecycle logging features like `logConstruction`, `logProcessing`, `logEvent`, and child loggers
- filter-ambiguous: Add logger parameter and use 'logger?.info()' or lifecycle logger calls.
- find: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- glossary: Add lifecycle logging using createLifecycleLogger and logStart/logResult
- group: Add 'logger' config and use 'createLifecycleLogger' with 'logStart' and 'logResult'
- intersections: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- join: Accepts 'logger' config and uses logger?.info() inline
- list: Add lifecycle logger usage with logStart and logResult
- llm-logger: Use 'lib/lifecycle-logger' and its functions like createLifecycleLogger, logStart, logResult
- map: Missing full lifecycle logging features like `logConstruction`, child loggers.
- people: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- pop-reference: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- questions: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- reduce: Does not use 'createLifecycleLogger' with 'logStart'/'logResult' framing.
- scale: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- scan-js: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- score: Does not use 'createLifecycleLogger' with 'logStart'/'logResult' framing
- set-interval: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- sort: Accepts a logger config and uses `logger?.info()` or uses `createLifecycleLogger` for structured logging
- split: Accepts logger config and uses logger?.info() for inline logging
- summary-map: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- tag-vocabulary: Add lifecycle logging with createLifecycleLogger and logStart/logResult calls
- tags: Add lifecycle logging using 'lib/lifecycle-logger' with logStart/logResult
- test: Add lifecycle logging with createLifecycleLogger and logStart/logResult
- test-analysis: Missing full lifecycle logging with `logConstruction`, `logProcessing`, `logEvent`, and child loggers
- test-analyzer: No structured logging or logger config usage
- themes: Add logger parameter and use createLifecycleLogger with logStart/logResult
- timeline: Does not accept a `logger` config or use `logger?.info()` inline
- to-object: Accepts 'logger' config and uses 'logger?.info()' inline
- truncate: Add logger parameter and use logger.info() calls
- veiled-variants: Add lifecycle logging with createLifecycleLogger and logStart/logResult

### prompt-engineering

**Distribution:**
- Level 0: collect-terms, conversation, conversation-turn-reduce, extract-features, filter-ambiguous, join, test-analysis, test-analyzer, themes
- Level 2: category-samples, group, map, summary-map, veiled-variants
- Level 3: central-tendency, date, detect-patterns, detect-threshold, disambiguate, entities, expect, extract-blocks, filter, glossary, intersections, list, people, pop-reference, questions, reduce, scale, scan-js, set-interval, socratic, sort, split, test, timeline, to-object
- Level 4: dismantle, tag-vocabulary

**Gaps:**
- category-samples: Missing system prompts, temperature tuning, and response_format usage to reach level 3.
- central-tendency: Missing explicit system prompt and temperature tuning to reach level 4.
- collect-terms: Missing use of shared prompt utilities such as asXML for variable wrapping, promptConstants, system prompts, temperature tuning, and response_format usage.
- conversation: Missing use of asXML for variable wrapping and shared prompt utilities.
- conversation-turn-reduce: Missing use of shared prompt utilities such as asXML for variable wrapping, promptConstants for reusable fragments, system prompts, temperature tuning, and response_format usage.
- date: Temperature tuning and multi-stage prompt pipelines with frequency/presence penalty tuning are missing.
- detect-patterns: Does not use promptConstants or extracted prompt builder functions; no multi-stage prompt pipeline or advanced tuning like frequency/presence penalties.
- detect-threshold: Does not implement multi-stage prompt pipelines or frequency/presence penalty tuning.
- disambiguate: Explicit temperature tuning and system prompt usage missing; no multi-stage prompt pipeline with frequency/presence penalty tuning.
- entities: Missing multi-stage prompt pipelines and advanced tuning like frequency/presence penalties to reach level 4.
- expect: No multi-stage prompt pipelines or advanced frequency/presence penalty tuning are present.
- extract-blocks: Missing system prompt usage and explicit temperature tuning to reach level 4.
- extract-features: Missing use of asXML for variable wrapping and shared prompt utilities.
- filter: No system prompt usage or temperature tuning to reach level 4.
- filter-ambiguous: Missing use of prompt helper modules like asXML, promptConstants, system prompts, temperature tuning, and response_format.
- glossary: Missing explicit system prompt usage and temperature tuning, and no use of promptConstants or asXML variable wrapping.
- group: Missing system prompts, temperature tuning, and response_format usage to reach level 3.
- intersections: Missing multi-stage prompt pipelines and advanced tuning like frequency/presence penalty.
- join: Missing use of shared prompt utilities like promptConstants and asXML for variable wrapping, no system prompts or temperature tuning, no response_format usage.
- list: No explicit temperature tuning or multi-stage prompt pipelines with frequency/presence penalty tuning.
- map: Missing system prompts, temperature tuning, and response_format usage to reach level 3.
- people: Missing explicit system prompt and temperature tuning to reach level 4.
- pop-reference: No system prompt usage or temperature tuning; no multi-stage prompt pipeline or penalty tuning.
- questions: Missing multi-stage prompt pipelines and frequency/presence penalty tuning to reach level 4.
- reduce: Explicit temperature tuning and use of system prompts are missing to reach level 4.
- scale: Missing multi-stage prompt pipelines and advanced tuning such as frequency/presence penalty.
- scan-js: Missing explicit system prompt and temperature tuning; no multi-stage prompt pipeline or penalty tuning.
- set-interval: Explicit system prompt usage, temperature tuning, and response_format with JSON schemas are missing to reach level 4.
- socratic: Missing multi-stage prompt pipelines and frequency/presence penalty tuning to reach level 4.
- sort: No explicit system prompt or temperature tuning to reach level 4.
- split: Missing system prompt usage and response_format with JSON schemas to reach level 4.
- summary-map: Missing system prompts, temperature tuning, and response_format usage to reach level 3.
- test: Missing explicit system prompt and temperature tuning to reach level 4.
- test-analysis: Use of asXML for variable wrapping and shared prompt utilities is missing.
- test-analyzer: Missing use of shared prompt utilities such as asXML for variable wrapping, promptConstants, system prompts, temperature tuning, and response_format usage.
- themes: Missing use of shared prompt utilities like asXML for variable wrapping, promptConstants, system prompts, temperature tuning, and response_format usage.
- timeline: Missing promptConstants usage and extracted prompt builder functions to reach level 4; no temperature tuning or multi-stage prompt pipelines beyond basic multi-chunk processing.
- to-object: No explicit temperature tuning or response_format with JSON schemas; no multi-stage prompt pipelines with frequency/presence penalty tuning.
- veiled-variants: Missing system prompts, temperature tuning, and response_format usage to reach level 3.

### strategic-value

**Distribution:**
- Level 1: pop-reference, veiled-variants
- Level 2: conversation-turn-reduce, disambiguate, filter-ambiguous, glossary, people, scan-js, truncate
- Level 3: anonymize, category-samples, central-tendency, collect-terms, conversation, date, detect-patterns, detect-threshold, dismantle, document-shrink, entities, extract-blocks, extract-features, filter, find, group, intersections, join, list, llm-logger, map, questions, reduce, relations, scale, score, set-interval, socratic, sort, split, summary-map, tag-vocabulary, tags, test, timeline, to-object
- Level 4: ai-arch-expect, expect, test-analysis, test-analyzer

**Gaps:**
- category-samples: Could increase strategic value by enabling more dynamic or interactive sample generation workflows.
- conversation-turn-reduce: Increase direct usability or expose more general interfaces to broaden developer reach.
- detect-threshold: Could increase strategic value by integrating with more domain-specific workflows or exposing more composable interfaces.
- disambiguate: Increase its applicability by integrating with more pipelines or expanding its capabilities to handle more complex disambiguation scenarios.
- dismantle: Could increase strategic value by enabling deeper integration with other chains for automated workflows.
- entities: Could increase transformative impact by enabling novel feedback loops or more advanced entity reasoning.
- filter-ambiguous: Increase integration to unlock more novel workflows beyond current moderate utility.
- glossary: Increase integration with other chains to enable more novel workflows beyond term extraction.
- intersections: Could increase frequency of use by integrating more tightly with other core chains or expanding use cases.
- people: Increase the chain's applicability to unlock more transformative workflows, such as integration with other chains for dynamic persona adaptation.
- pop-reference: Increase applicability across more workflows and demonstrate broader utility beyond niche metaphor generation.
- scale: Could increase transformative impact by enabling more novel feedback loops or automation patterns.
- scan-js: Increase general applicability and integration to become a core AI pipeline tool.
- set-interval: Could increase adoption by providing more out-of-the-box use cases or integrations.
- split: Could increase strategic value by enabling more complex or multi-modal splitting strategies.
- summary-map: Could increase strategic value by integrating more tightly with other chains to enable novel workflows.
- test: Could increase adoption by integrating with more test frameworks or expanding use cases.
- timeline: Could increase frequency of use by exposing more composable interfaces or integrations.
- to-object: Could increase strategic value by enabling more advanced JSON repair or integration features.
- truncate: Could increase strategic value by enabling more novel workflows or tighter integration with other chains.
- veiled-variants: Increase applicability across more general AI workflows to raise frequency of use.

### testing

**Distribution:**
- Level 2: ai-arch-expect, category-samples, central-tendency, conversation-turn-reduce, detect-threshold, extract-blocks, extract-features, filter-ambiguous, intersections, llm-logger, map, scale, scan-js, score, set-interval, test-analysis, test-analyzer, veiled-variants
- Level 3: glossary
- Level 4: anonymize, collect-terms, conversation, date, detect-patterns, disambiguate, dismantle, document-shrink, entities, expect, filter, find, group, join, list, people, pop-reference, questions, reduce, relations, socratic, sort, split, summary-map, tag-vocabulary, tags, test, themes, timeline, to-object, truncate

**Gaps:**
- ai-arch-expect: Missing unit tests and aiExpect coverage
- category-samples: Lacks unit tests covering edge cases and error paths
- central-tendency: Missing unit tests covering edge cases and error paths
- conversation-turn-reduce: Missing aiExpect coverage for semantic validation
- detect-threshold: Missing unit tests covering edge cases and error paths
- extract-blocks: No aiExpect or property-based tests
- extract-features: Missing unit tests covering edge cases and error paths
- filter-ambiguous: No aiExpect coverage for semantic validation
- glossary: No property-based or regression tests
- intersections: Missing unit tests covering edge cases and error paths
- llm-logger: Missing aiExpect semantic validation and property-based tests
- map: Missing aiExpect coverage for semantic validation
- scale: Lacks unit tests covering edge cases and error paths
- scan-js: No unit tests covering edge cases or error paths
- score: Lacks `aiExpect` coverage and property-based or regression tests to reach level 4.
- set-interval: Lacks aiExpect coverage for semantic validation
- test-analysis: Add unit tests and aiExpect coverage
- test-analyzer: Add unit tests covering edge cases and error paths
- veiled-variants: Lacks aiExpect semantic validation and property-based tests

### token-management

**Distribution:**
- Level 0: ai-arch-expect, anonymize, category-samples, conversation, conversation-turn-reduce, date, detect-patterns, entities, expect, extract-features, intersections, join, list, llm-logger, people, pop-reference, scale, scan-js, set-interval, tag-vocabulary, tags, test, test-analysis, test-analyzer, themes, to-object, veiled-variants
- Level 1: central-tendency, collect-terms, detect-threshold, disambiguate, extract-blocks, filter-ambiguous, glossary, questions, socratic, sort, split, timeline, truncate
- Level 2: find, group, map, reduce, score

**Gaps:**
- ai-arch-expect: Implement token-budget-aware batching using lib/text-batch createBatches
- anonymize: Implement token-budget-aware batching using createBatches
- category-samples: Implement token-budget-aware batching using 'createBatches'
- central-tendency: Does not use `createBatches` or token-budget-aware splitting
- collect-terms: Use 'createBatches' for token-budget-aware splitting
- conversation: Manual chunking or token-budget-aware splitting
- conversation-turn-reduce: Implement token-budget-aware input splitting using 'createBatches' or similar.
- date: Implement token-budget-aware input chunking using `createBatches`
- detect-patterns: Implement token-budget-aware input chunking using createBatches.
- detect-threshold: Adopt 'createBatches' for token-budget-aware input splitting
- disambiguate: Implement proportional multi-value budget management with auto-summarization
- entities: Implement token-budget-aware input splitting using 'createBatches' or similar
- expect: Implement token-budget-aware input splitting using 'createBatches' from 'lib/text-batch'.
- extract-blocks: Lacks model-aware token budget management and proportional multi-value budget handling
- extract-features: Implement token-budget-aware batching using 'createBatches'
- filter-ambiguous: Use 'createBatches' for token-budget-aware splitting.
- find: Implement model-aware budget calculation with budgetTokens
- glossary: Use createBatches for token-budget-aware splitting
- group: Add model-aware budget calculation with 'budgetTokens'
- intersections: Implement token-budget-aware input chunking using createBatches
- join: Implement token-budget-aware input splitting using createBatches
- list: Implement token-budget-aware batching using createBatches
- llm-logger: Implement token-budget-aware batching using 'lib/text-batch'
- map: No model-aware budget calculation or proportional multi-value budget management.
- people: Implement token-budget-aware batching using 'createBatches' or similar
- pop-reference: Implement token-budget-aware batching using createBatches
- questions: Implement token-budget-aware input splitting using createBatches
- reduce: No model-aware budget calculation or proportional multi-value budget management.
- scale: Implement token-budget-aware batching using createBatches
- scan-js: Implement token-budget-aware input chunking using 'createBatches'
- score: No evidence of model-aware budget calculation or proportional multi-value budget management
- set-interval: Implement token-budget-aware input chunking using createBatches
- socratic: No proportional multi-value budget management or auto-summarization
- sort: Use `createBatches` for token-budget-aware batch splitting
- split: Use createBatches for token-budget-aware splitting
- tag-vocabulary: Implement token-budget-aware batching using createBatches
- tags: Implement token-budget-aware batching using createBatches
- test: Implement token-budget-aware batching using createBatches
- test-analysis: No token-aware input chunking or budget management
- test-analyzer: No token-aware input chunking or batching
- themes: Use token-budget-aware batching with createBatches
- timeline: Does not use `createBatches` or token-budget-aware splitting
- to-object: Implement token-budget-aware input chunking using 'createBatches'
- truncate: Use createBatches or token-budget-aware splitting
- veiled-variants: Implement token-budget-aware input chunking using createBatches

