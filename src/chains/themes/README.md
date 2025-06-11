# themes

Reveal a text's key themes and map them back to the sentences where they appear. The chain first scans fragments in batches to collect possible themes, then runs a consolidation step to normalize and deduplicate them. Optionally it returns a per-sentence map showing which themes surface in each line.

```javascript
import themes from './index.js';

const news = `The storm toppled trees and damaged homes. Volunteers quickly arrived with food and tools. Their kindness inspired hope throughout the town.`;

const result = await themes(news, { sentenceMap: true });
/* {
 * themes: ['disaster recovery', 'community', 'hope'],
 * sentenceThemes: [
 *   [0, ['disaster recovery']],
 *   [44, ['community']],
 *   [114, ['hope']]
 * ]
 */
```

