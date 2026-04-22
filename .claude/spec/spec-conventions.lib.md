# Spec Conventions — This Library

System-specific spec guidance for verblets. Read [spec-conventions.md](spec-conventions.md) first for the general methodology.

Governs alignment *across* spec families. Individual specs define their own timeless/impl split via pragma sections.

---

## Spec Families

Specs belong to a family by naming convention — the prefix groups them.

### LLM Integration (`llm.*`)

State what the abstraction guarantees to callers. The response contract (structured output unwrapping, `value`/`items` extraction) is a shape declaration — callers depend on it. Provider negotiation is capability-based, not name-based. Corrective notes against direct-API-call assumptions: callLlm is the only sanctioned path.

### Chains and Verblets (`composition.*`)

The single-call constraint for verblets is an invariant. Chains own retry, recovery, and multi-step orchestration — this boundary is load-bearing. The specification pattern (generate a scoring spec, then apply it) is a recurring composition worth its own decision criteria. Batch processing constraints (error isolation per item, progress per batch, resumability) apply uniformly. Instruction normalization (string or object with text + named context) is the shared entry contract.

### Embedding (`embedding.*`)

Local-first is a constraint — SentenceTransformer, not API calls. Multi-projection is the core concept: one source, multiple vectors through different lenses. The object construction lifecycle (define → fragment → embed → shape → read) has defined stages. RAG query rewriting strategies are decision alternatives with selection criteria, not an inventory to enumerate. Corrective notes against single-vector assumptions and against treating embedding as an API call.

### Progress and Events (`progress.*`)

Three event kinds (event, operation, telemetry) are a taxonomy. OTel alignment is structural (traceId, spanId, parentSpanId) — state alignment points and divergence. The emitter is a runtime surface: automations query their own recent events for decisioning. This is a corrective note against log-only observability.

### Instruction and Prompt (`instruction.*`)

Instruction normalization is the entry contract. Known keys override internal derivation; unknown keys become XML context. This enables pipeline composition where upstream stages inject context consumed downstream. Corrective notes against prompt-as-string assumptions.

### Automation (`automation.*`)

State what the framework must support, not what particular automations do. Fresh-data is the default posture. The three storage domains (local, automation, domain) have different scopes and lifetimes — confusing them is the most common error. Run history is selective. Corrective notes against script-like assumptions.

---

## Corrective Notes

Where this library diverges from common patterns. State these in relevant specs — this list ensures consistency.

- **No null** — undefined at boundaries (JSON, Redis, LLM responses)
- **Single LLM call** for verblets — one call, no async forks, no retry
- **Local-first embedding** — SentenceTransformer, not API calls
- **Capability-based selection** — rules match capabilities, not model names; first match wins; gated capabilities only match when explicitly requested
- **Isomorphic** — all modules work in browser and Node.js; non-portable modules excluded from bundling
- **Error philosophy** — fail fast for critical config, log and continue for optional, graceful degradation for external; verblets crash in ways orchestrators can recover from
- **Instruction normalization** — string or object with text + named context; entry contract, not optional sugar
- **No framework** — raw functions, explicit composition, named pure utilities over inline idioms

---

## Current Specs

| File | Family | Layer |
|------|--------|-------|
| `automation.md` / `.impl.md` | Automation | Timeless / Impl |

### Relocated

| File | Destination | Reason |
|------|-------------|--------|
| `config-types.md`, `context-design.md`, `permanent-flags.md` | `reference/configuration-philosophy.md` | General essays, not system-specific specs |
| `automations/eventing-quality.md` / `.impl.md` | `docs/automations/` (within `.claude/`) | Per-automation spec, not system-level |

### Coverage gaps

Ordered by how much complexity they'd reduce.

| Area | Family | Why |
|------|--------|-----|
| callLlm, providers, structured output | `llm.md` | Core contract every module depends on; unknown unknowns without it |
| Multi-projection, object lifecycle, RAG | `embedding.md` | Non-obvious lifecycle; single-vector assumptions cause bugs |
| resolveTexts, resolveArgs, context assembly | `instruction.md` | Shared entry contract; easy to get wrong silently |
| Emitter, event kinds, OTel alignment | `progress.md` | Runtime surface confused with logging |
| Capability matching, rules, gating | `llm.selection.md` | First-match-wins with gated capabilities is surprising |
| parallelBatch, error isolation, sizing | `composition.batch.md` | Same pattern in every chain; inconsistency creeps in |
| Generate spec → apply pattern | `composition.spec-pattern.md` | Recurring composition, decision criteria undocumented |

### What should not become specs

- Individual chain/verblet behavior — module READMEs and DESIGN.md
- Specific prompt templates — changes too frequently
- Test conventions — guidelines/
- Code style — CLAUDE.md and linter
