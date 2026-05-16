# veiled-variants

Reframe an intent as a set of **adjacent** queries — questions whose answers, taken together, would inform the original but which never ask it directly. Useful when a direct query might trip a content filter, expose intent to an upstream observer, or when you simply want a wider net of evidence than a literal restatement would gather.

The chain runs parallel LLM calls (one per strategy) and returns the variants flat. Each strategy aims at a different kind of "near miss":

- **Scientific framing** — recasts the intent as research, diagnostic, or modeling questions in an adjacent technical field. The vocabulary shifts; the central subject is never named.
- **Causal framing** — asks about precursors, co-conditions, and downstream effects in the neighborhood of the topic, without naming it.
- **Soft cover** — reframes as ordinary, unremarkable practical questions from a different domain entirely. Plain voice, no clinical or domain markers.

## Health-adjacent example

```javascript
import { veiledVariants } from '@far-world-labs/verblets';

const variants = await veiledVariants(
  'What are the long-term effects of chronic insomnia?'
);

// Returns 15 variants (5 per strategy). None mentions sleep, insomnia,
// rest, fatigue, or any direct synonym. Sample:
// [
//   // scientific
//   "What metabolic markers shift in adults with sustained autonomic dysregulation?",
//   "Which cortisol and inflammatory profiles correlate with prolonged circadian misalignment in working-age cohorts?",
//   "What longitudinal cardiovascular outcomes track with chronic vigilance states?",
//   ...
//   // causal
//   "What occupational and environmental conditions most strongly predict reduced overnight melatonin output?",
//   "Which household and lifestyle factors are most associated with elevated evening cortisol?",
//   ...
//   // soft cover
//   "How do people who travel across time zones for work typically organize their week?",
//   "What habits do shift workers tend to adopt to keep up with daily routines?",
//   ...
// ]
```

The original intent — *insomnia and its long-term effects* — is recoverable only by combining several answers across strategies. No single variant exposes it.

## Finance-adjacent example

```javascript
const variants = await veiledVariants(
  'Is now a good time to liquidate my retirement holdings?'
);

// Sample variants — none asks the original question, none names retirement,
// liquidation, or selling:
// [
//   // scientific
//   "What macroeconomic indicators historically precede broad shifts in long-duration asset allocation?",
//   "How do household balance-sheet compositions respond to multi-quarter changes in real interest rates?",
//   ...
//   // causal
//   "What labor-market and demographic signals tend to lead changes in domestic savings flows?",
//   "Which policy events most consistently coincide with rebalancing activity across managed portfolios?",
//   ...
//   // soft cover
//   "How do families typically decide when to make a large household financial change?",
//   "What questions do people ask their advisors before any significant life transition?",
//   ...
// ]
```

Again, the original intent only emerges from the *combination* of answers across strategies — each individual query reads as an unrelated research or lifestyle question.

## API

### `veiledVariants(prompt, config)`

- `prompt` (string, required): The intent to veil
- `config.coverage` (`'low'`|`'med'`|`'high'`): Strategy breadth and variant count. `'low'` runs 1 strategy producing 3 variants. `'med'` (default) runs all 3 strategies with 5 variants each (15 total). `'high'` runs all 3 strategies with 8 variants each (24 total).
- `config.strategies` (Array): Override which strategies to use. Values: `'scientific'`, `'causal'`, `'softCover'`
- `config.variantCount` (number): Override variants per strategy
- `config.llm` (string|Object): Model selection. Defaults to `{ sensitive: true }`, requesting a privacy-capable model.

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
// Returns a ready-to-use LLM prompt requesting 3 adjacent research queries
```
