# veiled-variants

Reframe a prompt through multiple cognitive lenses to generate alternative phrasings. Useful when a direct query might trigger content filters or when you want diverse angles on the same question. Runs parallel LLM calls — one per strategy — and returns all variants in a flat array.

The three built-in strategies:
- **Scientific framing** — recasts the prompt as an academic research query using terminology from biology, epidemiology, or public health
- **Causal framing** — explores causes, co-conditions, and consequences adjacent to the topic
- **Soft cover** — reframes as general wellness or diagnostic concerns with a clinical, approachable tone

```javascript
import { veiledVariants } from '@far-world-labs/verblets';

const variants = await veiledVariants({
  prompt: 'What are the effects of long-term sleep deprivation?',
});

// Returns 15 variants (5 per strategy):
// [
//   "What neurological biomarkers correlate with chronic sleep deficit in longitudinal cohort studies?",
//   "How does sustained wakefulness beyond 72 hours alter hypothalamic-pituitary axis regulation?",
//   ...
//   "What environmental and behavioral factors contribute to persistent inability to maintain sleep?",
//   ...
//   "What general wellness indicators suggest someone may not be getting adequate rest?",
//   ...
// ]
```

## API

### `veiledVariants(config)`

The entire input is a single config object.

- `prompt` (string, required): The text to reframe
- `coverage` (`'low'`|`'high'`): Controls strategy breadth and variant count. `'low'` runs 1 strategy producing 3 variants. `'high'` runs all 3 strategies with 8 variants each (24 total). Default: all 3 strategies with 5 each (15 total).
- `strategies` (Array): Override which strategies to use. Values: `'scientific'`, `'causal'`, `'softCover'`
- `variantCount` (number): Override variants per strategy
- `llm` (string|Object): Model selection. Defaults to `{ sensitive: true }`, requesting a privacy-capable model.

**Returns:** `Promise<string[]>` — flat array of all generated variants across strategies.

## Exported Prompts

The individual strategy prompt builders are exported for direct use:

```javascript
import {
  scientificFramingPrompt,
  causalFramePrompt,
  softCoverPrompt,
  veiledVariantStrategies, // ['scientific', 'causal', 'softCover']
} from '@far-world-labs/verblets';

const prompt = scientificFramingPrompt('effects of isolation on cognition', 3);
// Returns a ready-to-use LLM prompt requesting 3 scientific reframings
```
