# §2d Composition Fit

Does this module participate in the library's composition philosophy?

## Levels

| Level | Description | Example |
|-------|-------------|---------|
| 0 | Standalone monolith; doesn't use or expose library composition patterns | — |
| 1 | Uses other chains internally but as implementation detail; not composable itself | document-shrink (uses score, map internally but is a black box) |
| 2 | Exposes a clean function interface; works as a pipeline step | filter, sort (accepts items + instruction, returns items) |
| 3 | Follows library composition patterns; works as both consumer and provider | score (spec/apply, instruction builders for map/filter) |
| 4 | Full composition citizen; enables novel workflows by combining with other chains | entities, scale, relations (spec/apply + instruction builders for all collection chains) |

## Evaluation Guidance

Distinct from §1h Composability (which measures interface patterns like spec/apply exports).
Composition Fit evaluates whether the module's *design* embodies composition:

- Does it build on the library's own primitives rather than reimplementing their logic?
- Could a developer wire it into a larger pipeline, or is it a sealed black box?
- Does it enable new compositions that wouldn't be possible without it?
- Would splitting this module into composable pieces make the library more powerful?

A chain that exports spec/apply (high §1h) but internally reimplements batch processing (low §2d) has good interface but poor design fit.

## Observations

- The spec/apply + instruction builder pattern is the gold standard for composition fit.
- Chains that orchestrate other chains (document-shrink, anonymize) could often be expressed as compositions of existing primitives.
- The "could this be a pipeline instead of a monolith?" test is a good heuristic.
