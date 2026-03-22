# Verblets Maturity Model

## Levels

| Level | Meaning |
|-------|---------|
| 0 | Absent — not addressed |
| 1 | Present — basic, may not follow conventions |
| 2 | Consistent — follows project conventions |
| 3 | Thorough — comprehensive, documented edge cases |
| 4 | Exemplary — reference implementation |

## Centrality Tiers

| Tier | Chains | Target |
|------|--------|--------|
| Core | map, filter, sort, score, group, reduce, entities | 3-4 on all |
| Standard | 31 other public chains | 2-3 critical, 1+ others |
| Development | test, test-advice, ai-arch-expect, scan-js | 2 docs/testing, 1+ others |
| Internal | conversation-turn-reduce, test-analysis, test-analyzer | 1 code quality, 0 elsewhere |

## Dimensions

### Tier 1 — Design Fitness (evaluate first, iterate until stable)

| §ID | Dimension | File |
|-----|-----------|------|
| §2a | Strategic Value | [strategic-value.md](strategic-value.md) |
| §2b | Architectural Fitness | [architectural-fitness.md](architectural-fitness.md) |
| §2c | Generalizability | [generalizability.md](generalizability.md) |
| §2d | Composition Fit | [composition-fit.md](composition-fit.md) |
| §2e | Design Efficiency | [design-efficiency.md](design-efficiency.md) |

### Tier 2 — Implementation Quality (harden after design is stable)

| §ID | Dimension | File |
|-----|-----------|------|
| §1a | Logging | [logging.md](logging.md) |
| §1b | Events/Lifecycle | [events.md](events.md) |
| §1c | Documentation | [documentation.md](documentation.md) |
| §1d | Browser/Server | [browser-server.md](browser-server.md) |
| §1e | Testing | [testing.md](testing.md) |
| §1f | API Surface | [api-surface.md](api-surface.md) |
| §1g | Code Quality | [code-quality.md](code-quality.md) |
| §1h | Composability | [composability.md](composability.md) |
| §1i | Prompt Engineering | [prompt-engineering.md](prompt-engineering.md) |
| §1j | Token/Cost Management | [token-management.md](token-management.md) |
| §1k | Errors & Retry | [errors-retry.md](errors-retry.md) |

## Shared Config Conformance

| Parameter | Purpose | Missing from |
|-----------|---------|--------------|
| `llm` | Model selection | (universal) |
| `maxAttempts` | Retry count | themes, filter-ambiguous |
| `onProgress` | Events | collect-terms, themes, truncate, veiled-variants, summary-map, filter-ambiguous, scan-js |
| `now` | Injectable clock | collect-terms, themes, truncate, veiled-variants, summary-map, filter-ambiguous, conversation, scan-js |
| `logger` | Structured logging | themes, collect-terms, truncate, veiled-variants |
