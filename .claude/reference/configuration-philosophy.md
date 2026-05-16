# Configuration Philosophy

Three essays on configuration as a design concern. These are general-purpose thinking — applicable to any system, not specific to this library. They inform the library's option resolution and context systems but do not specify them.

---

## Code Config, Deploy Config, and Runtime Config

Three times of entry into execution, each with different trade-offs.

### Code Config

Application constants, module-level constants, function-level constants.

**Where it works:**
- carefully engineered values
- slow-to-discover values
- hard boundaries
- safe defaults
- values that should pass through code review

**Where it falls short:**
- incident mitigation
- frequent tuning
- values that depend on local context
- settings domain experts should control
- changes that shouldn't require a release

**Trade-offs:**
- changes consume engineering time
- values drift
- non-engineers have limited visibility

### Deploy-Time Config

Environment variables.

**Where it works:**
- operationally critical values (credentials, provider settings)
- stable environment identity
- SRE-owned controls
- emergency overrides when dynamic config is unavailable

**Where it falls short:**
- rapid iteration during incidents
- market response
- fine-grained targeting
- large inventories with unclear ownership

### Runtime Config

Permanent feature flags, database-backed values, KV stores.

**Where it works:**
- fast reaction without deploy
- business/operational role ownership
- scoped changes by tenant/region/host
- deep personalization
- iterative tuning paired with circuit breakers

**Where it falls short:**
- rules operators can't understand
- dynamic logic lacking structure
- free-form editing with minimal validation
- high fan-out with weak visibility

### The Key Shift

Treat configuration as part of the product surface. When configuration stays implicit and buried, decision-making ends up encoded in places that carry it poorly. Ownership becomes fuzzy. The fastest path to action becomes the least visible.

The healthiest pattern:
- code defines boundaries and meaning
- deploy-time config provides emergency and boot posture
- runtime config performs live selection within those boundaries

---

## Context Design

Context is the information presented to a flag or rule so it can choose the right behavior. When the same attributes, values, and variation labels are reused across many flags, environments, and months of change, context becomes a shared vocabulary for runtime decisions.

### Policy Decision and Enforcement Points

Anchor context design to stable places: where the system asks a question (decision point) and where it honors the answer (enforcement point).

**Common boundaries:**
- inbound request start
- job/workflow step start
- capability entry
- UI data boundary

Assemble context once at the boundary where inputs are naturally present, evaluate policy once, carry the result forward.

### Context Attributes as Policy Vocabulary

Treat each attribute as a term in a shared language.

**Aim for:**
- small set of attributes
- low-cardinality values (statuses, tiers, rings, bands)
- `unknown` as an explicit value
- names that stay stable even when signals evolve

**Costly patterns:**
- large objects
- free-form strings
- IDs as foundation
- unstable values

### Adapter Layer

An explicit translation step that turns messy inputs into policy-friendly attributes.

**Four jobs:**
- **normalization** — multiple sources → one concept
- **classification** — raw signals → small categories
- **defaulting** — missing data → explicit `unknown`
- **containment** — implementation details don't leak into governance surface

### Scopes of Meaning

**Three scopes:**
- **flag-local** — one flag/capability
- **domain vocabulary** — shared within a bounded area
- **system-wide** — same meaning everywhere

Make scope visible. Namespaced terms read as domain language (`billingTier`); un-namespaced terms read as universal (`releaseRing`).

### Attribute Classification

Separate attributes by what they represent:

- **observed facts** — informative, not authoritative
- **granted entitlements** — authoritative assertions
- **derived categories** — normalized labels for targeting
- **overrides** — break-glass levers
- **situation** — per-request transient details

Reduces category mistakes.

### Freshness

**Two questions:**
- how stale can this attribute be before real harm?
- if it changes, how quickly must the system reflect it?

Aggregate signals (risk scoring, usage tiers) are cleanest as derived categories with explicit freshness expectations.

### Lifecycle

Context deserves stewardship parallel to release flags. Periodically review attributes, derived categories, and value sets.

- retire what's unreferenced
- consolidate what's unclear
- remove what's repeatedly missing

### Semantic Consistency

The lasting challenge:
- same attribute name across many flags
- same values across environments
- same labels across places
- same vocabulary outliving original rollout

---

## Permanent Flags

### Strategic Options Carried into Runtime

Permanent flags encode enduring strategic options into software, selectable at runtime by responsible roles. The permanence lives in the option set and continuing relevance of the decision, not constant activation. A mode may sleep for months and activate during an incident. A kill switch stays dormant until a dependency fails.

Core requirement: purposeful optionality. Every enduring option should correspond to a recurring trade-off, a recurring distinction among customers/contexts, or a recurring need for rapid response.

**Options span:**
- **implementation selections** — algorithm A/B, provider X/Y
- **operational safety** — read-only mode, fallback routing, circuit-break thresholds
- **resource-shaping** — cache policy, sampling rate, concurrency band
- **policy levels** — moderation strictness, entitlement bands
- **topology** — region routing, data residency, dedicated vs shared

### Identity and Contextual Decisioning

Personalization and company customization are versions of the same mechanism: contextual decisioning. Identity informs core value delivery.

- consumer users care about speed and simplicity
- enterprise buyers care about auditability and dedicated capacity
- regulated organizations care about strict defaults

Permanent flags let the company encode those distinctions into value-delivery machinery.

Policies can generate context: a commercial decision grants entitlements that become inputs to later decisions elsewhere.

### Control Surface Design

**Developer side** — control registry with:
- clear name
- intent
- bounded type
- allowed scopes
- safe defaults
- safe extremes
- policy owner
- engineering owner
- allowed operators

Evaluation through typed facades.

**Precedence:**
- code constraints always apply
- deploy-time overrides for emergency
- dynamic config for normal operation
- compiled defaults fill gaps

**Operator side:**
- **explainability** — effective value, matched rule, source, change history, downstream metrics
- **governance** through delegation with clear responsibility mapping
- **tooling** — simulation, dry runs, blast-radius estimation, staged approvals, effective-state explorers

**Limits:**
- many reshapes are compositional, not reducible to toggles
- each added option increases burden on developers, operators, and analysts
- permanent flags deserve selectivity — they belong where recurring leverage justifies the complexity
