# Error Policy

How chains handle anomalous input, partial state, and failed work. Governs when to throw, when to degrade, when to accept silently.

---

## Pragma

- **include:** input validation policy, partial-work outcomes, severity vocabulary, signaling channels, decision criteria
- **exclude:** retry mechanics (see retry library), provider negotiation, abort-signal mechanics

---

## Three Categories

Anomalies share the runtime but differ by source. Treat them separately.

| Source | Examples | Default response |
|---|---|---|
| **Caller-config error** | enum value not in valid set; `must` constraint targets nothing; out-of-range option; constraint references nonexistent dimension | Throw at the chain boundary |
| **External-service failure** | LLM rejected, network blip, signal evaluation threw | Respect `errorPosture`; surface via `emitter.error` |
| **Liberal-input acceptance** | non-string list items, undefined ctx, missing optional fields | Silent — accept and proceed |

The smell to avoid: silently turning a caller-config error into graceful degradation. Hard constraints in the call shouldn't soften because the chain found a way to limp forward.

---

## Severity Vocabulary

The codebase has a layered lexicon in `src/lib/progress/constants.js`. Use it consistently.

**`Outcome`** — what the chain finished doing
- `success` — every input honored, every output produced
- `partial` — some items in a batch succeeded, others didn't (under `errorPosture: resilient`)
- `degraded` — produced a complete-shaped result, but caller intent was partially unmet (e.g., a constraint couldn't be applied; some signal evaluations failed but enough remained to proceed). Use when there are no per-item slots and `partial` doesn't fit.
- Throw — even `degraded` would be dishonest; no defensible answer exists

**`Level`** — severity hint on log-shaped events: `debug` / `info` / `warn` / `error`. Orthogonal to `Kind`.

**`ErrorPosture`** — caller's policy for partial failures: `strict` (throw on first failure) / `resilient` (continue, signal failures via undefined slots and Outcome).

These compose: `errorPosture: resilient` + 7 of 10 items succeed → `Outcome.partial` + the 3 failed slots emit `chain:error` telemetry events.

---

## Decision Criteria

When a chain encounters anomalous state, choose by intent:

### Throw if
- Required input is malformed, missing, or maps to nothing the chain can act on.
- Hard contracts (enum values, `must` signals, required dimensions) cannot be satisfied.
- All work failed and no defensible degraded result exists ("all 10 items failed", "no signals available to arbitrate").
- Continuing would silently substitute fabricated data for real input.

### Continue + emit error event + report `Outcome.partial` if
- Some items succeeded, others didn't, and `errorPosture: resilient` is in effect.
- The chain produced a positionally-aligned result with `undefined` for failed slots.

### Continue + emit error event + report `Outcome.degraded` if
- The chain produced a complete-shaped result, but caller intent was partially unmet.
- Use when there are no per-item slots — the whole result is best-effort.

### Continue silently if
- Input was passed liberally and the chain naturally handles it (non-string items, undefined ctx, optional fields absent).
- The "anomaly" is the documented graceful path (empty list → empty result, single signal → no LLM mediation).

---

## Boundary Validation

Validate at the chain entry. After validation, trust the state internally — don't repeat checks mid-flow.

- Required parameters: throw if missing or wrong type.
- Enum / closed-set values that are *contracts*: throw if the caller passes a value outside the set. Examples: signal `strictness`, `allowedTools` categories, dimension names referenced by constraints.
- Cross-references: throw if one parameter references another and the reference doesn't resolve (constraint targets nonexistent dim, must value not in values array).
- Range constraints: throw if numeric options are outside meaningful ranges.

### Optional Tuning Knobs Are an Exception

Option mappers that translate intensity dials (`low` / `med` / `high`) to internal configuration follow a different convention: **unknown values fall back to the default silently.** This includes the `mapXxx` family in chains (`mapEffort`, `mapStrictness`, `mapAnchoring`, `mapAdvice`, etc., enforced by `src/lib/test-utils/mapper-contracts.spec.js`).

The distinction is intent: a tuning knob is a hint about preferred behavior; an unrecognized value just means "use the default tuning." A contract is a structural promise; an unrecognized value means the caller's intent can't be honored. Tuning knobs degrade silently; contracts throw.

If a tuning value comes from user-facing input where typos matter, validate at the input layer (CLI parser, config loader) rather than at the mapper.

---

## Signaling Channels

Three channels exist; use them according to structural shape, not duplicating across.

- **`emitter.error(err, meta)`** — paired with throws. Emits a `chain:error` telemetry event so observers see failures even when callers swallow exceptions.
- **`emitter.emit({ event: 'phase' | domain-specific, ... })`** — domain decisions and meaningful state transitions. Use for documenting silent-but-noteworthy paths (e.g. `event: 'value-arbitrate:must-signal-evaluation-failed'`).
- **Optional `config.logger` calls** — human-readable warnings when an emitter event isn't expressive enough. Always probe `logger?.warn`/`logger?.info`/`logger?.error`; never require a logger.

When a chain skips a hard constraint or silently accommodates malformed input, emit a domain event capturing the decision so consumers can audit silent paths without changing chain flow.

---

## Strictness Modifiers Override Chain Posture

When a parameter carries an explicit strictness modifier (e.g. `strictness: 'must'` on a value-arbitrate signal, `required: true` on a schema), that modifier overrides the chain's `errorPosture`. A `must` signal that fails to evaluate must throw even in resilient mode — the strictness modifier is a contract on the caller's part, not a hint.

---

## Corrective Notes

- **Liberal accept ≠ silent degrade.** Postel's law applies to *input shape* (multiple representations of valid intent), not to *semantic mismatch* (caller said X, X means nothing here).
- **Resilient ≠ best-effort fabrication.** Under `errorPosture: resilient`, signal failures via undefined slots and Outcome — don't synthesize plausible defaults.
- **Returning `candidates[0]` (or any fabricated default) when no information is available is a smell.** If there's no basis for the result, throw.
- **Outcome must not lie.** Don't report `Outcome.success` when constraints couldn't be honored or some inputs were dropped; use `degraded` or throw.

---

## Anti-patterns

- Mid-flow defensive defaults (`x ?? 0`, `arr ?? []`, `Math.max(0, x)`) papering over upstream malformedness — push validation to the boundary.
- Silent fallback to first/last/default candidate when constraints can't be honored — fail or surface degraded explicitly.
- Catching errors and returning empty strings/arrays without emitting telemetry — produces results indistinguishable from genuine empty outputs.
- Returning a value-shaped result while reporting `Outcome.success` when some inputs were silently dropped.
