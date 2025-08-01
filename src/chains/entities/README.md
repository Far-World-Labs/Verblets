# entities

Extract names, places, organizations, and custom entity types from text using AI-powered recognition. Supports both predefined and custom entity types with flexible extraction rules.

## Usage

```javascript
// Extract standard entities
const extractCompanies = entities('Extract all company names mentioned');
const result = await extractCompanies('Apple and Microsoft announced a partnership with Google.');
// { entities: [{ name: 'Apple', type: 'company' }, { name: 'Microsoft', type: 'company' }, { name: 'Google', type: 'company' }] }

// Extract custom entities
const extractProducts = entities(`
  Extract product names and their categories.
  Include both physical products and software services.
`);
const products = await extractProducts(`
  The new iPhone 15 Pro features advanced cameras.
  Adobe Creative Cloud offers Photoshop and Illustrator.
  Tesla Model 3 remains the best-selling electric vehicle.
`);
// { entities: [
//   { name: 'iPhone 15 Pro', type: 'smartphone' },
//   { name: 'Adobe Creative Cloud', type: 'software suite' },
//   { name: 'Photoshop', type: 'software' },
//   { name: 'Illustrator', type: 'software' },
//   { name: 'Tesla Model 3', type: 'electric vehicle' }
// ]}
```

## Collection Processing

Use with collection utilities for batch entity extraction:

```javascript
import map from '../map/index.js';
import reduce from '../reduce/index.js';
import { mapInstructions, reduceInstructions } from '../entities/index.js';

// Extract entities from multiple documents
const documents = [
  'Tim Cook announced Apple\'s Q4 earnings...',
  'Satya Nadella discussed Microsoft\'s cloud strategy...',
  'Sundar Pichai revealed Google\'s AI roadmap...'
];

// Extract entities from each document
const entitySets = await map(
  documents,
  await mapInstructions('Extract all people and their associated companies')
);

// Consolidate entities across all documents
const allEntities = await reduce(
  entitySets,
  await reduceInstructions({
    entities: 'People and companies',
    processing: 'Merge duplicates and build comprehensive entity list'
  })
);
```

## Advanced Usage

### Pre-generated Specifications

For consistent entity extraction across multiple operations:

```javascript
import { entitySpec, createEntityExtractor } from '../entities/index.js';

// Generate specification once
const spec = await entitySpec(`
  Extract medical entities:
  - Symptoms (what the patient experiences)
  - Diagnoses (medical conditions)
  - Medications (drugs prescribed)
  - Procedures (medical procedures or tests)
`);

// Create reusable extractor
const medicalExtractor = createEntityExtractor(spec);

// Use consistently across documents
const record1 = await medicalExtractor('Patient reports headache and fever. Prescribed ibuprofen.');
const record2 = await medicalExtractor('MRI scan showed no abnormalities. Diagnosed with migraine.');

// Access the specification
console.log(medicalExtractor.specification);
```

### Collection Instruction Builders

Create instructions for use with collection utilities:

```javascript
import filter from '../filter/index.js';
import { filterInstructions } from '../entities/index.js';

// Filter documents by entities they contain
const newsArticles = [...]; // Array of news articles

const techArticles = await filter(
  newsArticles,
  await filterInstructions({
    entities: 'Technology companies and products',
    processing: 'Keep articles mentioning at least 2 tech entities'
  })
);
```

## API Reference

### Default Export: `entities(prompt, config)`

Creates an entity extraction function.

**Parameters:**
- `prompt` (string): Natural language description of entities to extract
- `config` (Object): Configuration options
  - `llm` (Object): LLM configuration

**Returns:** Function that extracts entities from text

### `entitySpec(prompt, config)`

Generates an entity extraction specification.

**Parameters:**
- `prompt` (string): Entity extraction instructions
- `config` (Object): Configuration options

**Returns:** Promise<string> - Entity specification

### `applyEntities(text, specification, config)`

Applies a specification to extract entities.

**Parameters:**
- `text` (string): Text to analyze
- `specification` (string): Pre-generated specification
- `config` (Object): Configuration options

**Returns:** Promise<Object> - Object with entities array

### `createEntityExtractor(specification, config)`

Creates an extractor function with pre-generated specification.

**Parameters:**
- `specification` (string): Entity specification from `entitySpec`
- `config` (Object): Configuration options

**Returns:** Function with attached specification property

### Collection Instruction Builders

- `mapInstructions(instructions, config)` - For map operations
- `filterInstructions({ entities, processing }, config)` - For filter operations
- `findInstructions({ entities, processing }, config)` - For find operations
- `groupInstructions({ entities, processing }, config)` - For group operations
- `reduceInstructions({ entities, processing }, config)` - For reduce operations

Each returns a string with an attached `specification` property.