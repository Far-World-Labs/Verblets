# .workspace

Shared workspace for AI-human collaboration on verblets.

- **Read, edit, or delete anything** — nothing here is precious
- Reference items in `priorities.md` by §ID (e.g., "about §3")

## Active (current focus)

- `priorities.md` — Numbered backlog, reference by §ID
- `maturity/` — Maturity model: `index.md` for overview, one file per dimension (§1a-§1k). Grow organically.
- `platform.md` — Shared utilities, competing patterns, design guidance
- `blackboard.md` — Process design surface: observations, ideas, open threads
- `questions.md` — Prioritized questions for Steven (resolve and delete as we go)

## Reference (lasting knowledge)

- `system.md` — What we're building, how it works, our agreements
- `context.md` — What Claude knows about Steven and this project
- `reference/chain-catalog.md` — All 51 chains: purpose, pattern, API surface
- `reference/publishability-analysis.md` — README-to-code analysis findings
- `reference/simplification-examples.md` — Before/after code comparisons

## Scripts (tools, run on demand)

- `scripts/maturity-audit.mjs` — 9-phase maturity audit: gather → evaluate → self-assess → synthesize. Split across `audit-shared.mjs`, `audit-gather.mjs`, `audit-evaluate.mjs`, `audit-assess.mjs`, `audit-output.mjs`. Output: `discoveries/maturity-audit/` (see `index.md` there for guide)
- `scripts/check-publishability.mjs` — Deterministic checker (no LLM)
- `scripts/module-profiler.mjs` — Semantic profiler via map→score→group→sort→reduce
- `scripts/simplify.mjs` — Code simplification via map+reduce
- `scripts/publishability.mjs` — LLM-based publishability analysis
- `scripts/discover.mjs` — Discovery script (early, may retire)

## Archive (superseded, kept for provenance)

- `archive/discoveries/` — Dated discovery run outputs (v1, v2, v3)
- `archive/runs/` — Profiler and simplification run outputs
- `archive/conversations/` — Session summaries
- `archive/process-abstraction-notes.md` — Superseded by blackboard.md + platform.md
