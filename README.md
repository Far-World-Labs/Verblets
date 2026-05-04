# Verblets

Verblets /ˈvaɪb.ləts/ is a utility library of AI-powered functions for creating new kinds of applications. Verblets are composable and reusable while constraining outputs to ensure software reliability. Many of the API interfaces are familiar to developers but support intelligent operations in ways classical analogues do not, sometimes via complex algorithms that have surprising results.

Instead of mimicking humans in order to automate tasks, an AI standard library *extends* people in *new* ways via intelligent software applications that are built on those utilities. Top-down AI approaches to automate people lead to forgetful, error-prone NPC-like replicas that can't be shaped the way software can. By contrast, AI-based software tools lead to new roles and new ways of working together for us humans.

Why the name? Verblets are *verbally* based: they're LLM-powered; and you can think of functions as verbs.

## Install

```sh
npm install @far-world-labs/verblets
```

Set an API key as an environment variable — either works:

```sh
export OPENAI_API_KEY=sk-...
# or
export ANTHROPIC_API_KEY=sk-ant-...
```

Or use a `.env` file in your project root (loaded automatically via dotenv).

Then initialize and call a function:

```js
import { init } from '@far-world-labs/verblets';

const { score } = init();

const results = await score(
  ['reliability', 'performance', 'ease of use'],
  'Rate each quality for a bicycle',
);
```

`init()` validates that an API key is present, creates a fresh model service, and returns an object of wrapped functions with services pre-injected. Destructure the functions you need:

```js
const { filter, map, bool, llm } = init({
  embed: true,            // enable local embedding model
  redis: redisClient,     // pre-configured Redis client for caching
  models: {               // extend the model catalog (additive)
    'my-llama': { provider: 'openwebui', apiUrl: 'http://localhost:11434/', endpoint: 'v1/chat/completions', maxContextWindow: 8192, maxOutputTokens: 4096 },
  },
  rules: [                // override negotiation rules (first match wins)
    { match: { sensitive: true, good: true }, use: 'my-llama' },
    { match: { sensitive: true }, use: 'my-llama' },
    { match: { reasoning: true }, use: 'claude-opus-4-6' },
    { match: { cheap: true, good: false }, use: 'gpt-4.1-nano' },
    { use: 'gpt-4.1-mini' },  // catch-all default
  ],
  policy: {               // base policy for all LLM calls
    temperature: () => 0.7,
  },
});
```

Each `init()` call creates an isolated instance with its own ModelService, so two instances do not share model configuration or caches:

```js
const a = init({ rules: [{ use: 'gpt-4.1' }] });
const b = init({ rules: [{ use: 'claude-sonnet-4-20250514' }] });
await a.filter(items, 'urgent');   // uses gpt-4.1
await b.filter(items, 'urgent');   // uses claude-sonnet-4-20250514
```

The library selects models through ordered pattern-matching rules. Each rule has an optional `match` (capability conditions) and a `use` (model name). The first matching rule wins. A rule's `match` maps capabilities to `true` (must be requested) or `false` (must NOT be requested). Unmentioned capabilities are don't-care.

Consumers express intent as capability objects: `{ fast: true }`, `{ reasoning: true }`, `{ sensitive: true, good: true }`. The value `'prefer'` acts as a soft preference that falls through gracefully when unavailable. Capabilities: `fast`, `cheap`, `good`, `reasoning`, `multi`, `sensitive`.

Sensitive and reasoning capabilities are gated by default — they only match rules that explicitly mention them, preventing sensitive data from reaching cloud models or expensive reasoning models from being selected without opt-in.

Without Redis, caching is disabled and the library operates statelessly.

## Repository Guide

### Quick Links

- [Chains](./src/chains/) - Prompt chains and algorithms based on LLMs
- [Verblets](./src/verblets/) - Core AI utility functions. At most a single LLM call, no prompt chains. 
- [Embedding](./src/embed/) - Local embedding, vector scoring, and semantic state construction
- [Library Helpers](./src/lib/) - Utility functions and wrappers
- [Prompts](./src/prompts/) - Reusable prompt templates
- [JSON Schemas](./src/json-schemas/) - Data validation schemas

## Utilities

### Primitives

Primitive verblets extract basic data types from natural language with high reliability. They constrain LLM outputs to prevent hallucination while handling the complexity of human expression.

- [bool](./src/verblets/bool) - Interpret yes/no, true/false, and conditional statements
- [date](./src/chains/date) - Parse dates from relative expressions, natural language, standard formats, and longer descriptions
- [classify](./src/verblets/enum) - Classify free-form input into exactly one of several predefined options
- [number](./src/verblets/number) - Convert a block of text to a single number
- [number-with-units](./src/verblets/number-with-units) - Parse measurements and convert between unit systems

### Math

Math chains transform values using conceptual reasoning and subjective judgment beyond simple calculations.

- [scale](./src/chains/scale) - Convert qualitative descriptions to numeric values using a specification generator for consistency across invocations
- [calibrate](./src/chains/calibrate) - Build and apply specification-based classifiers with adjustable sensitivity

### Lists

List operations transform, filter, and organize collections. They handle both individual items and batch processing for datasets larger than a context window. Many support bulk operation with built-in retry. Some have single-invocation alternatives in the verblets directory. Several use specification-generators that maintain continuity across batches, or prompt fragments that adapt single-invocation behavior to list processing.

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
- [tags](./src/chains/tags) - Apply vocabulary-based tags to categorize items

### Content

Content utilities generate, transform, and analyze text while maintaining structure and meaning.

- [category-samples](./src/chains/category-samples) - Generate examples ranging from prototypical to edge cases using cognitive science sampling
- [collect-terms](./src/chains/collect-terms) - Find domain-specific or complex vocabulary
- [commonalities](./src/verblets/commonalities) - Identify what items share conceptually, not just literally
- [Conversation](./src/chains/conversation) - Generate multi-speaker transcripts with contextual turn-taking and distinct personas
- [disambiguate](./src/chains/disambiguate) - Determine which meaning of ambiguous terms fits the context
- [dismantle](./src/chains/dismantle) - Break down systems into parts, subparts, and their connections
- [document-shrink](./src/chains/document-shrink) - Compress documents using adaptive TF-IDF scoring while preserving query-relevant content
- [extract-blocks](./src/chains/extract-blocks) - Extract structured blocks from text with windowed parallel processing
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
- [SocraticMethod](./src/chains/socratic) - Progressive questioning dialogue with configurable challenge intensity
- [split](./src/chains/split) - Find topic boundaries in continuous text
- [SummaryMap](./src/chains/summary-map) - Token-budget hash table that compresses values to fit a target size
- [tag-vocabulary](./src/chains/tag-vocabulary) - Generate and refine tag vocabularies through iterative analysis
- [themes](./src/chains/themes) - Surface recurring ideas through multi-pass extraction and merging
- [timeline](./src/chains/timeline) - Order events chronologically from scattered mentions
- [to-object](./src/chains/to-object) - Extract key-value pairs from natural language descriptions
- [truncate](./src/chains/truncate) - Remove trailing content after a semantic boundary
- [veiled-variants](./src/chains/veiled-variants) - Reframe queries through scientific, causal, and soft-cover strategies


### Retrieval

Retrieval utilities transform queries and prepare text for search and RAG (retrieval-augmented generation) workflows. All query-rewriting verblets accept a `divergence` option controlling how far variants stray from the original.

- [embed-rewrite-query](./src/verblets/embed-rewrite-query) - Rewrite search queries for clarity and specificity
- [embed-multi-query](./src/verblets/embed-multi-query) - Generate diverse query variants for broader retrieval
- [embed-step-back](./src/verblets/embed-step-back) - Broaden queries to underlying concepts and principles
- [embed-subquestions](./src/verblets/embed-subquestions) - Split complex queries into atomic sub-questions
- [embed-rewrite-to-output-doc](./src/verblets/embed-rewrite-to-output-doc) - Rewrite a query as if it were the answer document


### Utility Operations

Utility operations handle automatic tool selection, intent parsing, prompt enhancement, and scheduling.

- [auto](./src/verblets/auto) - Match task descriptions to available tools using function calling
- [expect](./src/verblets/expect) - Jest-style AI assertions: `expect(actual).toEqual(expected)`
- [aiExpect](./src/chains/expect) - AI-powered test expectations with source introspection and debugging advice
- [intent](./src/verblets/intent) - Extract action and parameters from natural language commands
- [phail-forge / makePrompt](./src/verblets/phail-forge) - Transform simple prompts into expert-level prompts with precise terminology
- [sentiment](./src/verblets/sentiment) - Classify text as positive, negative, or neutral
- [set-interval](./src/chains/set-interval) - Schedule tasks using natural language time descriptions
- [llm-logger](./src/chains/llm-logger) - Summarize log patterns and detect anomalies across time windows
- [ai-arch-expect](./src/chains/ai-arch-expect) - Validate architecture constraints using AI analysis

### Codebase

Codebase utilities analyze, test, and improve code quality using AI reasoning.

- [scan-js](./src/chains/scan-js) - Examine JavaScript for patterns, anti-patterns, and potential issues
- [test](./src/chains/test) - Generate test cases covering happy paths, edge cases, and error conditions


## Instruction Bundles

All chains and verblets accept instructions as a string or an object with named context. Unknown keys become XML context prepended to the prompt; known keys override internal derivation (skipping expensive LLM calls). This enables pipeline patterns where one chain's derived artifacts feed the next.

```js
// String — unchanged behavior
const scores = await score(articles, 'Rate persuasiveness 0-10');

// Object — text plus named context
const scores = await score(articles, {
  text: 'Rate persuasiveness 0-10',
  domain: 'Political campaign ads',
});

// Known key — reuse a spec from a prior chain, skipping spec generation
const scores = await score(articles, {
  text: 'Rate persuasiveness 0-10',
  spec: priorSpec,
});
```

Capture derived artifacts for reuse with `collectEventsWith`:

```js
import { collectEventsWith, extractEntities } from '@far-world-labs/verblets';

const [entities, { specification }] = await collectEventsWith(
  (onProgress) => extractEntities(doc, 'Extract organizations', { onProgress }),
  'specification',
);

// Reuse — skips the spec generation LLM call
const more = await extractEntities(doc2, { text: 'Extract organizations', spec: specification });
```

Each function exports a `knownTexts` property listing the keys it recognizes.

## Embedding

Embedding utilities provide local vector embedding and a semantic state construction system for building vector representations of structured objects.

### Primitives

- [embed](./src/embed) - Local embedding: `embed`, `embedBatch`, `embedChunked`, `embedWarmup`, `embedImage`, `embedImageBatch`
- [normalize-text](./src/embed/normalize-text) - Normalize text (NFC, whitespace, line endings) for consistent embedding
- [neighbor-chunks](./src/embed/neighbor-chunks) - Expand retrieved chunks with neighboring context
- [score-chunks-by-probes](./src/embed/score-chunks-by-probes) - Score chunk×probe pairs by cosine similarity, sorted by score

### Object Construction

Build multi-projection vector states from text sources using LLM-driven fragmentation and local embedding.

- [embed-object-define](./src/chains/embed-object-define) - Discover projection schema from example texts
- [embed-object-fragment](./src/chains/embed-object-fragment) - Fragment source texts into projection-tagged pieces
- [embed-object-refine](./src/chains/embed-object-refine) - Refine schema using a study set of selected states
- [embed-object](./src/embed/embed-object) - Embed fragments into multi-projection vector states
- [shape-state](./src/embed/shape-state) - Clone and scale projection vectors within states
- [plan-read](./src/embed/plan-read) - Construct read plans from schema defaults or overrides
- [read](./src/embed/read) - Extract scalar property values from states (`read` and `readDetails`)
- [match](./src/embed/match) - Weighted cosine matching across projection vectors

## Library Helpers

Low-level utilities that support chains and verblets. Most are synchronous and make no LLM calls.

- [llm](./src/lib/llm) - Core LLM wrapper with capability-based model selection and structured output
- [context](./src/lib/context) - Config resolution: `nameStep`, `getOption`, `getOptions`, `withPolicy`
- [instruction](./src/lib/instruction) - Instruction normalization: `resolveTexts`, `resolveArgs`, `normalizeInstruction`
- [context-budget](./src/lib/context-budget) - XML context assembler: collect named entries, wrap, join
- [collect-events-with](./src/lib/collect-events-with) - Wrap a chain call and capture derived artifacts from progress events
- [template-builder](./src/lib/template-builder) - Immutable tagged-template prompt builder with named slots
- [prompt-cache](./src/lib/prompt-cache) - Cache LLM prompts and responses
- [retry](./src/lib/retry) - Config-aware async retry
- [parallel-batch](./src/lib/parallel-batch) - Parallel execution with concurrency limits
- [ring-buffer](./src/lib/ring-buffer) - Circular buffer for running LLMs on streams of data
- [progress](./src/lib/progress) - Progress event system: lifecycle tracking, batch progress, event emission

## Contributing

Help us explore what's possible when we extend software primitives with language model intelligence.

## License

All Rights Reserved - Far World Labs
