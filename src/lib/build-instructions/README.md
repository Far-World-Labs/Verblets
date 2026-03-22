# build-instructions

Factory for creating collection instruction builders. Chains that follow the spec/apply pattern (scale, score, entities, tags, relations) use this to generate `mapInstructions`, `filterInstructions`, `reduceInstructions`, `findInstructions`, and `groupInstructions` functions from a single configuration.

These instruction builders compose a chain's specification with collection chains like `map`, `filter`, `find`, `reduce`, and `group`:

```javascript
import { map, scoreMapInstructions, scoreSpec } from '@far-world-labs/verblets';

// Generate a reusable scoring specification
const spec = await scoreSpec('Rate writing quality 0-10');

// Use the spec with any collection chain
const scores = await map(essays, scoreMapInstructions({ specification: spec }));
```

The instruction builder embeds the specification as XML and wraps any consumer-provided processing instructions alongside it, so the LLM sees both the domain criteria and the operation context in a single prompt.

## Creating Instruction Builders

Chains call `buildInstructions` with their domain-specific template:

```javascript
import buildInstructions from '../../lib/build-instructions/index.js';

export const { mapInstructions, filterInstructions, reduceInstructions, findInstructions, groupInstructions } =
  buildInstructions({
    specTag: 'scale-specification',
    defaults: { map: 'Apply the scale to each item...', filter: 'Keep items that match...', ... },
    steps: { reduce: 'Accumulate using the specification...', filter: 'Evaluate each item...', ... },
  });
```

## Exported Builders

| Chain | Export Name | Spec Function |
|---|---|---|
| scale | `scaleMapInstructions` | `scaleSpec()` |
| score | `scoreMapInstructions` | `scoreSpec()` |
| entities | `entitiesMapInstructions` | `entitiesSpec()` |
| tags | `tagsMapInstructions` | `tagsSpec()` |
| relations | `relationsMapInstructions` | `relationsSpec()` |

Each chain also exports `filterInstructions`, `reduceInstructions`, `findInstructions`, and `groupInstructions` variants.
