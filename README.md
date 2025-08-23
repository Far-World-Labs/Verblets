# Verblets

Verblets /ˈvaɪb.ləts/ is a utility library of AI-powered functions for transforming text and structured data into reliable outputs. Functions are composable and reusable while constraining outputs to ensure software reliability. 

The API interfaces are familiar but support intelligent operations over text and data instead, sometimes via complex algorithms. It's not clear how many functions an AI standard library should have. This is uncharted terratory. The fuzzy and adaptive nature of LLMs suggests AI standard libraries can be much larger than classical standard libraries, and humans prefer to have large, flexible vocabularies. So please suggest or introduce new verblets!

Instead of mimicking humans in order to automate tasks, an AI standard library surfaces operational capability that *extends* people in *new* ways via intelligent software applications. Top-down AI approaches to automate people lead to forgetful, error-prone NPC-like replicas. By contrast, powerful new tools lead to new roles and new ways of working together for us humans.

Why the name? Verblets are verbally based: they're LLM-powered; and you can think of functions as verbs.

## Repository Guide

### Quick Links

- [Chains](./src/chains/) - Prompt chains and algorithms based on LLMs
- [Verblets](./src/verblets/) - Core AI utility functions. At most a single LLM call, no prompt chains. 
- [Library Helpers](./src/lib/) - Utility functions and wrappers
- [Prompts](./src/prompts/) - Reusable prompt templates
- [JSON Schemas](./src/json-schemas/) - Data validation schemas

## Utilities

### Primitives

Primitive verblets extract basic data types from natural language with high reliability. They constrain LLM outputs to prevent hallucination while handling the complexity of human expression.

- [bool](./src/verblets/bool) - Interpret yes/no, true/false, and conditional statements
- [date](./src/chains/date) - Parse dates from relative expressions, natural language, standard formats, and longer descriptions
- [enum](./src/verblets/enum) - Convert free-form input to exactly one of several predefined options
- [number](./src/verblets/number) - Convert a block of text to a single number
- [number-with-units](./src/verblets/number-with-units) - Parse measurements and convert between unit systems

### Math

Math chains transform values using conceptual reasoning and subjective judgments beyond simple calculations.

- [scale](./src/chains/scale) - Convert qualitative descriptions to numeric values. Uses a specification generator to maintain consistency across invocations.

### Lists

List operations transform, filter, and organize collections. They handle both individual items and batch processing for datasets larger than a context window. Many list operations support bulk operation with built-in retry. Many have alternative single invocation versions in the verblets directory. Many utilities have list support via specification-generators that maintain continuity, or prompt fragments that adapt single-invcation behavior to list processing.

- [central-tendency](./src/chains/central-tendency) - Find the most representative examples from a collection
- [detect-patterns](./src/chains/detect-patterns) - Identify repeating structures, sequences, or relationships in data
- [detect-threshold](./src/chains/detect-threshold) - Find meaningful breakpoints in numeric values, for use in metrics and alerting
- [entities](./src/chains/entities) - Extract names, places, organizations, and custom entity types
- [filter](./src/chains/filter) - Keep items matching natural language criteria through parallel batch processing
- [find](./src/chains/find) - Return the single best match using parallel evaluation with early stopping
- [glossary](./src/chains/glossary) - Extract key terms and generate definitions from their usage
- [group](./src/chains/group) - Cluster items by first discovering categories then assigning members
- [intersections](./src/chains/intersections) - Find overlapping concepts between all item pairs
- [list](./src/chains/list) - Extract lists from prose, tables, or generate from descriptions
- [list-expand](./src/verblets/list-expand) - Add similar items matching the pattern of existing ones
- [map](./src/chains/map) - Transform each item using consistent rules applied in parallel batches
- [reduce](./src/chains/reduce) - Combine items sequentially, building up a result across batches
- [score](./src/chains/score) - Rate items on multiple criteria using weighted evaluation
- [sort](./src/chains/sort) - Order by complex criteria using tournament-style comparisons

### Content

Content utilities generate, transform, and analyze text while maintaining structure and meaning. They handle creative tasks, system analysis, and privacy-aware text processing.

- [anonymize](./src/chains/anonymize) - Replace names, dates, and identifying details with placeholders
- [category-samples](./src/chains/category-samples) - Create examples ranging from typical to edge cases
- [collect-terms](./src/chains/collect-terms) - Find domain-specific or complex vocabulary
- [commonalities](./src/verblets/commonalities) - Identify what items share conceptually, not just literally
- [conversation](./src/chains/conversation) - Manage multi-turn dialogues with memory and context tracking
- [disambiguate](./src/chains/disambiguate) - Determine which meaning of ambiguous terms fits the context
- [dismantle](./src/chains/dismantle) - Break down systems into parts, subparts, and their connections
- [document-shrink](./src/chains/document-shrink) - Remove less relevant sections while keeping query-related content
- [fill-missing](./src/verblets/fill-missing) - Predict likely content for redacted or corrupted sections
- [filter-ambiguous](./src/chains/filter-ambiguous) - Flag items that need human clarification
- [join](./src/chains/join) - Connect text fragments by adding transitions and maintaining flow
- [name](./src/verblets/name) - Parse names handling titles, suffixes, and cultural variations
- [name-similar-to](./src/verblets/name-similar-to) - Generate names following example patterns
- [people](./src/chains/people) - Build artificial person profiles with consistent demographics and traits. Useful as LLM roles.
- [pop-reference](./src/chains/pop-reference) - Match concepts to movies, songs, memes, or cultural touchstones
- [questions](./src/chains/questions) - Generate follow-up questions that branch from initial inquiry
- [relations](./src/chains/relations) - Extract relationship tuples from text
- [schema-org](./src/verblets/schema-org) - Convert unstructured data to schema.org JSON-LD format
- [socratic](./src/chains/socratic) - Ask questions that reveal hidden assumptions and logic gaps
- [split](./src/chains/split) - Find topic boundaries in continuous text
- [summary-map](./src/chains/summary-map) - Build layered summaries for navigating large documents
- [themes](./src/chains/themes) - Surface recurring ideas through multi-pass extraction and merging
- [timeline](./src/chains/timeline) - Order events chronologically from scattered mentions
- [to-object](./src/chains/to-object) - Extract key-value pairs from natural language descriptions
- [truncate](./src/chains/truncate) - Remove trailing content after a semantic boundary
- [veiled-variants](./src/chains/veiled-variants) - Reword queries to avoid triggering content filters


### Utility Operations

Utility operations are uncategorized functionality like automatic tool selection, intent parsing, and context compression.

- [ai-arch-expect](./src/chains/ai-arch-expect) - Validate AI architecture constraints and patterns
- [auto](./src/verblets/auto) - Match task descriptions to available tools using function calling
- [expect](./src/verblets/expect) - Check if conditions are met and explain why if not
- [expect chain](./src/chains/expect) - Validate complex data relationships with detailed failure analysis
- [intent](./src/verblets/intent) - Extract action and parameters from natural language commands
- [llm-logger](./src/chains/llm-logger) - Summarize log patterns and detect anomalies across time windows
- [sentiment](./src/verblets/sentiment) - Classify as positive, negative, or neutral with nuance detection
- [set-interval](./src/chains/set-interval) - Schedule tasks using natural language time descriptions

### Codebase

Codebase utilities analyze, test, and improve code quality using AI reasoning.

- [scan-js](./src/chains/scan-js) - Examine JavaScript for patterns, anti-patterns, and potential issues
- [test](./src/chains/test) - Generate test cases covering happy paths, edge cases, and error conditions
- [test-advice](./src/chains/test-advice) - Identify untested code paths and suggest test scenarios

## Library Helpers

Helpers support higher-level operations. They make no LLM calls and are often synchronous.

- [chatgpt](./src/lib/chatgpt) - OpenAI ChatGPT wrapper
- [prompt-cache](./src/lib/prompt-cache) - Cache prompts and responses
- [retry](./src/lib/retry) - Retry asynchronous calls
- [ring-buffer](./src/lib/ring-buffer) - Circular buffer implementation for running LLMs on streams of data

## Contributing

Help us explore what's possible when we extend software primitives with language model intelligence.

## License

All Rights Reserved - Far World Labs
