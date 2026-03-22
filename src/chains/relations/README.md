# relations

Extract structured relationship tuples from text as subject-predicate-object triples with optional metadata. Supports entity disambiguation and predicate filtering.

## Example

Turn unstructured news into a structured knowledge graph — extracting not just entities but how they relate:

```javascript
import { relations } from '@far-world-labs/verblets';

const extractor = relations({
  relations: 'Extract geopolitical and economic relationships',
  predicates: ['sanctioned', 'allied with', 'traded with', 'invaded', 'negotiated'],
  entities: [
    { name: 'US', canonical: 'United States', type: 'country' },
    { name: 'America', canonical: 'United States', type: 'country' },
    { name: 'EU', canonical: 'European Union', type: 'organization' }
  ]
});

const result = await extractor(`
  The US imposed new sanctions on Russia following the invasion of Ukraine.
  The European Union joined America in coordinating the sanctions package.
`);
// [
//   { subject: 'United States', predicate: 'sanctioned', object: 'Russia', metadata: { context: 'invasion response' } },
//   { subject: 'Russia', predicate: 'invaded', object: 'Ukraine' },
//   { subject: 'European Union', predicate: 'allied with', object: 'United States', metadata: { context: 'sanctions coordination' } }
// ]
```

## API Reference

### `relations(prompt, config)` (default export)

Creates a relation extraction function. `prompt` can be a string or an object with:

- `relations` (string): Description of relationships to extract
- `predicates` (string[]): Specific relationship types to focus on
- `entities` (Array): Canonical entity forms for disambiguation

**Config options:**
- `canonicalization` (`'low'`|`'med'`|`'high'`): Entity normalization strictness
- `entities` (Array): Canonical entity forms (also accepted in prompt object)
- `llm` (string|Object): LLM configuration

### `relationSpec(prompt, config)`

Generates a reusable relation extraction specification.

### `applyRelations(text, specification, config)`

Applies a pre-generated specification to extract relations.

### `createRelationExtractor(specification, config)`

Creates an extractor from a pre-generated specification.

### Collection Instruction Builders

For use with collection utilities (`map`, `filter`, `find`, `group`, `reduce`):

`mapInstructions`, `filterInstructions`, `findInstructions`, `groupInstructions`, `reduceInstructions`

Each accepts `{ relations, predicates?, processing, entities? }`.

### Tuple Format

```javascript
{
  subject: 'Apple Inc.',        // Canonical entity form
  predicate: 'acquired',        // Relationship type
  object: 'Beats Electronics',  // Entity or primitive (auto-parsed to JS types)
  metadata: { date: '2014', amount: '$3 billion' }
}
```

Object values are auto-converted to native JS types (numbers, booleans, Dates) when applicable.
