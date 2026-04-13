# timeline

Extract chronological events from narrative text using AI-powered temporal analysis with support for various date formats and narrative structures.

## Usage

```javascript
import { timeline } from '@far-world-labs/verblets';

const newsFragments = `
[March 15, 2024] Breaking: Tech giant announces surprise acquisition talks.
[March 15, 2024] Update: Board meeting ended after 6 hours of deliberation.
[March 14, 2024] Company spokesperson yesterday: "We don't comment on speculation."
Earlier today, EU regulators expressed concerns about market concentration.
The merger talks reportedly began in January after a secret meeting in Davos.
[March 12, 2024] Analyst note: "Strategic partnership discussions intensifying."
Three months ago, the companies settled their long-running patent dispute.
[March 15, 2024 - 4:00 PM] Stock halted pending major announcement.
Last week's earnings call hinted at "transformative opportunities ahead."
The rivalry between the two firms dates back to 2019.
`;

const events = await timeline(newsFragments, 'Focus on corporate actions');
// Reconstructs chronological sequence from mixed absolute and relative timestamps

// Or with an instruction bundle for richer context:
const focused = await timeline(newsFragments, {
  text: 'Focus on regulatory actions',
  domain: 'EU competition law',
});
```

## API

### `timeline(text, instructions?, config?)`

**Parameters:**
- `text` (string): Narrative text to extract timeline from
- `instructions` (string|Object): Optional extraction focus — string or instruction bundle with named context
- `config` (Object): Configuration options
  - `chunkSize` (number): Text chunk size for processing (default: 2000)
  - `maxParallel` (number): Maximum parallel chunk processing (default: 3)
  - `onProgress` (Function): Progress callback `(event) => void`. Events from nested reduce/map calls are tagged with `phase` (`'reduce:knowledge-base'`, `'map:enrichment'`)
  - `abortSignal` (AbortSignal): Signal to cancel the operation
  - `llm` (string|Object): LLM model configuration
  - `enrichment` (`'low'`|`'high'`): Controls timeline enrichment depth. `'low'` skips LLM dedup and knowledge enrichment. `'high'` enables LLM dedup + knowledge base building + enrichment mapping. Default: LLM dedup only
  - `batchSize` (number): Items per batch for reduce/map when enriching (auto-calculated if omitted)

**Known texts:** `knowledge` — supply a pre-built knowledge base to skip the reduce derivation step

**Returns:** Promise<Array<Event>> - Chronologically sorted timeline events

**Event Structure:**
```javascript
{
  timestamp: string,      // ISO date, relative time, or contextual marker
  name: string,          // Concise event label
  enriched?: boolean,    // Present if LLM corrected/improved the date
}
```

The chain handles mixed date formats — ISO dates, relative times ("three months ago"), contextual markers ("earlier today") — and reconstructs chronological order from scattered references. Large documents are chunked and deduplicated.

## Knowledge Enrichment

With `enrichment: 'high'`, the chain:
1. Extracts events normally from the text
2. Deduplicates events via LLM (also enabled by default)
3. Uses reduce to build a knowledge base of accurate historical dates
4. Maps over extracted events to correct/improve dates based on knowledge

```javascript
// Example: Enrich vague dates with precise historical knowledge
const text = "The Wright brothers flew. Pearl Harbor was attacked. Man landed on moon.";
const enriched = await timeline(text, {
  enrichment: 'high',
  batchSize: 2  // Process in smaller batches
});
// Returns events with precise dates: 1903-12-17, 1941-12-07, 1969-07-20
```