# schema-org

Extract structured Schema.org objects from natural language text.

```javascript
import { schemaOrg } from '@far-world-labs/verblets';

const person = await schemaOrg(
  'John Smith is a software engineer at TechCorp in San Francisco',
  'Person'
);
// => {
//   '@type': 'Person',
//   name: 'John Smith',
//   jobTitle: 'Software Engineer',
//   worksFor: { '@type': 'Organization', name: 'TechCorp' },
//   address: { '@type': 'PostalAddress', addressLocality: 'San Francisco' }
// }

const business = await schemaOrg(
  'Amazing Italian restaurant downtown with 5-star reviews',
  'LocalBusiness'
);
// => { '@type': 'LocalBusiness', servesCuisine: 'Italian', aggregateRating: { ratingValue: 5 }, ... }
```

## API

### `schemaOrg(text, schemaType, config?)`

- **text** (string): Natural language content to analyze
- **schemaType** (string): Target Schema.org type (`"Person"`, `"LocalBusiness"`, `"Event"`, etc.)
- **config.llm** (string|Object): LLM model configuration

**Returns:** `Promise<Object>` — Schema.org-conformant object with `@type` and extracted properties