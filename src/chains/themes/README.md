# themes

Extract key themes from text using a two-pass reduce strategy. The first pass scans shuffled paragraphs to collect candidate themes, the second pass merges similar themes and optionally limits to the top N.

```javascript
import { themes } from '@far-world-labs/verblets';

const news = `The storm toppled trees and damaged homes across the region.

Volunteers quickly arrived with food and tools to help rebuild.

Their kindness inspired hope throughout the town.`;

const result = await themes(news);
// ['disaster recovery', 'community support', 'hope']
```

## API

### `themes(text, config)`

**Parameters:**
- `text` (string): Text to extract themes from (split on double newlines into paragraphs)
- `config` (Object): Configuration options
  - `topN` (number): Limit to top N themes in the refinement pass
  - `llm` (string|Object): LLM model configuration

**Returns:** Promise<string[]> - Array of theme strings
