# Context

What I know about Steven and the verblets project. Correct anything that's wrong.

## Steven

- Self-identifies as an ideas person
- Day job: Solutions architecture at LaunchDarkly (feature management platform)
  - Professional services for large software companies
  - Work involves APIs, data processing, context data, policies, runtime configuration, roles
  - Wants to scale this with AI automation for solutions architects
  - Has many small notes, spreadsheets/catalogues tracking clients, patterns, solutions
- Values composability, clean interfaces, minimal engineering
- Cares about DX and NFR-adherence for published surfaces (respects users deeply)
- Interested in human augmentation over replacement
- Uses Emacs, likes org-mode's fractal structure
- Appreciates GTD (but not dogmatic about it)
- Appreciates criticism, dislikes flattery, values conciseness
- Cares about privacy — systems should make deletion mechanical, not policy
- Company/org: Far World Labs (personal projects)
- Has a blog (farworldlabs.com), LinkedIn (commenting shows focus areas)

### Blog posts (reveal thinking patterns)
- "Making Space for AI" (Nov 2023): AI generates structured data → constrain with schemas → make changes visible/reversible → anti-corruption adapters → embed quality in architecture. Coined "automorphing design" for context-aware UIs.
- "Modeling with Text Embeddings" (Dec 2023): Multi-perspective embeddings → same data viewed through different instruction-tuned lenses → semantic control flow → property-level vectors on entities → embedding-based joins across semantic spaces.

### How new ideas come about
- Analogies to existing CS concepts
- Writings that surface patterns (blog posts)
- Motivated by what many people find useful (e.g., OpenClaw's popularity)
- Flashes of insight, often related to problems being solved
- Current focus: scaling professional services + understanding OpenClaw patterns

### Broader project ecosystem
- gravv: distributed media management (uses verblets, Kafka, Postgres)
- opus: Python/FastAPI AI processing worker (transcription)
- tasky: Python task queue API (SQS, Postgres, multi-tenant)
- tree-ops: high-performance hierarchical tree storage (FastAPI, 50k+ depth)
- functional: pure functional JS utility library (compose, pipe, stats, vectors, BigInt math)
- verblets-apps: CLI tools scaffold (empty)
- verblets-docs: Astro docs site (empty)
- Tried CCPM (elaborate PM system) in verblets-2 — set up but never used

## Project: Verblets

- AI-powered functions that accept natural language instructions
- 17 verblets (atomic, single LLM call), ~49 chains (orchestrators), ~40 lib utilities
- Uses OpenAI-compatible API via fetch, Redis caching
- Recent evolution: chatgpt→llm rename, provider abstraction, model catalog
- Isomorphic design goal (browser + Node.js)
- Strong code quality rules in CLAUDE.md
- JSON imports fixed: all 46 bare imports now use `with { type: 'json' }` for Node 22+ ESM

## Learnings from discovery script exercises

### What verblets is good at
- group: Categorization works well, even on terse data
- filter: Pattern matching at scale with semantic understanding
- Mechanical data processing: batching, consistent scoring, chunked extraction

### What verblets is NOT good at (in pipeline scripts)
- Synthesis/insight generation: LLMs default to safe corporate platitudes
- themes on terse input: Produces word fragments, not real themes
- Broad synthesis prompts: "Find the tension" → generic. Better to ask about specific data.

### Key composition lesson
- Verblets processes, conversation synthesizes
- Use LLM calls to interpret SPECIFIC data points, not to generate wisdom
- Surface structured data clearly, let the human draw conclusions
- map returns XML-wrapped items — needs stripping or different approach

## Publishability findings (2026-02-19)

Analyzed 14 chain READMEs against source code. All 14 have been fixed. Key patterns found:
- Instruction builders all use `{ specification, processing }` — 4 READMEs had chain-specific names
- Shared config (`llm`, `maxAttempts`, `onProgress`, `now`) was systematically undocumented
- 3 chains had critically wrong READMEs (disambiguate, split, score)
- Phantom features documented that never existed in code
- Hidden behaviors in code that READMEs didn't mention

Created shared config reference in `src/chains/README.md`. Added conventions to CLAUDE.md.
~25 chains still unanalyzed. See `.workspace/discoveries/publishability-analysis.md`.

## Open questions

- Who else uses verblets?
- What are the specific professional services pain points (can't discuss details here)
