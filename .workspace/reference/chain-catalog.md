# Chain Catalog
> Generated 2026-02-19 | All 51 chain directories categorized
> Updated 2026-02-19 | Added API surface classification

## API Surface Classification

Based on examining `src/shared.js` (browser+node exports) and `src/index.js` (node-only additions):

- **Public** — exported in `shared.js`, intended for end-user composition (38 chains)
- **Development** — exported node-only in `index.js`, for code analysis/testing (4 chains)
- **Internal** — not exported, helper for other chains or infrastructure (3 chains)

Note: 6 chains are not in `shared.js` but only 4 are in `index.js`. The remaining 3 are truly
internal (conversation-turn-reduce, test-analysis, test-analyzer) — not exported at all.

## Core Data Processing (14 chains — all analyzed & fixed) — all PUBLIC

These are the foundational composition primitives. All have been through
README-to-code analysis and fixes.

| Chain | Purpose | Spec Pattern? | Status |
|-------|---------|---------------|--------|
| map | Transform each item in a list | No | Fixed |
| filter | Keep items matching criteria | No | Fixed |
| find | Find single best item | No | Clean |
| sort | Semantic sorting via tournament | No | Fixed |
| group | Categorize into groups (2-phase) | No | Fixed |
| reduce | Sequential accumulation | No | Fixed |
| score | Rate items 0-1 with calibration | Yes | Fixed |
| entities | Extract structured entities | Yes | Fixed |
| relations | Extract relationship tuples | Yes | Fixed |
| tags | Vocabulary-based tagging | Yes | Fixed |
| scale | Custom scaling functions | Yes | Fixed |
| join | Merge fragments via windowed stitching | No | Fixed |
| split | Insert semantic split-point delimiters | No | Fixed |
| glossary | Extract technical terms | No | Fixed |

## Text Processing & Transformation (6 chains — unanalyzed) — all PUBLIC

| Chain | Purpose | Has README? |
|-------|---------|-------------|
| anonymize | Remove personal style, conceal identity | Yes |
| veiled-variants | Privacy-preserving text alternatives | Yes |
| truncate | Intelligently truncate by scoring content | Yes |
| document-shrink | Shrink while preserving relevance (TF-IDF + LLM) | Yes |
| filter-ambiguous | Score ambiguous words/phrases | Yes |
| dismantle | Break complex systems into component trees | Yes |

## Extraction & Analysis (8 chains — unanalyzed) — all PUBLIC

| Chain | Purpose | Has README? |
|-------|---------|-------------|
| collect-terms | Extract key search terms for retrieval | Yes |
| date | Extract and normalize dates | Yes |
| themes | Reveal key themes, map to sentences | Yes |
| timeline | Extract chronological events | Yes |
| extract-blocks | Extract structured blocks from text | Yes |
| extract-features | Extract multiple features in parallel | Yes |
| detect-patterns | Identify recurring patterns in objects | Yes |
| detect-threshold | Recommend adaptive thresholds | Yes |

## Specialized / Domain (8 chains — unanalyzed) — all PUBLIC

| Chain | Purpose | Has README? |
|-------|---------|-------------|
| category-samples | Generate representative samples per category | Yes |
| central-tendency | Evaluate graded typicality across datasets | Yes |
| intersections | Find overlapping elements between categories | Yes |
| people | Build artificial person profiles | Yes |
| pop-reference | Find pop culture metaphors for sentences | Yes |
| questions | Generate relevant questions from text | Yes |
| socratic | Socratic method questioning | Yes |
| tag-vocabulary | Generate and refine tag vocabularies | Yes |

## Conversation / Interaction (3 chains — unanalyzed) — mixed

| Chain | Purpose | Surface | Has README? |
|-------|---------|---------|-------------|
| conversation | Generate multi-speaker transcripts | PUBLIC | Yes |
| conversation-turn-reduce | Internal helper for conversation | INTERNAL | Yes |
| set-interval | Self-tuning AI workflow scheduler | PUBLIC | Yes |

## Testing / Development (6 chains — unanalyzed) — mixed

| Chain | Purpose | Surface | Has README? |
|-------|---------|---------|-------------|
| test | Analyze code against test criteria | DEVELOPMENT | Yes |
| test-advice | Comprehensive code analysis | DEVELOPMENT | Yes |
| test-analyzer | Analyze test failure logs | INTERNAL | No |
| test-analysis | Test analysis system | INTERNAL | No |
| expect | Intelligent assertions with debugging | PUBLIC | Yes |
| ai-arch-expect | Architectural testing | DEVELOPMENT | Yes |

## Infrastructure (5 chains — unanalyzed) — mixed

| Chain | Purpose | Surface | Has README? |
|-------|---------|---------|-------------|
| list | Generate contextual lists from prompts | PUBLIC | Yes |
| to-object | Repair malformed JSON from LLMs | PUBLIC | Yes |
| summary-map | Auto-resizing hash table for context | PUBLIC | Yes |
| llm-logger | Advanced logging with parallel processing | PUBLIC | Yes |
| scan-js | Internal code analysis (uses sort) | DEVELOPMENT | Yes |

## Classification Summary

| Surface | Count | Chains |
|---------|-------|--------|
| PUBLIC | 38 | All core data processing + text processing + extraction + specialized + conversation, set-interval, expect, list, to-object, summary-map, llm-logger |
| DEVELOPMENT | 4 | test, test-advice, ai-arch-expect, scan-js (node-only exports) |
| INTERNAL | 3 | conversation-turn-reduce, test-analyzer, test-analysis (not exported) |

**Implications**: The 38 public chains need accurate READMEs. The 4 development chains
should have READMEs but they're lower priority. The 3 internal chains don't need public-facing
documentation — their READMEs (if any) are for maintainers only.

## Patterns Observed

**Spec pattern chains** (export `fooSpec` + instruction builders + `createFoo`):
score, entities, relations, tags, scale, anonymize, tag-vocabulary

**Chains that compose other chains**:
- glossary: map + sort
- extract-features: map
- collect-terms: list + score
- scan-js: sort
- central-tendency: map/reduce
- group: reduce + parallel batching

**Class-based chains** (unusual for this codebase):
conversation, expect, to-object (ValidationError)

**Node-only chains** (use fs, child_process, or similar):
test, test-advice, ai-arch-expect, scan-js
