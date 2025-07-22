# Relations Chain

Extract structured relationship tuples from text, identifying connections between entities as subject-predicate-object triples with optional metadata.

## Overview

The relations chain identifies and extracts relationships between entities in text, producing structured tuples that capture:
- **Subject**: The entity performing or possessing the relationship
- **Predicate**: The type of relationship or action
- **Object**: The entity receiving or connected by the relationship
- **Metadata**: Additional context about the relationship (optional)

## Basic Usage

```javascript
import relations from './chains/relations/index.js';

// Simple relation extraction
const extractor = relations('Extract business relationships');
const result = await extractor('Apple partnered with Microsoft on cloud services.');
// Returns: [{ subject: "Apple", predicate: "partnered with", object: "Microsoft", metadata: {...} }]
```

## Entity Disambiguation

Provide canonical entity forms to ensure consistent naming across relations:

```javascript
const extractor = relations({
  relations: 'Extract organizational relationships',
  entities: [
    { name: 'Tim Cook', canonical: 'Tim Cook', type: 'person' },
    { name: 'Cook', canonical: 'Tim Cook', type: 'person' },
    { name: 'Apple', canonical: 'Apple Inc.', type: 'company' }
  ]
});

const result = await extractor('Cook leads Apple as CEO.');
// Returns: [{ subject: "Tim Cook", predicate: "leads", object: "Apple Inc.", metadata: { role: "CEO" } }]
```

## Predicate Specification

Focus extraction on specific relationship types:

```javascript
const extractor = relations({
  relations: 'Extract financial relationships',
  predicates: ['acquired', 'invested in', 'funded', 'bought']
});

const result = await extractor('Google acquired Fitbit for $2.1 billion in 2021.');
// Returns focused extraction on specified predicates
```

## Advanced Features

### Pre-generated Specifications

Create reusable extractors for consistent relation extraction:

```javascript
import { relationSpec, createRelationExtractor } from './chains/relations/index.js';

// Generate specification once
const spec = await relationSpec({
  relations: 'Extract merger and acquisition relationships',
  predicates: ['acquired', 'merged with', 'purchased'],
  entities: companiesList
});

// Create reusable extractor
const m_and_a_extractor = createRelationExtractor(spec, { entities: companiesList });

// Use across multiple texts
const result1 = await m_and_a_extractor(text1);
const result2 = await m_and_a_extractor(text2);
```

### Low-level API

For fine-grained control:

```javascript
import { relationSpec, applyRelations } from './chains/relations/index.js';

// Generate specification
const spec = await relationSpec('Extract causal relationships');

// Apply to text with custom config
const result = await applyRelations(text, spec, {
  entities: knownEntities,
  llm: 'gpt-4'
});
```

## Chain Operations

### Map - Extract Relations from Multiple Chunks

```javascript
import { mapInstructions } from './chains/relations/index.js';
import map from '../map/index.js';

const instructions = await mapInstructions({
  relations: 'Extract all inter-company relationships',
  predicates: ['partnered with', 'competes with', 'acquired'],
  processing: 'Include temporal information when available'
});

const relationSets = await map(textChunks, instructions);
```

### Filter - Find Chunks with Specific Relations

```javascript
import { filterInstructions } from './chains/relations/index.js';
import filter from '../filter/index.js';

const instructions = await filterInstructions({
  relations: 'Extract acquisition relationships',
  processing: 'Keep only chunks mentioning acquisitions over $1 billion'
});

const relevantChunks = await filter(allChunks, instructions);
```

### Reduce - Build Knowledge Graph

```javascript
import { reduceInstructions } from './chains/relations/index.js';
import reduce from '../reduce/index.js';

const instructions = await reduceInstructions({
  relations: 'Extract all relationships',
  processing: 'Merge duplicate relations and resolve entity variations',
  entities: canonicalEntities
});

const knowledgeGraph = await reduce(textChunks, instructions, []);
```

### Find - Locate Relationship-Rich Content

```javascript
import { findInstructions } from './chains/relations/index.js';
import find from '../find/index.js';

const instructions = await findInstructions({
  relations: 'Extract conflict relationships',
  processing: 'Find the chunk with the most complex relationship network'
});

const denseChunk = await find(textChunks, instructions);
```

### Group - Organize by Relationship Patterns

```javascript
import { groupInstructions } from './chains/relations/index.js';
import group from '../group/index.js';

const instructions = await groupInstructions({
  relations: 'Extract business relationships',
  processing: 'Group chunks by relationship type: partnerships vs competition vs acquisitions'
});

const groupedChunks = await group(textChunks, instructions);
```

## Relation Tuple Format

Each extracted relation follows this structure:

```javascript
{
  subject: "Apple Inc.",           // Canonical form of subject entity
  predicate: "acquired",           // Relationship/action
  object: "Beats Electronics",     // Canonical form of object entity
  metadata: {                      // Optional additional context
    date: "2014",
    amount: "$3 billion",
    purpose: "music streaming"
  }
}
```

## Use Cases

1. **Knowledge Graph Construction**: Build structured representations of entity relationships
2. **Information Extraction**: Extract specific facts and connections from documents
3. **Relationship Analysis**: Understand networks of connections between entities
4. **Fact Verification**: Cross-reference claimed relationships across sources
5. **Timeline Construction**: Extract temporal relationships and sequences
6. **Competitive Intelligence**: Map business relationships and market dynamics

## Tips

- Provide canonical entity forms for consistent relation extraction
- Use specific predicates when you know what relationships to look for
- Include metadata requirements in your instructions for richer output
- Combine with entity extraction for comprehensive information extraction
- Consider temporal aspects when extracting historical or evolving relationships