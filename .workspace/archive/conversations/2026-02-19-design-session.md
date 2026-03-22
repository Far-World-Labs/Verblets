# Design Session: Claude Integration + Discovery Architecture
> 2026-02-19 | First collaboration session

## What we set out to do

Explore how Claude should integrate with verblets. Started from the question: "How would Claude ideally integrate with verblets?" Ended up designing a collaborative workspace and running discovery spikes.

## Key decisions made

1. **Not MCP** — wrapping verblets as tools destroys composability. Claude writes verblets compositions instead.
2. **`.workspace/`** — shared directory for AI-human collaboration. Files as state. Inspectable, deletable, version-controllable.
3. **Discovery-driven automation** — the loop is: content → artifacts → designs → automation.
4. **Conversation as primary interface** — surface findings interactively, keep bulk data in files.
5. **Privacy as structure** — derived files track provenance. Delete the source, derived artifacts follow.

## Core insight: Verblets as intelligence platform

LLMs are as much functions as they are people. Verblets treats them as composable functions:
- `sort(items, "by strategic importance")` — semantic comparator
- `filter(items, "keep only genuinely surprising findings")` — semantic predicate
- `map(items, "translate to actionable recommendations")` — semantic transform

The intelligence isn't in any single LLM call. It's in the composition — how semantic functions wire together to produce understanding that no single call has.

## Discovery script learnings (3 iterations)

### What works
- `group`: Reliable categorization even on terse data
- `filter`: Good at pattern matching with semantic understanding
- Mechanical analysis (git data crunching) produces genuinely useful data
- Per-area rework rates, era comparison, velocity charts — real signal

### What doesn't work
- `themes` on terse input (commit messages) → word fragments
- Single `reduce` asking for "insight" → corporate platitudes
- `map` with small batches → items merge into single response
- Asking LLM to propose automations → hypothetical fantasies

### The right composition pattern
Generate many → score/sort by what matters → filter ruthlessly → surface the best.
Intelligence through selection and ranking, not through asking the LLM to be wise.

## Blog post connections

### "Making Space for AI" (Nov 2023)
- Structured data generation as core innovation
- Configuration as state (declarative > procedural for AI)
- Anti-corruption adapters (queue AI changes for approval)
- Constrained generation (verblets' JSON schemas)
- Principle of least surprise, reversibility, visibility

### "Modeling with Text Embeddings" (Dec 2023)
- Multi-perspective embeddings (same data, different instruction lenses)
- Semantic control flow (vector similarity for program branching)
- Property-level vectors (not whole-object embeddings)
- Embedding-based joins across semantic spaces

## The real goal

"Publishing a coherent, ever-updated, always sharply tuned to good ideas version of verblets."

Quality embedded in architecture, not maintained by discipline. The ideas person focuses on ideas; the system ensures coherence, documentation, API consistency, test coverage.

## Open threads

- Fix JSON imports across codebase (40+ files need `with { type: 'json' }`)
- Professional services automation at LaunchDarkly (solutions architects, APIs, context data, policies)
- OpenClaw patterns to extract for verblets
- Integrate richer data sources (LinkedIn, blog, company docs)
- The "generate many → rank → filter → surface" composition pattern needs a real exercise
- Reactive file-based updates (crude `make`-style: check if inputs newer than artifacts)

## Technical artifacts

- `.workspace/` — shared workspace with context.md, scripts/, discoveries/
- `.workspace/scripts/register-json.mjs` — loader hook for bare JSON imports
- `.workspace/scripts/discover.mjs` — v3 discovery script
- Three discovery outputs in `.workspace/discoveries/`
