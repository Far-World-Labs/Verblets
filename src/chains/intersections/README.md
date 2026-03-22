# intersections

Find what lies at the overlap between categories. Given a list of domains, the chain generates all pairwise (and higher-order) combinations, then uses the AI to discover elements that exist at each intersection.

```javascript
import { intersections } from '@far-world-labs/verblets';

const disciplines = ['linguistics', 'neuroscience', 'computer science'];
const results = await intersections(disciplines, {
  instructions: 'Find research fields and methods that span these areas'
});
// => {
//   'linguistics + neuroscience': {
//     combination: ['linguistics', 'neuroscience'],
//     description: 'How the brain processes and produces language',
//     elements: ['Aphasia studies', 'ERP language experiments', 'Bilingual brain imaging']
//   },
//   'linguistics + computer science': {
//     combination: ['linguistics', 'computer science'],
//     description: 'Computational approaches to language',
//     elements: ['Parsing algorithms', 'Machine translation', 'Corpus linguistics']
//   },
//   'neuroscience + computer science': {
//     combination: ['neuroscience', 'computer science'],
//     description: 'Brain-inspired and brain-interfacing computation',
//     elements: ['Neural networks', 'Brain-computer interfaces', 'Connectomics']
//   },
//   'linguistics + neuroscience + computer science': {
//     combination: ['linguistics', 'neuroscience', 'computer science'],
//     description: 'The full convergence: modeling language in the brain computationally',
//     elements: ['Large language models as cognitive models', 'Neural decoding of speech', 'Computational psycholinguistics']
//   }
// }
```

## API

### `intersections(categories, config?)`

- **categories** (Array): Domains or concepts to find intersections between
- **config.instructions** (string): Guide what kind of intersections to look for
- **config.minSize** (number): Minimum combination size (default: 2)
- **config.maxSize** (number): Maximum combination size (default: categories.length)
- **config.batchSize** (number): Combinations to process in parallel (default: 10)
- **config.llm** (string|Object): LLM model configuration

**Returns:** `Promise<Object>` — Keys are `"A + B"` strings, values are `{ combination, description, elements }` objects
