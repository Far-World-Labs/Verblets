# Maturity Audit Results
> Run: 2026-02-20T15:21:41.737Z | Chains: 13 | Dimensions: 16 | Avg level: 1.8

Chains audited: anonymize, dismantle, document-shrink, entities, expect, filter, group, llm-logger, map, reduce, score, sort, test-analysis

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
