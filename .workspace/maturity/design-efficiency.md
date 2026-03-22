# §2e Design Efficiency

Is the implementation proportional to the design, or is the code fighting itself?

## Levels

| Level | Description | Example |
|-------|-------------|---------|
| 0 | Severe strain; implementation is fighting the design, workarounds everywhere | — |
| 1 | Significant strain; high LOC relative to idea complexity, notable friction | — |
| 2 | Moderate; some unnecessary complexity but the design mostly works | — |
| 3 | Efficient; clean implementation, LOC proportional to genuine complexity | map (~300 lines for batch transform + retry + progress) |
| 4 | Exemplary; minimal code, design makes implementation obvious | reduce (~160 lines for accumulator pattern) |

## Evaluation Guidance

Quantitative signals:
- **LOC per export**: If a module has 600 lines and 1 export, it may be doing too much internally.
- **Helper function count**: Many small helpers can indicate the main abstraction is wrong — the problem should decompose differently.
- **Import count**: Many internal lib/ imports suggest the chain is taking on responsibilities that don't belong to it.

Qualitative signals:
- **Workarounds**: Code comments explaining why something is done a non-obvious way.
- **Duplicated logic**: The chain reimplements something available elsewhere in the library.
- **Configuration complexity**: Many config parameters with complex interactions suggest the API surface is fighting the design.
- **Test complexity**: If tests require elaborate setup to exercise basic functionality, the design may be wrong.

## Observations

- The cleanest chains in the library tend to be under 200 lines with 2-5 helper functions.
- Chains over 400 lines should be examined for design efficiency — the LOC may indicate genuine complexity or it may indicate a design that's fighting itself.
- A chain that needs extensive token-budget arithmetic probably needs a better abstraction for budget management, not more arithmetic.
