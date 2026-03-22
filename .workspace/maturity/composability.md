# §1h Composability

How well a chain works as part of larger pipelines.

## Levels

| Level | Description | Example |
|-------|-------------|---------|
| 0 | Single-purpose function, no composition interfaces | themes, truncate |
| 1 | Accepts/returns standard types, can be chained manually | split, join, people |
| 2 | Composes other chains internally (chain-of-chains) | glossary (map+sort), collect-terms (list+score) |
| 3 | Exports `fooSpec()` + `applyFoo()` split; instruction builders for 2+ chains | score |
| 4 | Full spec/apply + factory + instruction builders for all 5 collection chains | scale, entities, relations, tags, anonymize |

## Observations

- The spec/apply + instruction builder + factory pattern is the most composable
  design in the codebase. See platform.md "Composition Patterns."
- Only 6 chains have reached level 3-4. Most are level 1-2.
