# Verblets — What It Is

---

## The Core Move

Natural language is an interface here. Not a wrapper around an API, but the primary input channel — with the same weight as a function signature. You hand a sentence to a function and get structured data back. The sentence is the API.

But that's the pitch. The real identity is in how the system makes that contract *trustworthy*. Three things hold it up: a schema convention that guarantees typed output from free-form input, a two-tier architecture that separates fragile single calls from resilient orchestration, and a library of prompt-building functions that structure what the LLM actually sees. The language-as-interface idea is only as strong as those three supports.

---

## The Typed Output Bridge

The most load-bearing convention in the system is one most users never see. Every function that calls an LLM passes a JSON schema alongside the prompt. The LLM is constrained to respond in that shape. Then the system auto-unwraps the response: a schema with a single `items` array returns the array directly; a schema with a single `value` property returns the value directly. The caller gets a string, a number, an array of objects — not a wrapper.

This means the function signature can be honest. `bool(text)` returns a boolean. `entities(text, spec)` returns an array of entities. The schema does the work of making language-as-interface produce *typed* output, and the auto-unwrap makes the types clean at the callsite.

When parsing fails, the system throws — deliberately. This lets retry wrappers re-attempt the LLM call. Every function that uses structured output gets retry resilience for free, without writing any error handling. The convention carries the behavior.

This is the bridge. Without it, every function would need its own parsing, its own error handling, its own type coercion. With it, 40+ functions share one mechanism and the contract holds.

---

## Two Tiers, Not Two Speeds

The system separates single-call functions (verblets) from multi-call orchestrators (chains). But the old way of describing this — "verblets are fast, chains are slow" — misses what actually differs.

**Verblets are stateless.** One prompt, one schema, one LLM call, one typed result. No retries. No accumulated context. If they fail, they fail completely and immediately. This is a feature: the failure surface is exactly one call, so the caller always knows what happened and can decide what to do.

**Chains are stateful.** They accumulate context across multiple LLM calls and make decisions based on what happened in previous calls. A socratic chain feeds each answer back into the next question. A document-shrink chain scores chunks with TF-IDF, asks the LLM to refine edge cases, then compresses based on combined scores. A conversation chain decides which speaker goes next based on the dialogue so far.

Chains don't just add patience. They add *adaptive behavior* — the ability to change what they do next based on what they've learned. The retries and progress tracking are infrastructure; the real difference is state-driven orchestration. Some chains make genuinely complex multi-step decisions that no single LLM call could replicate. Others (the collection family) are more mechanical — they batch and parallelize a single operation across many items. Both are chains, but they're chains for different reasons.

---

## The Spec/Apply Instinct

Six chains discovered the same shape independently: **generate a specification once, apply it many times**. Build a scoring rubric, then rate items against it. Define a type taxonomy, then extract entities with it. Create anonymization rules, then redact by them.

The specification is a reusable artifact — inspectable, cacheable, shareable. The expensive judgment call happens once; the repetitive application is cheap. This is the system's strongest opinion about how LLMs should be used for batch operations.

Each of these six also exports five instruction builders — pure functions that format a specification into prompt text suitable for map, filter, reduce, find, or group operations. This is composability through convention: no shared base class, no framework, just six things that chose to present the same surface because the problem demanded it. A seventh chain that follows the pattern can do so by reading the existing ones, not by extending anything.

---

## The Prompt Workshop

The `prompts/` directory is 24 modules and 120+ string constants that most descriptions of the system completely ignore. They shouldn't be ignored. They're how the system actually talks to LLMs.

These aren't string templates. They're functions — ranging from one-liners (`asEnum` formats an enum into a choice prompt) to multi-section assemblers (`sort` composes criteria, content, ordering, and fix sections with semantic XML tags). They compose: higher-level prompt functions import constants and wrapping utilities from lower-level ones. `wrapVariable` smart-switches between XML tags (for multiline content) and quotes (for inline), and half the other prompt functions use it.

The prompt modules are where the system's prompt engineering knowledge lives as reusable code. Format directives for JSON output. Techniques for list generation. Patterns for intent classification. Style control with tone, vocabulary, and structure modifiers. These are the accumulated decisions about *how to instruct an LLM well*, extracted into composable functions instead of being buried inside individual chains.

The prompt shaping layer (markers, pieces, routing) is the new effort to manage prompts as structured data. The prompts/ directory is the older, more battle-tested effort to manage prompts as composable functions. They serve different purposes but both exist because the system takes prompt construction seriously enough to build infrastructure for it.

---

## Collections as Higher-Order Language

Map, filter, reduce, find, group, sort, join — the familiar collection operations, but the predicate is a sentence. "Keep items related to healthcare." "Group by emotional tone." "Sort by persuasiveness."

The `.with()` pattern makes these pipe-friendly: `map.with('extract the key insight', { llm })` returns a unary async function that transforms a single item. This is how you compose chains in a pipeline without managing config at every step.

For spec/apply chains, `.with()` is async — it generates the specification eagerly so that subsequent applications are cheap. For collection chains, `.with()` is synchronous — it captures the instructions and defers all LLM work to invocation time. The difference matters for composition but is invisible at the callsite.

---

## The Config Convention

Every async function in the system takes `(input, config = {})` and destructures `{ llm, maxAttempts, onProgress, abortSignal, ...rest }`. This is the most pervasive pattern in the codebase and it determines what composition feels like.

`llm` can be a string (`'fastGood'`), a capability object (`{ fast: true, good: 'prefer' }`), or a full model config. It flows through every call. `onProgress` receives structured events with step names, batch indices, and completion percentages — chains emit progress at batch boundaries and phase transitions. `abortSignal` propagates cancellation. `...rest` spreads to downstream calls, so config layers naturally: a chain can add its own options without blocking anything the caller passes.

The convention means you can wrap any function in another function and forward the config. You can build middleware. You can intercept progress events. You can cancel a deep chain from the top. This isn't glamorous, but it's the connective tissue that makes 130+ exports feel like one system instead of 130 independent functions.

---

## Generation and Extraction

The system does both, and the distinction matters more than either one alone.

**Extraction** pulls structured data from unstructured text. The type extractors (bool, number, date, enum) are almost mechanical — the LLM is being used as a fuzzy parser. The spec/apply chains (entities, relations, tags) are more sophisticated — they define what to look for, then find it. These are the system's most mature and most used functions.

**Generation** creates novel content from instructions. People, category samples, questions, veiled variants — these take a description and produce things that didn't exist before. The questions chain is particularly interesting: it generates questions, lets you pick interesting ones, then generates deeper questions about those — an iterative exploration tree with no source text to extract from.

The system doesn't prefer one over the other. It houses both because both are cases where natural language is the right interface: "extract all medical entities" and "generate 30 vegetables spanning the typicality spectrum" are both sentences that produce typed structured output. The typed output bridge doesn't care whether the data was extracted or generated.

---

## Prompt Shaping — The New Layer

> Full detail in [`prompt-shaping.landscape.md`](./prompt-shaping.landscape.md). Progressive explainer for pieces & networks: [`bundle-graph.landscape.md`](./bundle-graph.landscape.md).

The project has two independent prompt systems. The **Prompt Workshop** (`src/prompts/`) is 24 modules and 120+ constants — the battle-tested prompt engineering knowledge used by every verblet and most chains. The **Prompt Shaping Layer** (markers → pieces → routing algorithms → AI operations) provides pure building blocks for treating prompts as structured data objects with named inputs and routing tags.

They don't compete. The workshop is write-once construction ("here's how to format a sort prompt"). The shaping layer provides data structures and algorithms for a separate UI project that builds networks of prompt invocations with self-adapting qualities. Pieces declare inputs with routing tags; routing algorithms derive edges and execution order from tag matching; five AI operations advise on structure and tag assignments. The library provides pure functions — the app manages its own instance state, networks, and execution.

The shaping layer exists for external consumers. No chain or verblet manages its own prompt using it.

---

## The Test-Analysis Subsystem

Buried inside chains/ is a 40+ file subsystem with its own architecture: processors, collectors, views, intent handlers, a coordinator, a reporter, schemas, and utilities. It's the largest single piece of the system by far.

It exists because the system wanted to use AI to analyze its own test output — to understand test failures, suggest fixes, detect patterns across test suites. It grew its own internal structure because the problem was large enough to need one. It's worth knowing about because it's where the system's ambitions went furthest beyond "call an LLM and parse the result."

---

## What's Actually Emerging

**Prompt-as-data.** The markers/pieces/routing layer treats prompts as structured objects with routing tags. It exists for a separate UI project that builds self-adapting prompt networks. The system's own chains don't use it.

**The advisor pattern.** Five AI operations — piece advisors (`promptPieceReshape`, `promptPieceProposeTags`) and tag advisors (`promptTagSource`, `promptTagReconcile`, `promptTagConsolidate`) — return advisory proposals instead of applying changes. All five share a `createAdvisor` factory that extracts the repeated config/progress/retry/callLlm skeleton; each advisor only provides its system prompt, schema, and a `buildParts` function. `testAdvice` does something similar for test results. This is a family of AI functions that help you decide rather than deciding for you.

**Convention as architecture.** Six spec/apply chains, seven collection chains, 130+ exports all following the same config convention — the system builds coherence through repeated voluntary agreement rather than enforced inheritance. This is a genuine design identity, not an accident, and it's worth protecting. The cost is that new additions must learn the conventions by reading; the benefit is that nothing is constrained by a base class's assumptions.
