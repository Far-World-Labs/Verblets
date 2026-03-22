# Priorities

Numbered backlog. Reference items by §ID. Ordered by what unblocks the most.

## §1 Define verblets maturity model

A framework for rating codebase areas across multiple quality dimensions.
Each area (chain, verblet, lib module) gets maturity targets based on centrality.

**Dimensions (levels 0-4 defined in `maturity/`):**
- §1a Logging — lifecycle logger, structured events, correlation
- §1b Events/callbacks/lifecycle — onProgress, phase/batch events via progress-callback
- §1c Documentation — README, API reference, examples, composition guidance
- §1d Browser/server — isomorphic design, lib/env usage, environment adaptation
- §1e Testing — example tests, unit tests, aiExpect/ai-arch-expect
- §1f API surface — exports, shared config, instruction builders, spec pattern
- §1g Code quality — dead code, naming, separation of concerns
- §1h Composability — spec/apply split, instruction builders, factory functions
- §1i Prompt engineering — asXML usage, prompt builders, system prompts, multi-stage pipelines
- §1j Token/cost management — createBatches, maxTokenBudget, budgetTokens
- §1k Errors & retry — retry strategy, failure modes, error vocabulary, assertions, observability

**Centrality tiers:**
- Core (map, filter, sort, score, group, reduce, entities) — 3-4 on all dimensions
- Standard (31 other public chains) — 2-3 on critical dimensions, 1+ on others
- Development (test, test-advice, ai-arch-expect, scan-js) — 2 on docs/testing, 1+ on others
- Internal (conversation-turn-reduce, test-analysis, test-analyzer) — 1 on code quality, 0 acceptable elsewhere

**Status:** Draft v3 in `maturity/`. Folder structure with 11 dimensions (§1a-§1k). Steven reviewed Q1-Q5: maturity feels like spec input (write clearly, not as data files), keep §1h/§1i granular, errors/retry (§1k) is deep with many sub-concerns. Prompt engineering file is most substantive. Logging file expanded with test pipeline architecture.

## §2 Analyze + fix remaining ~28 chain READMEs

14 done, ~28 remain. Deterministic checker identifies issues.
Run: `node .workspace/scripts/check-publishability.mjs`

**Status:** Fresh checker run: 23 clean, 28 with issues, 19 high-severity. Blocked on §8 (parallel refactor question) for code-touching fixes. README-only fixes could proceed.

## §3 Composable code simplification

Adapted from Anthropic's [code-simplifier](https://github.com/anthropics/claude-plugins-official/blob/main/plugins/code-simplifier/agents/code-simplifier.md) prompt, merged with CLAUDE.md conventions. Implemented composably via verblets chains (map + reduce), not as a skill.

Script: `.workspace/scripts/simplify.mjs`
Run: `node .workspace/scripts/simplify.mjs --path src/chains`

**Status:** Script built and tested. Initial results on 3 files show 5/10 scores. Analysis quality needs better prompting — currently gives generic advice rather than specific findings.

## §4 Module profiler composition exercise

Verblets composition that uses map→score→group→sort→reduce to semantically profile all chain modules. First real exercise of the library as a composition platform.

Script: `.workspace/scripts/module-profiler.mjs`
Run: `node .workspace/scripts/module-profiler.mjs`

**Status:** Complete. Full 48-chain run finished. Results in `discoveries/profiler/`.

**Findings:**
- score chain's `scaleSpec` generates wrong input domain for ad-hoc analysis (§6)
- `maxTokenBudget` default (4000) is too low for large items — must pass explicitly
- Map's XML list output needs stripping before feeding to downstream scoring
- Profiler scores uniformly high (LLM was generous) — the maturity model dimensions (§1a-§1j) are more useful for measuring real gaps than LLM-scored profiles

## §5 Process automation abstraction

The right abstraction may be the maturity model (§1) + measurement scripts.
Rather than a framework, build specific compositions (profiler, simplifier, publishability checker) and let shared structure emerge.

Notes: `discoveries/process-abstraction-notes.md`

**Status:** Working notes. Waiting for more compositions to identify shared patterns.

## §6 Score chain: spec generation assumes wrong input domain

When `score` is asked to rate "documentation quality" of text profiles, `scaleSpec` generates a rubric expecting numeric input, not text to evaluate. `applyScore()` works correctly; the map-based path fails. This limits score's usability in ad-hoc analysis pipelines.

**Status:** Worked around in profiler by using map directly. Root fix would be in scaleSpec.

## §7 parse-js-parts crash on re-export patterns

`scanFile` crashes on `export { foo } from './bar.js'` where declaration is null. Pre-existing bug. Workaround: try/catch in scripts.

**Status:** Workaround in place. Low priority.

## Conversations needed

### §8 Parallel refactors on verblets (non -1 worktree)

What's moving in the other worktree? Affects whether code/README fixes on this branch are worth doing.

### §9 Process automation direction

§1 (maturity model) + §5 (abstraction) need Steven's input on which level feels right. The maturity model approach seems promising — define levels, measure against them, track progress per area.

## Backlog

- §10 Extract patterns from OpenClaw — file-based memory, channel adapters, skill system
- §11 Richer data sources for discovery — LinkedIn, blog posts, multi-perspective
- §12 Professional services automation — client data processing at scale (separate repo)
- §13 Reactive file-based workspace updates — make-style staleness tracking
- §14 Map batching with small inputs — investigate merged-response problem at prompt level
