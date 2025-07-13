# timeline

Extract chronological events from narrative text using AI-powered temporal analysis with support for various date formats and narrative structures.

## Usage

```javascript
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

const events = await timeline(newsFragments);
// Reconstructs chronological sequence from mixed absolute and relative timestamps
```

## API

### `timeline(text, config)`

**Parameters:**
- `text` (string): Narrative text to extract timeline from
- `config` (Object): Configuration options
  - `chunkSize` (number): Text chunk size for processing (default: 2000)
  - `maxParallel` (number): Maximum parallel chunk processing (default: 3)
  - `onProgress` (Function): Progress callback `(current, total) => void`
  - `llm` (Object): LLM model options
  - `enrichWithKnowledge` (boolean): Enrich dates with LLM's historical knowledge (default: false)

**Returns:** Promise<Array<Event>> - Chronologically sorted timeline events

**Event Structure:**
```javascript
{
  timestamp: string,      // ISO date, relative time, or contextual marker
  name: string,          // Concise event label
  enriched?: boolean,    // Present if LLM corrected/improved the date
}
```

## Features

- **Multi-format dates**: ISO dates, relative times, contextual markers
- **Non-linear reconstruction**: Builds chronology from scattered temporal references
- **Large document support**: Processes documents of any size through chunking
- **Deduplication**: Merges duplicate events from overlapping chunks
- **Chronological sorting**: Orders parseable dates; preserves sequence for relative timestamps
- **Knowledge enrichment**: Optional LLM knowledge to correct dates and add context

## Knowledge Enrichment

When `enrichWithKnowledge: true`, the chain:
1. Extracts events normally from the text
2. Uses reduce to build a knowledge base of accurate historical dates
3. Maps over extracted events to correct/improve dates based on knowledge
4. Adds important contextual events that fit within the timeline scope

```javascript
// Example: Enrich vague dates with precise historical knowledge
const text = "The Wright brothers flew. Pearl Harbor was attacked. Man landed on moon.";
const enriched = await timeline(text, { 
  enrichWithKnowledge: true,
  batchSize: 2  // Process in smaller batches
});
// Returns events with precise dates: 1903-12-17, 1941-12-07, 1969-07-20
```