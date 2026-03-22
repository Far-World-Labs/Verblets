# Publishability Analysis: README-to-Code Alignment
> 2026-02-19 | Manual analysis across 13 chains

## Method

Read both README and source code for 13 chains. Compared documented API (parameter names,
defaults, return types, behavioral claims) against actual implementation. Classified
discrepancies by type and recommended fix location.

## Systematic Findings

### 1. Instruction builder parameter naming (affects 4 chains)

**Pattern**: Every chain with instruction builders (score, entities, relations, scale)
documents them with chain-specific parameter names (`scoring`, `entities`, `relations`,
`scaling`) but the code uniformly uses `specification`.

**Chains affected**: score, entities, relations, scale

**Fix applied**: Updated all four READMEs to use `{ specification, processing }`.

**Meta observation**: This happened because the builders were documented before the
parameter name was standardized. A convention in CLAUDE.md now prevents recurrence.

### 2. Shared config systematically undocumented

**Pattern**: `llm`, `maxAttempts`, `onProgress`, `now`, `logger` appear in 10-16 chains
but no README documented them all. Each README either omitted them or documented a
different subset.

**Fix applied**: Created shared configuration reference in `src/chains/README.md`. Chain
READMEs now reference it for common params and only document chain-specific config.

### 3. `batchSize` vs `chunkSize` naming inconsistency

**Pattern**: The batching library (`src/lib/text-batch/`) uses `batchSize`. Some chain
READMEs document `chunkSize`. Some chains (sort, glossary, themes, central-tendency) use
`chunkSize` in their own config for chain-specific chunking (not the same as batch size).

**Decision**: `batchSize` for LLM batching (how many items per API call). `chunkSize` is
acceptable for chain-specific text chunking (how many characters/items per processing unit)
when it's a different concept from batch size.

### 4. Critical README errors

**disambiguate**: README described a completely different API. Documented `(text, instructions)`
signature, code uses `({ term, context })`. Documented return type `string`, code returns
`{ meaning, meanings }`. Multiple documented parameters don't exist. All examples incompatible.
**Fixed**: Complete rewrite.

**split**: README said return type is `Array<string>`, code returns a single `string` with
delimiters embedded. `maxSegments` and `preserveFormatting` parameters documented but never
implemented. **Fixed**: Complete rewrite.

**score**: Documented `returnTuple` config option that doesn't exist. Examples use wrong
parameter names for instruction builders. **Fixed**: Complete rewrite.

### 5. Phantom features

Features documented in READMEs that don't exist in code:
- `score`: `returnTuple` config option
- `split`: `maxSegments`, `preserveFormatting` config options
- `disambiguate`: `preserveOriginal`, `highlightChanges`, `contextWindow` config options
- `entities`: "strings with attached specification property" claim for instruction builders

### 6. Hidden behaviors

Significant behaviors in code that READMEs don't mention:
- `entities` default export regenerates specification on every call (expensive)
- `reduce` wraps array `initial` values as `{ items: array }` when no `responseFormat` given
- `sort` has `selectBottom` parameter affecting result order
- `split` uses `temperature: 0.1` and `fastGoodCheapCoding` model
- `map` auto-calculates batch size from model context window
- `filter` has batch skipping for oversized items

## Chains Analyzed

| Chain | Issues Found | Severity | Fixed? |
|-------|-------------|----------|--------|
| map | 7 | High | Yes |
| filter | 8 | High | Yes |
| score | 9 | High | Yes |
| entities | 7 | High | Yes |
| sort | 4 | Medium | Yes |
| group | 4 | Medium | Yes |
| reduce | 7 | High | Yes |
| relations | 5 | High | Yes |
| tags | 5 | Medium | Yes |
| disambiguate | 6 | Critical | Yes |
| scale | 3 | High | Yes |
| join | 3 | Medium | Yes |
| split | 5 | High | Yes |
| glossary | 3 | High | Yes |

## Remaining Work

All 14 analyzed chains have been fixed. Chains not yet analyzed: anonymize,
conversation, date, detect-threshold, dismantle, document-shrink, extract-blocks,
extract-features, find, intersections, list, people, pop-reference, questions,
socratic, themes, timeline, to-object, truncate, veiled-variants, category-samples,
central-tendency, collect-terms, detect-patterns, filter-ambiguous.

## What This Analysis Suggests

The recurring pattern — documentation written at one point, code evolving separately — is
a structural problem. One-time fixes help now but drift will return unless there's ongoing
verification.

The principle "AI produces deterministic automation" applies here: this analysis used AI
(Claude reading both files) to discover the rules. Those rules should become deterministic
checks that run without AI:

1. **Parameter name extraction** from source code is mechanical (AST parsing with parse-js-parts)
2. **Claim extraction** from READMEs could be partially mechanical (regex for parameter tables)
3. **Comparison** of the two is where it gets semantic — but many checks can be deterministic
   (e.g., "does the README mention every exported function?")
4. **The spec-generation pattern** is itself amenable to verification: if a chain exports
   `fooSpec` and `fooInstructions`, the README should show the specification workflow

A good first deterministic check: for every chain, extract exported function names from code
and verify each appears in the README. This catches the `extractEntities` and `getMeanings`
missing-export issues mechanically.
