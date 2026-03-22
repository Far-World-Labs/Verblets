# §1c Documentation

## Levels

| Level | Description |
|-------|-------------|
| 0 | No README |
| 1 | README exists with basic description |
| 2 | API section with parameter table, shared config reference, one example |
| 3 | Accurate API docs, multiple examples, behavioral notes, integration examples |
| 4 | Comprehensive: architecture section, edge cases, performance notes, composition guidance |

## Publishability checker results (latest run)

`node .workspace/scripts/check-publishability.mjs` — deterministic, no LLM.

| Status | Count |
|--------|-------|
| Clean | 23 |
| Issues | 28 |
| High-severity | 19 |

**High-severity issues** are undocumented exports (consumers can't discover
the API). Worst offenders:
- anonymize — 8 undocumented exports (spec, instruction builders, factory)
- veiled-variants — 3 undocumented exports (prompt variants)
- expect — 2 undocumented exports (aiExpect, expectSimple)
- llm-logger — 2 undocumented exports (initLogger, createHostLoggerIntegration)
- category-samples — 2 undocumented exports (prompt builder, list function)
- central-tendency — 1 undocumented export (retry wrapper)

**Low-severity issues** are undocumented config params (consumers use
defaults unknowingly) and missing shared config references.

**Missing READMEs entirely:** test-analysis, test-analyzer (Internal tier —
acceptable per centrality targets).

## Observations

- 14 READMEs analyzed and fixed in previous publishability pass.
- 23 clean shows progress; 19 high-severity shows remaining work.
- Shared config (llm, maxAttempts, onProgress, now, logger) documented
  inconsistently across READMEs. See platform.md "Documentation Architecture."
- Non-linear documentation needed for cross-cutting shared concerns.
- The most common issue is "uses shared config params but doesn't reference
  shared configuration docs" — nearly every chain with issues has this.
