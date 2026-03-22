# §1f API Surface

## Levels

| Level | Description | Example |
|-------|-------------|---------|
| 0 | Exports exist but undocumented, inconsistent naming | — |
| 1 | Default export works, naming follows convention | themes, truncate |
| 2 | All exports documented, shared config destructuring | collect-terms, glossary |
| 3 | Instruction builders, spec/apply split | score, entities, tags |
| 4 | Full spec + factory functions + calibration utilities | scale, entities, relations, anonymize |

## Observations

- Instruction builders all use `{ specification, processing }` — standardized
  in publishability pass after 4 READMEs had chain-specific parameter names.
