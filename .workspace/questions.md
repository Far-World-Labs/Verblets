# Questions for Steven
> Prioritized. Resolve and delete as we go.

## Decisions (blocking or shaping work)

**D3. What's moving in the other worktree? (§8)**
Affects whether code changes on this branch are worth doing. README-only
fixes are safe regardless, but platform conformance fixes (like veiled-variants
simplification) touch source code.

**D4. API key appears expired — full audit run fails with 401**
`map` chain silently swallows per-item auth errors (returns unparseable
results), while `reduce` throws immediately. This means you can burn through
all 4 eval phases producing 0 findings before the error surfaces in phase 8.
Two things to address: (1) refresh the key, (2) should `map` fail-fast on
auth errors instead of returning silent garbage?

**D5. Config param duplication: audit vs check-publishability**
`SHARED_CONFIG_PARAMS` and `INTERNAL_PARAMS` are copy-pasted between
`check-publishability.mjs` and `audit-shared.mjs`. If these drift, the
audit and publishability checks will disagree on what's "shared" vs
"chain-specific." Should they live in one shared place?

## Design direction (would benefit from your perspective)

**P1. Documentation architecture: link-to-shared vs self-contained READMEs?**
26+ chains share config params. Current: `src/chains/README.md` has shared
config reference, individual READMEs link inconsistently. Your "non-linear"
comment suggests you have a sense of what good looks like here.

**P3. Inline logging vs lifecycle-logger for core chains?**
map uses `createLifecycleLogger`. filter/reduce/group/find use `logger?.info()`
inline. Both work. Picking one and being consistent matters more than which
one wins. Leaning toward: inline is fine for simple chains, lifecycle-logger
for multi-phase chains. Your call.

**P4. Where should composition/decomposition guidance live?**
You asked (Q1): "what notes/blackboard/design doc are we tracking to explore
this general verblets decomposition problem?" Currently scattered:
platform.md has Composition Patterns (spec/apply, instruction builders,
factories), blackboard.md has design fragments. No single place for
top-level guidance on when to decompose, how to compose, what patterns
to prefer. Should this be its own design doc, or grow in platform.md?

## Things to glance at when you have a moment

- `archive/runs/profiler/3-scored.json` — Full 48-chain profiler output.
  Scores are generous (8-9/10 across the board) which confirms the prompts
  need maturity criteria injected. The data structure is sound though.
- `reference/simplification-examples.md` — veiled-variants before/after.
  Is this the kind of evidence that would make you comfortable with
  simplification as a regular activity?
- `blackboard.md` — Process design observations. Evolving, not polished.

## Resolved

**D1. Does the maturity model (maturity/) feel right?**
Yes — folder structure works. Write clearly as spec input, not data files.
Keep granular areas like §1h/§1i. Grow organically.

**D2. Does platform.md capture what you meant?**
Yes, with adjustment: simplification doesn't feel like a platform concern.
Remove from platform-level discussion.

**P2. Should the maturity model be machine-consumable?**
No — "data files rarely prime for good output." Write maturity as clear
prose that scripts can inject into prompts as spec input.
