# Process Design Blackboard
> Freeform working surface. Notes, ideas, observations, design fragments.
> Come back to this often. Let patterns emerge.

---

## Simplification: Is It Worth It?

**The veiled-variants test case:** 107 lines → ~45 lines proposed. The 40-line
JSON parsing recovery block disappears entirely when using `response_format` +
`retry` instead of raw chatGPT calls. See `reference/simplification-examples.md`
for the full before/after code comparison.

The simplification isn't cosmetic — it's adopting platform infrastructure that
exists for good reasons (reliability, observability, consistency). The complexity
was compensating for not using the platform.

**Does simplification catch unused imports?** Not currently. The simplify.mjs
script asks the LLM generically. To catch unused imports you'd need AST analysis
(deterministic) or platform-aware prompting (inject "these are shared modules").

**Where to simplify (three categories):**

*Clear wins* — chains not using platform infrastructure:
veiled-variants, collect-terms, conversation, split

*Marginal* — work fine, slightly cleaner possible:
themes (29 lines — adding shared config nearly doubles it), filter-ambiguous

*Don't touch* — already well-structured:
Core chains, spec-pattern chains (scale, entities, relations, tags)

**Risk assessment:** Simplification toward platform conventions is low-risk
because the conventions are well-exercised in 26+ chains. The main risk is
behavioral changes (e.g., veiled-variants' `modelName: 'privacy'` alias).

---

## Cross-Cutting Observations

**Documentation non-linearity.** 26+ chains share config params. Each README
documents them individually or doesn't. Options: link-to-shared, generate
shared sections, or accept duplication. This is a doc architecture decision.
See platform.md "Documentation Architecture" section.

**Code consistency is a platform decision, not N independent fixes.** When
filter/reduce/group/find all use `logger?.info()` instead of lifecycle-logger,
that's one decision to make, not four bugs to fix. The maturity model should
drive "which way do we go" choices. See platform.md competing patterns.

**The `maxRetries` constant.** `constants/common.js` exports it, `retry` imports
it, but chains hardcode `= 3` locally. Probably fine — chains own their defaults.

---

## Script Iteration Notes

### Profiler

*Worked:* Phased execution, idempotent resume, real composition exercise.
Exposed score chain §6 bug, maxTokenBudget defaults, XML stripping.

*Didn't work:* LLM scored everything 8-9/10. Generic profiles.

*Next:* Inject maturity criteria (§1a-§1k levels) as the scoring rubric.
Score against specific levels, not vague "quality."

### Simplifier

*Worked:* Map+reduce composition, per-file output.

*Didn't work:* Generic advice, no platform awareness, no before/after, no
safety assessment.

*Next:* Produce diffs not descriptions. Inject platform conventions so the LLM
says "use retry wrapper" not "enhance error handling." Include risk marking.

---

## Design Fragments

**Maturity model as prompt context.** The dimensions with level descriptions
become machine-consumable analysis criteria. "Here are logging levels 0-4.
What level is this chain? What moves it to the next level?"

**Platform convention catalog.** A checklist analysis tools can consume.
Partly deterministic (AST: does it import retry?), partly semantic (LLM:
are prompts well-structured?). `check-publishability.mjs` does this for READMEs.
Extending to code conventions closes the loop.

**The fractal insight (PoEAA).** Current scripts are transaction scripts.
Watch for: same "inject platform context" step, same "score against criteria"
pattern, same "cross-reference modules" analysis. When 3-4 scripts share
structure, extract. Not before.

---

## Open Threads

- What model alias is 'privacy' in veiled-variants? Still valid/used?
- Maturity model format: resolved — write as clear prose, not data files.
  Scripts inject prose into prompts as spec input.
- Profiler phases 4-6 never completed for full 48-chain run. Re-run when
  scoring improves.
- collect-terms sequential loop → map chain. Worth testing equivalence.
- The simplify script should probably use platform.md as context input.
- Composition/decomposition guidance needed — no top-level doc on when to
  decompose, how to compose, what patterns to prefer. See platform.md
  "Composition & Decomposition Guidance" and questions.md P4.
