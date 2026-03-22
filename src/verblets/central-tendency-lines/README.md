# central-tendency-lines

Evaluate how prototypical an item is within a cognitive category. Returns a graded typicality score based on feature overlap with seed examples.

## Example

```javascript
import { centralTendencyLines } from '@far-world-labs/verblets';

const birdSeeds = ['robin', 'sparrow', 'bluejay', 'cardinal'];

const robin = await centralTendencyLines('robin', birdSeeds, {
  context: 'Typical bird characteristics and behavior',
  coreFeatures: ['feathers', 'beak', 'flight', 'lays eggs'],
});
// => { score: 0.92, reason: "Robin exemplifies core bird features...", confidence: 0.88 }

const penguin = await centralTendencyLines('penguin', birdSeeds, {
  context: 'Typical bird characteristics and behavior',
  coreFeatures: ['feathers', 'beak', 'flight', 'lays eggs'],
});
// => { score: 0.65, reason: "Penguin is a bird but lacks flight...", confidence: 0.82 }
```

## API

### `centralTendency(item, seedItems, config)`

- **item** (string): The item to evaluate
- **seedItems** (string[]): Known category members for comparison
- **config** (object):
  - `context` (string): Evaluation context (default: `''`)
  - `coreFeatures` (string[]): Definitional features of the category (default: `[]`)
  - `llm` (string|object): LLM configuration (default: `'fastGoodCheap'`)

### Return value

```javascript
{
  score: 0.85,        // Centrality score (0.0-1.0)
  reason: "...",      // Brief explanation
  confidence: 0.82    // Assessment confidence (0.0-1.0)
}
```

Context matters: the same item scores differently depending on `context` and `coreFeatures`. A harmonica scores high for "portable folk instruments" but low for "classical orchestral instruments."

For batch evaluation, use the [central-tendency](../../chains/central-tendency) chain.
