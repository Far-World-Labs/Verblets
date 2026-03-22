# Chains

Chains orchestrate multi-step AI workflows — batching, retries, progress tracking, and multi-call reasoning. They build on [verblets](../verblets/) for individual operations and [library utilities](../lib/) for infrastructure. For implementation patterns and config system details, see [DESIGN.md](./DESIGN.md).

## Configuration

All chains accept a config object with model selection and tuning parameters:

```javascript
const result = await chainName(input, instructions, {
  llm: { fast: true, good: true },  // capability-based model selection
  temperature: 0.7,                   // response randomness
  maxTokens: 1000,                    // maximum response length
  maxAttempts: 3,                     // retry attempts (resolved by retry)
  onProgress: (event) => {},          // progress callback
});
```

Model selection accepts a string shorthand (`'fastGoodCheap'`), a capability object (`{ fast: true, cheap: true }`), or a full config (`{ modelName: 'model-key' }`). Capability keys: `fast`, `cheap`, `good`, `reasoning`, `multi`, `sensitive`.

## Collection Instruction Builders

Several chains (scale, score, entities, tags, relations) export instruction builder functions that compose their specifications with collection chains. This lets you build a specification once and apply it across `map`, `filter`, `reduce`, `find`, or `group`:

```javascript
import { map, filter, scoreSpec, scoreMapInstructions, scoreFilterInstructions } from '@far-world-labs/verblets';

const spec = await scoreSpec('Rate persuasiveness 0-10');

// Score every item
const scores = await map(articles, scoreMapInstructions({ specification: spec }));

// Keep only high-scoring items
const best = await filter(articles, scoreFilterInstructions({
  specification: spec,
  processing: 'Keep items scoring 8 or above',
}));
```

Each builder accepts `{ specification, processing? }` and returns a string instruction suitable for the corresponding collection chain. See [build-instructions](../lib/build-instructions/) for the full pattern.

## List Operations

Transform, filter, and organize collections with parallel batch processing.

- [filter](./filter) — Keep items matching natural language criteria
- [find](./find) — Return the single best match with early stopping
- [map](./map) — Transform each item using consistent rules
- [reduce](./reduce) — Combine items sequentially into an accumulator
- [sort](./sort) — Order by complex criteria using tournament comparisons
- [group](./group) — Cluster items by discovering categories then assigning members
- [score](./score) — Rate items on multiple weighted criteria
- [tags](./tags) — Apply vocabulary-based tags to categorize items
- [entities](./entities) — Extract names, places, organizations, and custom types
- [relations](./relations) — Extract relationship tuples from text
- [intersections](./intersections) — Find overlapping concepts between item pairs
- [central-tendency](./central-tendency) — Find the most representative examples
- [detect-patterns](./detect-patterns) — Identify repeating structures or sequences
- [detect-threshold](./detect-threshold) — Find meaningful breakpoints in numeric values
- [filter-ambiguous](./filter-ambiguous) — Flag items that need human clarification

## Content Processing

Generate, transform, and analyze text while preserving structure and meaning.

- [list](./list) — Extract lists from prose, tables, or generate from descriptions
- [split](./split) — Find topic boundaries in continuous text
- [join](./join) — Connect text fragments with transitions
- [extract-blocks](./extract-blocks) — Extract structured blocks with windowed processing
- [document-shrink](./document-shrink) — Compress documents with adaptive TF-IDF scoring
- [truncate](./truncate) — Remove content after a semantic boundary
- [to-object](./to-object) — Extract key-value pairs from natural language
- [glossary](./glossary) — Extract key terms and generate definitions
- [themes](./themes) — Surface recurring ideas through multi-pass extraction
- [collect-terms](./collect-terms) — Find domain-specific vocabulary
- [disambiguate](./disambiguate) — Determine which meaning fits the context
- [dismantle](./dismantle) — Break down systems into parts and connections
- [tag-vocabulary](./tag-vocabulary) — Generate and refine tag vocabularies iteratively
- [timeline](./timeline) — Order events chronologically from scattered mentions

## Conversation & Dialogue

- [Conversation](./conversation) — Generate multi-speaker transcripts with distinct personas
- [conversation-turn-reduce](./conversation-turn-reduce) — Compress conversation history
- [SocraticMethod](./socratic) — Progressive questioning with configurable challenge intensity
- [questions](./questions) — Generate branching follow-up questions

## Creative & Generative

- [category-samples](./category-samples) — Generate examples from prototypical to edge cases
- [people](./people) — Build artificial person profiles with consistent traits
- [pop-reference](./pop-reference) — Match concepts to cultural touchstones
- [veiled-variants](./veiled-variants) — Reframe queries through scientific, causal, and soft-cover strategies
- [fill-missing](../verblets/fill-missing) — Predict content for redacted or corrupted sections

## Math & Scoring

- [scale](./scale) — Convert qualitative descriptions to numeric values
- [calibrate](./calibrate) — Build specification-based classifiers with adjustable sensitivity
- [probe-scan](./probe-scan) — Scan items for relevance using embedding similarity

## Data Structures

- [SummaryMap](./summary-map) — Token-budget hash table that compresses values to fit a target size

## Testing & Development

- [aiExpect](./expect) — AI-powered test expectations with source introspection
- [ai-arch-expect](./ai-arch-expect) — Validate architecture constraints using AI analysis
- [scan-js](./scan-js) — Examine JavaScript for patterns and issues
- [test](./test) — Generate test cases for code
- [llm-logger](./llm-logger) — Summarize log patterns across time windows
- [test-analysis](./test-analysis) — Vitest reporter with AI-powered failure analysis
- [test-advice](./test-advice) — Multi-category code analysis (boundaries, defects, best practices)
- [test-analyzer](./test-analyzer) — Diagnose test failures with AI-generated fix suggestions

## Scheduling

- [date](./date) — Parse dates from natural language and relative expressions
- [set-interval](./set-interval) — Schedule tasks using natural language time descriptions
