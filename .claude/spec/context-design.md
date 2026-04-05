# Guidelines for Context Design

Context is the information you present to a flag or rule so it can choose the right behavior. In the simplest use cases, context can be minimal: a subject key and a couple of attributes, such as country or platform. The design questions arise when the same attributes, values, and variation labels are reused across many flags, environments, services, and months of change. At that point, context stops being "data you pass in" and becomes a shared vocabulary for runtime decisions.

---

## Start where decisions are made and where results must be enforced

Context design is easiest when anchored to stable places in the system:

- A **policy decision point** is where the system asks a question (which variation applies? what mode are we in? what limits should apply?).
- A **policy enforcement point** is where the system must actually honor the answer (deny access, apply limits, choose a route, change behavior).

Use dependency injection and your codebase's middleware patterns to retrieve and make context inputs available with minimal friction.

### Common decision/enforcement boundaries across architectures

- At the start of an inbound request (API gateway, middleware, handler boundary) where tenant identity, auth claims, and routing details often come together.
- At the start of a job or workflow step (worker boundary) where job type, queue, and requested resources are available.
- At entry to a capability (checkout flow, export flow, admin action) where the semantics of "what's about to happen" are clearest.
- At a UI data boundary (data-loading layer / container boundary) where user/session/device facts are assembled before UI behavior fans out.

Endeavor to assemble context once at the boundary where the relevant inputs are naturally present, evaluate policy once, and carry the result forward to the code that enforces it.

### Considerations

- Don't force data across encapsulation boundaries just to satisfy a "standard set" of attributes. If a decision point cannot reliably supply an attribute, policies built on it will be fragile.
- Much of the data people wish they had at runtime (especially telemetry and aggregates) is hard to fetch safely in the hot path. Often only transactional data or request-local signals are readily available. When you truly need analytic signals, integrate them intentionally (for example by producing a derived category with an explicit freshness expectation), rather than trying to pull raw analytics directly into every decision.

---

## Treat context attributes as policy vocabulary

Teams often start by passing whatever user/device/request fields happen to be convenient. Over time as rules couple to these properties and values, it becomes hard to change the rules or the data, and rules can end up being harder to read and maintain than intended.

Instead, treat each attribute as a term you are adding to a shared language, and each value as part of that language. Choose words you're willing to support over time.

### Aim for the following

- A small set of attributes
- Values with low and predictable cardinality (statuses, tiers, rings, bands)
- `unknown` as an explicit value when you can't classify reliably
- Names and meanings that stay stable even if underlying signals evolve

### What tends to become costly

- Large objects and free-form strings
- IDs (useful as exceptions, risky as a foundation)
- Unstable values (perhaps user-supplied values)

Cross-cutting behavior is behavior that influences more than one feature or code path. These dimensions benefit from consistent language because they recur, spread, and persist over time.

---

## Use an adapter layer so policy sees clean data

Most systems have messy, shifting inputs: headers, claims, device properties, partial user profiles, service-specific metadata, and inconsistently available fields. Context design improves dramatically when there's an explicit translation step that turns these inputs into policy-friendly attributes. You might think of this as an anti-corruption layer.

This layer typically does four jobs:

- **Normalization**: multiple raw sources become one stable concept.
- **Classification**: raw signals become small categories that are safe to target.
- **Defaulting**: missing data becomes explicit (`unknown`) rather than silently absent.
- **Containment**: implementation details don't leak into the governance surface.

---

## Decide scopes of meaning

A context attribute can be meaningful only in one corner of a system, or it can be a system-wide concept. Confusion comes from treating those as the same thing.

Three scopes cover most systems:

- **Flag-local vocabulary**: meaningful only for one flag or one narrow capability.
- **Domain vocabulary**: shared language within a bounded area (billing, search, onboarding, admin).
- **System-wide vocabulary**: intended to have the same meaning everywhere it appears.

You don't need to force everything into system-wide terms. The goal is simply to make scope visible, so people don't assume universality where it doesn't exist. Namespacing can be a practical signal:

- Namespaced terms often read as domain language (`billingTier`, `searchPosture`).
- Un-namespaced terms often read as "we intend this to mean the same thing everywhere" (`releaseRing`, `supportStatus`).

---

## A lightweight attribute classification

When context grows, it helps to separate attributes by what kind of thing they represent. Many systems borrow this idea from access-control and policy engines, but you don't need formalism to benefit from the separation.

One useful lens:

- **Observed facts**: what the system sees at runtime (informative, not authoritative).
- **Granted entitlements**: what an authority asserts (admin grant, plan, contract).
- **Derived categories**: normalized labels meant for policy targeting.
- **Overrides**: explicit coordination or break-glass levers.
- **Situation**: per-request or per-run details (channel, job type, deploy ring).

The value here is that it reduces category mistakes. Observed facts can be spoofed or missing. Entitlements and overrides should be treated as authoritative. Situation is transient: useful for routing and posture, usually not something you want to treat as identity.

---

## Start from a diagnosis, then make a few strong choices

As context and variations grow, it becomes tempting to offer a wide menu of fields and states "just in case." That's how you get governance surfaces that are powerful but hard to operate: too many degrees of freedom, too many combinations, unclear intent.

A steadier approach is to begin with a concrete diagnosis of what actually shapes decisions in your system: user or company types, compliance boundaries, cost or latency sensitivity, reliability posture, customer coordination. Design a small number of decisive choices that concentrate control where it has leverage.

### Patterns that tend to work

- Prefer a few high-leverage distinctions over long lists of options.
- Make it easy for rules to widen or narrow access as conditions change (progressive rollout is a form of "widening," incident mitigation is often "narrowing").
- Reduce variability over time: once you learn what matters, retire dead distinctions and collapse redundant ones.

This is as much a design problem as an implementation problem: the vocabulary should reflect the constraints that actually shape outcomes.

---

## Prefer stable, token-like value sets over raw measurements

When policies target raw values directly (exact versions, long strings, unbounded categories), rules become brittle. A more durable approach is to have policies target stable labels -- token-like values -- whose mapping can evolve behind the scenes.

Examples:

- `supportStatus` = `supported` | `unsupported` | `unknown`
- `releaseRing` = `canary` | `early` | `general`
- `riskClass` = `low` | `medium` | `high`

The mapping that produces these categories can improve as you learn, minimizing how often rules need to be rewritten.

---

## Treat variation values as promises about behavior

Variation values are more than just configuration data. As the primary tokens for control of the application, variation labels are promises about behavior that the code must execute to enforce policies.

If a variation value says `degraded`, the effect on the system should be similar everywhere it is consumed. This matters most when the output is broad (cross-cutting) or effectful.

### Common output "effect shapes"

- **Gate**: allow/deny (or enable/disable with a safe fallback)
- **Mode**: a small set of operating postures (`normal` / `constrained` / `degraded`)
- **Route**: choose an implementation/provider/path
- **Budget**: caps and limits (timeouts, concurrency, size)
- **Decision object**: a compact structured token bundling other values for decision coherency

A wrapper can provide a structured output shape for the benefit of consuming code, much like LaunchDarkly does with `variationDetail`. A compact decision object can carry:

- a decision (allow/deny),
- a mode (normal/degraded),
- limits (timeouts/caps),
- obligations (must-enforce items),
- reason codes (for explainability and debugging).

That decision can come from one flag, from multiple flags that are composed behind a wrapper, or some other composition of dynamically generated configuration. The important part is that consuming code treats the result as a single promise and enforces it as a unit.

---

## Make multiple signals coherent

Once you have more than one relevant signal in families that often occur together (entitlements, eligibility categories, overrides, operating posture, budgets), you need a way to combine them coherently.

### Precedence (what wins when signals disagree)

Common strategies include:

- Most restrictive wins (deny overrides)
- Explicit allow wins (permit overrides)
- First applicable (ordered precedence)
- Only one applicable (treat overlap as an error)

Different systems choose differently. What matters for context design is that the inputs make the merge intelligible:

- Overrides are clearly recognizable and narrowly scoped.
- Entitlements are authoritative and hard to confuse with observation.
- Derived categories are stable, so precedence doesn't depend on fragile raw values.

If multiple flags contribute to one effective behavior, centralize the merge logic in one place and make the merge rule explicit. Otherwise, "composition" happens implicitly through scattered conditionals, and it becomes very difficult to reason about system-wide behavior.

### Operating modes (keeping many decisions consistent)

A simple way to reduce inconsistency is to define a small set of operating modes/postures that deliberately coordinate multiple behaviors.

Why it helps:

- It prevents partial or mixed states ("feature is on but its safety limits aren't").
- It makes response faster: one change yields a predictable set of effects.
- It makes review easier: stakeholders reason about "what mode are we in?" instead of inferring intent from many flags.

Example:

- `posture = degraded` implies a coherent set of behaviors:
  - `search = off`
  - `writeMode = readOnly`
  - `timeoutMs = conservative`

Modes and precedence work well together: a mode can be one of the top-level signals that sets defaults across multiple decisions, while specific entitlements or overrides can selectively widen or narrow behavior within that posture.

---

## Keep naming conventions simple and consistent

Naming does a lot of work to keep systems understandable. A small set of conventions can make rules readable and reduce category confusion.

If helpful certain kinds of "signal words" can be used to differentiate attribute types:

- **Observed facts**: `observed*`, `reported*`, `detected*`
- **Derived categories**: `*Ring`, `*Status`, `*Tier`, `*Band`, `*Class`
- **Entitlements**: `allow*`, `can*`, `enable*` when it is a grant
- **Overrides**: `force*`, `lock*`, `emergency*`
- **Situation**: `request*`, `session*`, `job*`, `deploy*`

The goal is that someone scanning a rule can tell what kind of attribute it is without reading additional documentation.

---

## Freshness concerns belong to the data feeding context

You can evaluate flags frequently if you want to. The harder question is how current the inputs are that inform the policy.

Two questions usually clarify what matters:

- How stale can this attribute be before it causes real harm?
- If it changes, how quickly do you need the system to reflect the change?

This shows up most in job/event systems and in entitlement-like controls, where the cost of being out of date can be meaningfully different from feature rollout decisions.

If a decision truly depends on aggregate signals (risk scoring, abuse heuristics, usage tiers), it's usually cleaner to treat those as derived categories produced by a deliberate pipeline with an explicit freshness expectation. When you need more complex update patterns, hybrid transactional/analytical database techniques can help, but it's typically best to keep runtime context itself as small, stable categories.

---

## Adopt a lifecycle mindset

One quiet risk of runtime policy is that it stays in the system long after people have stopped thinking about it. Release flags often come with an explicit lifecycle to prevent that. Context deserves similar stewardship because context is the language those flags operate on.

A release-flag lifecycle might look like:

- New
- Active (serving multiple variations)
- Launched (serving the same variation for a period)
- Inactive (eligible for removal)
- Archived
- Deleted

Context elements benefit from a parallel mindset:

- Attributes, derived categories, value sets, and the adapter logic that produces them should be periodically reviewed for continued usefulness.
- If an attribute is no longer referenced by any rules, it's a candidate for retirement.
- If a derived category has proliferated values or unclear meaning, it's a candidate for consolidation.
- If an attribute is repeatedly missing at key decision points, it may be better modeled differently (or removed).

This keeps the vocabulary coherent across services and time, reduces forgotten surface area, and makes outcomes easier to explain.

---

## Keep semantic consistency with cross-cutting names

It can be challenging to make context names and values mean the same thing from flag to flag. Context design is ultimately about semantic consistency across repetition:

- the same attribute name appears in many flags,
- the same values appear across environments,
- the same variation labels show up in multiple places,
- the same vocabulary outlives the original rollout that introduced it.
