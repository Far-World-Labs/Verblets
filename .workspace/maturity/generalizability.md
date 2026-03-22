# §2c Generalizability

Is this module broadly applicable or locked to a specific context?

## Levels

| Level | Description | Example |
|-------|-------------|---------|
| 0 | Locked to one specific runtime, framework, or data format; not reusable | — |
| 1 | Works for specific context; could theoretically generalize but doesn't | test-analysis (locked to vitest + Redis) |
| 2 | Mostly general with some context-specific coupling that limits adoption | — |
| 3 | General purpose with clean abstraction boundaries; works across domains | filter, map, score (work with any text data) |
| 4 | Fully general and context-agnostic; adaptable to new use cases without modification | reduce (accumulator pattern works universally) |

## Evaluation Guidance

Generalizability blockers (each limits the ceiling):
- Hard dependency on a specific test framework (vitest, jest, mocha)
- Hard dependency on a specific runtime service (Redis, specific database)
- Assumes a specific data format that isn't universally applicable
- Tight coupling to project-internal conventions that external users wouldn't share

Generalizability enablers:
- Accepts instructions as natural language (the core verblets pattern)
- Works with any text input, not just specific schemas
- Runtime dependencies are optional or swappable
- Isomorphic (browser + Node.js)

## Observations

- The core verblets pattern (natural language instruction + data → transformed data) is inherently general.
- Chains that break from this pattern by requiring specific infrastructure tend to score lower.
- A chain with a powerful idea but low generalizability should be refactored to extract the general capability.
