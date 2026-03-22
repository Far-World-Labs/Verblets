# §2a Strategic Value

How useful, frequent, and powerful this module is from a developer's perspective.

## Levels

| Level | Description | Example |
|-------|-------------|---------|
| 0 | No clear use case; hard to imagine reaching for this | — |
| 1 | Niche utility; occasional use in specific workflows | veiled-variants, pop-reference |
| 2 | Useful tool; moderate frequency, solves a real problem | glossary, disambiguate, truncate |
| 3 | Core capability; developers frequently need this in AI pipelines | map, filter, score, entities |
| 4 | Transformative; unlocks entirely new workflows or feedback loops | AI test analysis (local LLM log analysis), expect (AI assertions) |

## Evaluation Guidance

Consider from two perspectives:
- **Software developer** building AI-powered features: which tools do they reach for daily?
- **Process automator** building pipelines: which tools enable novel automation patterns?

A module's strategic value is proportional to:
- Frequency of use across different projects/workflows
- Power: does it enable things that were previously impossible or impractical?
- Generality: does it apply across domains or only in narrow contexts?

## Observations

- The core batch processing chains (map, filter, reduce, group, sort) are high-value by definition — they're the composition primitives.
- Spec/apply chains (score, entities, scale, relations) are high-value because they integrate with all collection chains.
- Some chains solve powerful problems but their value is limited by implementation constraints (e.g., test-analysis locked to vitest).
