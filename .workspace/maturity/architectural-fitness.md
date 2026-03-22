# §2b Architectural Fitness

Is the design proportional to the problem? Could it be simpler?

## Levels

| Level | Description | Example |
|-------|-------------|---------|
| 0 | Architecture fights the problem; major rework needed | — |
| 1 | Workable but strained; high LOC relative to idea, notable workarounds | — |
| 2 | Adequate; some unnecessary complexity but generally works | — |
| 3 | Clean design proportional to the problem; few unnecessary abstractions | filter, reduce |
| 4 | Elegant; minimal code for maximum capability, design makes intent obvious | score (spec/apply enables composition naturally) |

## Evaluation Guidance

Key signals of poor architectural fitness:
- **High LOC-to-idea ratio**: If the core idea is "shrink a document" but the implementation is 600+ lines with 17 helper functions, the abstraction may be wrong.
- **Reimplements existing primitives**: If a chain hand-rolls batch processing, scoring, or filtering that the library's own chains already provide.
- **Bespoke infrastructure**: If the chain requires its own coordination layer, buffer system, or execution model rather than using the library's patterns.
- **Many special cases**: If the code is full of conditional branches for edge cases that a better abstraction would handle uniformly.

Key signals of good architectural fitness:
- **Proportional complexity**: Lines of code scale with genuine problem complexity, not accidental complexity.
- **Builds on primitives**: Uses the library's own chains (map, filter, reduce, score) rather than reimplementing their logic.
- **Clear phases**: The chain's processing steps are obvious from reading the top-level function.

## Observations

- Chains under 200 lines that do one thing well tend to have the best architectural fitness.
- Chains over 400 lines should be examined for whether they're doing too much or reimplementing existing capabilities.
