# collect-terms

Extract and rank the most relevant search terms from a document.

```javascript
import { collectTerms } from '@far-world-labs/verblets';

const paper = `
The quantum entanglement phenomenon demonstrates non-local correlations
between particles. Bell's theorem proves these correlations cannot be
explained by hidden variables in classical physics. Recent experiments
with entangled photon pairs have confirmed violations of Bell inequalities
at unprecedented distances.
`;

const terms = await collectTerms(paper, { topN: 8 });
// => ['quantum entanglement', 'Bell theorem', 'non-local correlations',
//     'hidden variables', 'entangled photon pairs', 'Bell inequalities',
//     'classical physics', 'photon experiments']
```

## API

### `collectTerms(text, config?)`

- **text** (string): Document text to analyze
- **config** (Object): Configuration options
  - **topN** (number): Number of top terms to return (default: 20)
  - **chunkLen** (number): Characters per processing chunk (default: 1000)
  - **llm**: LLM configuration

**Returns:** Promise\<string[]\> — Terms ranked by search relevance
