# entities

Extract named entities from text using AI-powered recognition. Supports both standard types (people, places, organizations) and custom domain-specific entities.

## Example

Extract domain-specific entities that no pre-trained NER model knows about:

```javascript
import { entities } from '@far-world-labs/verblets';

const extractThreats = entities(`
  Extract cybersecurity entities:
  - Threat actors (named groups or individuals)
  - Attack vectors (techniques used)
  - Indicators of compromise (IPs, hashes, domains)
  - Affected systems (software, infrastructure)
`);

const report = await extractThreats(`
  APT29 exploited a zero-day in Microsoft Exchange (CVE-2024-1234)
  to deploy a custom backdoor communicating with C2 server 198.51.100.42.
  The malware uses DLL sideloading via a signed Microsoft binary.
`);
// { entities: [
//   { name: 'APT29', type: 'threat_actor' },
//   { name: 'CVE-2024-1234', type: 'indicator_of_compromise' },
//   { name: 'Microsoft Exchange', type: 'affected_system' },
//   { name: '198.51.100.42', type: 'indicator_of_compromise' },
//   { name: 'DLL sideloading', type: 'attack_vector' }
// ]}
```

## API Reference

### `entities(prompt, config)` (default export)

Creates an entity extraction function.

- `prompt` (string): Natural language description of entities to extract
- `config` (Object): `{ llm }` — LLM configuration
- **Returns:** async function that accepts text and returns `{ entities: [...] }`

### `entitySpec(prompt, config)`

Generates a reusable entity extraction specification.

### `applyEntities(text, specification, config)`

Applies a pre-generated specification to extract entities from text.

### `createEntityExtractor(specification, config)`

Creates an extractor function from a pre-generated specification. The returned function has a `.specification` property.

### Collection Instruction Builders

For use with collection utilities (`map`, `filter`, `find`, `group`, `reduce`):

- `mapInstructions(instructions, config)`
- `filterInstructions({ entities, processing }, config)`
- `findInstructions({ entities, processing }, config)`
- `groupInstructions({ entities, processing }, config)`
- `reduceInstructions({ entities, processing }, config)`

Each returns a string with an attached `specification` property.
