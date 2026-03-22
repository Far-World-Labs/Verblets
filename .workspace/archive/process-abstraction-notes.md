# Process Automation Abstraction — Working Notes
> 2026-02-19 | Thinking through what the "small set of things to maintain" looks like

## The problem shape

Library health automation is a special case of a general problem:
given many pieces of information of varying relevance, assemble the right
context for a task, analyze it, and produce actionable output.

This is the same problem as:
- Client data processing (select relevant notes → analyze → recommend)
- Codebase health (select relevant git/code data → analyze → report)
- Discovery (select relevant sources about a person → synthesize → profile)
- Prompt engineering at scale (score chunks → select → maybe rewrite → assemble)

Steven's framing: "scoring pieces of text/code for use in prompt context,
possibly with doc-shrink, possibly rewriting before/after selection — an
information dependency problem that becomes ever more mature and complex."

## What the library already has

Verblets has primitives for every step of context assembly:
- **score** — rate pieces of text on any criteria
- **filter** — select items matching semantic criteria
- **sort** — rank items by relevance
- **document-shrink** — shrink text while preserving relevance (TF-IDF + LLM)
- **truncate** — intelligently truncate by scoring content
- **summary-map** — auto-resizing hash table for context management
- **map** — transform each piece (rewrite, extract, enrich)
- **reduce** — synthesize across pieces into a single output
- **group** — cluster pieces by type or pattern
- **entities** / **themes** — extract structure from unstructured text

The primitives exist. What's missing is the **composition patterns** — the
reusable ways to wire these together for different questions.

## The abstraction candidates

### Option A: Domain-specific scripts

Each maintenance task gets its own script:
- `check-publishability.mjs` (deterministic)
- `module-profiler.mjs` (semantic, uses map/score/group/reduce/sort)
- `readme-auditor.mjs` (semantic, uses map to compare docs vs code)
- `api-consistency.mjs` (semantic, uses entities/group to find patterns)

**Pro**: Each script is a concrete program, easy to understand and modify.
**Con**: Lots of scripts, each with similar gather→analyze→report structure.

### Option B: Parameterized analysis runner

A single runner that takes:
- **sources** — what to read (modules, git history, tests, docs)
- **lens** — what to look for (quality, consistency, dependencies, risk)
- **depth** — how much to analyze (quick scan, deep analysis, exhaustive)
- **output** — how to format (summary, detailed findings, fix suggestions)

```javascript
await analyze({
  sources: allPublicChains(),
  lens: 'documentation accuracy',
  depth: 'deep',
  output: 'findings-with-fixes'
});
```

**Pro**: One thing to maintain. Composable parameters.
**Con**: Risks becoming a framework. "Lens" is vague — the interesting part
is the specific analysis logic, which this abstracts away.

### Option C: Context assembly pattern

The fundamental operation is:
1. **Gather** — collect candidate information from sources
2. **Score** — rate each piece's relevance for the current question
3. **Select** — choose what fits in the context budget
4. **Transform** — maybe rewrite/shrink selected pieces
5. **Analyze** — run the LLM analysis on assembled context
6. **Act** — produce output (report, fixes, recommendations)

This could be a composable pipeline where each step is a verblets chain:
```javascript
const findings = await pipe(
  gather(allModules),
  score('relevance to documentation quality'),
  select({ budget: 32000 }),
  transform(docShrink),
  analyze('find discrepancies between docs and code'),
  group('by fix type')
);
```

**Pro**: Composable. Each step is a verblets primitive.
**Con**: `pipe` is a framework in disguise. And the interesting decisions
(what to score, how to select, what to analyze) are in the parameters,
not in the structure.

### Option D: Module profile as the unit of work

Everything operates on **profiles** — structured descriptions of a module's
state. A profile captures both mechanical (AST-extracted) and semantic
(LLM-analyzed) properties.

The operations are:
- **snapshot()** → profile[] — capture current state
- **audit(profiles, conventions)** → findings[] — compare against rules
- **enrich(profiles, question)** → profiles — add semantic analysis
- **diff(profiles_a, profiles_b)** → changes[] — what changed

```javascript
const profiles = await snapshot(allModules);
const enriched = await enrich(profiles, 'documentation accuracy');
const findings = await audit(enriched, conventions);
const report = await summarize(findings);
```

**Pro**: Clear data model. Profiles are the lingua franca.
**Con**: Four functions to maintain. "Conventions" needs a data format.

## What I'm leaning toward

None of these feel right yet. Let me think about what Steven actually does:

1. He writes a new chain or changes one
2. He wants to know: does it fit? Is it consistent? Is it documented?
3. He returns after time away and wants: what changed? what needs attention?
4. He's ready to publish and wants: is this coherent? what's missing?

These are **questions asked of the codebase**. The abstraction might be:
"a system where you can ask a question of the codebase and get a
well-sourced answer."

The key operations for that:
- **Index**: Know what exists and how to find it (mechanical)
- **Retrieve**: Gather relevant pieces for a question (score + select)
- **Analyze**: Answer the question from gathered context (LLM)
- **Ground**: Connect findings back to specific files/lines (mechanical)

This is essentially RAG over a codebase, but with verblets as the
processing layer instead of vector embeddings.

## The information dependency angle

Steven noted this "will become ever more mature and complex." What does
that mean concretely?

Today: "Is the map chain's README accurate?" → gather map's source + README → compare.

Tomorrow: "Is the map chain's README consistent with how glossary and
extract-features use it?" → need map's own docs AND the usage patterns
in downstream chains.

Later: "Has the map chain's behavior changed in ways that break
assumptions in downstream chains' READMEs?" → need git diff of map's
source + all downstream chain docs.

The dependency graph matters more and more over time. The "index" step
becomes the critical abstraction — knowing not just what exists but
what depends on what.

## Finding from the profiler: score chain's input domain problem

While building the module profiler, discovered that the `score` chain's
`scaleSpec` generates a scoring rubric that sometimes assumes the wrong
input domain. When asked to score "documentation quality" of module profiles,
the spec described its expected input as "a numerical score ranging from
1 to 5" — expecting numbers as input, not text to evaluate.

`applyScore()` works correctly (single item, direct prompt). But the
map-based path (`mapInstructions` + `map`) fails because the double-framing
(map's "Transform each item" + score's "Apply this specification") confuses
the LLM.

This is relevant to the abstraction: **the spec pattern works best when
the input domain is clear and narrow**. When the input is heterogeneous
(module profiles with varying structure), direct prompting is more reliable
than spec-based scoring. The spec pattern is for well-defined domains
(rate these products, score these essays) not for ad-hoc analysis.

## Concrete next step

Rather than designing a framework, build a second composition script
that solves a different question — then look for the shared structure.

The module profiler asks: "what's the quality state of each chain?"
The next script could ask: "what's the dependency health of the library?"
— which chains depend on which, are those dependencies stable, are the
interfaces between them consistent?

If two scripts share enough structure, the abstraction will be obvious.
If they don't, then domain-specific scripts (Option A) is the right answer.

## Steven's feedback on iteration direction (2026-02-19)

Three key points:

**1. Transaction Script → composable functions (PoEAA)**
The current profiler is a transaction script: one big main() with 6 sequential phases.
That's fine for now. As processing logic gets more nuanced, refactor toward
smaller composable functions. Don't jump to higher-order functions prematurely.
The evolution is: hardcoded phases → extracted phase functions → composable
pipeline functions → possibly higher-order composition.

**2. Results aren't good enough yet**
The profiler's staged approach is good for idempotency and steering, but:
- Code is too verbose relative to signal and flexibility
- Results are too generous (48 chains scored 8-9/10 — clearly wrong)
- Need to iterate until results are consistently accurate and useful
- Consider all quality areas, speed, flexibility

**3. Platform-awareness is the hard problem**
Processing dimensions in isolation misses the platform context. Examples:
- A documentation pass that doesn't notice "this code should use
  `lib/lifecycle-logger` instead of ad-hoc logging" is incomplete
- A code quality pass that doesn't notice "shared config parameters appear
  in 30 chains but this README doesn't mention them" is incomplete
- Documentation might need to be non-linear when optional shared concerns
  (retry, progress, logging) show up everywhere
- There's always a "platform" lens — individual module quality can't be
  assessed without considering the platform as a whole

This connects to the maturity model: the dimensions (§1a-§1j) interact.
The "Shared Infrastructure Usage" table in maturity.md encodes some of
this platform knowledge, but the processing scripts don't consume it yet.
The next iteration should make platform context available to analysis passes.

## What "iterate to good results" means

Current state:
- Profiler: generous LLM scores, generic profiles. Didn't surface concrete
  findings like "veiled-variants calls chatGPT without retry" or "sort uses
  process.env instead of lib/env"
- Simplifier: generic advice ("refactor long functions"), no codebase-aware
  findings

What "good" looks like:
- Profiler scores that correlate with actual maturity (measured against §1a-§1j)
- Findings that reference specific shared infrastructure gaps
- Cross-module findings ("these 12 chains are missing onProgress")
- Recommendations that are platform-aware ("adopt lib/lifecycle-logger")

The maturity model dimensions + shared infrastructure tables could be
injected into analysis prompts as context. The LLM would then score
against specific criteria rather than vague "quality."
