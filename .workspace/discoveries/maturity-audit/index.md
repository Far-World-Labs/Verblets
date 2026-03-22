# Maturity Audit Results
> Run: 2026-02-22T06:20:30.210Z | Chains: 50 | Dimensions: 16 | Avg level: 2.0

Chains audited: ai-arch-expect, anonymize, category-samples, central-tendency, collect-terms, conversation, conversation-turn-reduce, date, detect-patterns, detect-threshold, disambiguate, dismantle, document-shrink, entities, expect, extract-blocks, extract-features, filter, filter-ambiguous, find, glossary, group, intersections, join, list, llm-logger, map, people, pop-reference, questions, reduce, relations, scale, scan-js, score, set-interval, socratic, sort, split, summary-map, tag-vocabulary, tags, test, test-analysis, test-analyzer, themes, timeline, to-object, truncate, veiled-variants

## Reading order

1. **scorecards.md** — Start here. Per-chain scorecard grid with design alerts.
2. **strategic-assessment.md** — Portfolio-level: which designs are sound, which need rework.
3. **dimension-updates.md** — Per-dimension gaps. Use to update maturity rubrics.
4. **workspace-updates.md** — Self-assessment quality: rejection rate, breakdown by reason.

## cache/

Phase cache (JSON). Use `--phase N` to resume from any phase. Delete `cache/` to force full re-evaluation.

| File | Phase | What's in it |
|------|-------|-------------|
| 1-gathered.json | 1. Gather | Chain source, imports, exports, metadata |
| 2-prechecked.json | 2. Pre-check | Chains with deterministic ceilings |
| 2-deterministic.json | 2. Pre-check | Findings from deterministic analysis |
| 3-design-findings.json | 3. Design eval | Tier 1 dimension evaluations |
| 4-code-findings.json | 4. Code eval | Code dimension evaluations |
| 5-interface-findings.json | 5. Interface eval | Interface dimension evaluations |
| 6-prompt-findings.json | 6. Prompt eval | Prompt engineering evaluations |
| 7-validated.json | 7. Self-assess | Accepted findings |
| 7-rejected.json | 7. Self-assess | Rejected findings with reasons |
| 8-synthesis.json | 8. Synthesize | Scorecard + strategic assessment text |
