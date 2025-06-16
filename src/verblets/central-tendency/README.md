# Central Tendency Verblet

A cognitive science-based function for evaluating how central or prototypical an item is within a category. Based on prototype theory and family resemblance principles from cognitive psychology.

## Overview

The `centralTendency` verblet assesses graded typicality by analyzing feature overlap, core characteristics, and functional alignment with seed items. It implements cognitive science principles to provide nuanced category membership evaluation beyond simple binary classification.

## Cognitive Science Foundations

### Prototype Theory
Categories have graded structure with central (prototypical) and peripheral members. Some items are better examples of a category than others.

### Family Resemblance
Category members share overlapping features without requiring identical characteristics. Items can belong to a category through different combinations of shared features.

### Graded Typicality
Membership exists on a continuum from highly typical (central) to atypical (peripheral) rather than binary in/out classification.

## Basic Usage

```javascript
import { centralTendency } from './index.js';

// Evaluate bird centrality
const birdSeeds = ['robin', 'sparrow', 'bluejay', 'cardinal'];
const config = {
  context: 'Evaluate based on typical bird characteristics and behavior',
  coreFeatures: ['feathers', 'beak', 'lays eggs'],
  llm: 'fastGoodCheap'
};

const result = await centralTendency('robin', birdSeeds, config);
// Returns: { score: 0.92, reason: "Robin exemplifies core bird features...", confidence: 0.88 }

const penguinResult = await centralTendency('penguin', birdSeeds, config);
// Returns: { score: 0.65, reason: "Penguin is a bird but lacks flight...", confidence: 0.82 }
```

## Advanced Features

### Sample Generation
Generate representative category examples:

```javascript
import categorySamples from '../../chains/category-samples/index.js';

const animalSamples = await categorySamples('animal', {
  context: 'Diverse animal kingdom representation across phyla',
  count: 6,
  diversityLevel: 'high', // 'high', 'balanced', or 'focused'
  llm: 'fastGoodCheap'
});
// Returns: ['dog', 'eagle', 'salmon', 'butterfly', 'octopus', 'frog']
```

### Bulk Processing
Evaluate multiple items efficiently:

```javascript
import { bulkCentralTendency } from './index.js';

const testAnimals = ['wolf', 'tiger', 'elephant', 'whale'];
const mammalSeeds = ['dog', 'cat', 'horse', 'cow'];

const results = await bulkCentralTendency(
  testAnimals,
  mammalSeeds,
  {
    context: 'Mammalian characteristics and traits',
    coreFeatures: ['warm-blooded', 'hair/fur', 'mammary glands'],
    llm: 'fastGoodCheap',
    chunkSize: 3,
    maxAttempts: 2
  }
);
```

## Parameters

### centralTendency(item, seedItems, config)

- **item** (string): The item to evaluate for centrality
- **seedItems** (string[]): Array of known category members for comparison
- **config** (Object): Configuration options
  - **context** (string): Context description for evaluation (default: '')
  - **coreFeatures** (string[]): Known core/definitional features of the category (default: [])
  - **llm** (string): LLM model to use (default: 'fastGoodCheap')

### categorySamples(categoryName, config)

- **categoryName** (string): Name of the category
- **config** (Object): Configuration options
  - **context** (string): Context for seed generation (default: '')
  - **count** (number): Number of seed items to generate (default: 8)
  - **diversityLevel** (string): 'high', 'balanced', or 'focused' (default: 'balanced')
  - **llm** (string): LLM model to use (default: 'fastGoodCheap')

## Return Values

### centralTendency Result
```javascript
{
  score: 0.85,        // Centrality score (0.0-1.0)
  reason: "...",      // Brief explanation of assessment
  confidence: 0.82    // Confidence in assessment (0.0-1.0)
}
```

## Cognitive Science Applications

### Natural vs Artifact Categories
```javascript
// Natural categories often have clearer prototypes
const fruitConfig = {
  context: 'Botanical fruit classification based on plant biology',
  coreFeatures: ['seed-bearing', 'develops from flower']
};

// Artifact categories may be more functionally defined
const toolConfig = {
  context: 'Hand tools for mechanical work and construction',
  coreFeatures: ['handheld', 'mechanical advantage']
};
```

### Context Effects on Categorization
```javascript
// Same item, different contexts
const classicalConfig = {
  context: 'Classical orchestral instruments for formal concerts',
  coreFeatures: ['acoustic', 'complex technique', 'wide range']
};

const folkConfig = {
  context: 'Portable folk instruments for informal music',
  coreFeatures: ['portable', 'easy to learn', 'expressive']
};

// Harmonica will score differently in each context
```

### Category Types
The verblet works best with:
- **Natural categories**: Birds, mammals, fruits, minerals
- **Artifact categories**: Tools, vehicles, furniture, instruments  
- **Activity categories**: Sports, games, professions, hobbies
- **Abstract categories**: Emotions, concepts, relationships

Note: Avoid arbitrary collections (e.g., "things in my room") as these lack the coherent structure that prototype theory describes.

## Integration with Concept Science Chains

The `centralTendency` verblet integrates seamlessly with other concept science tools:

```javascript
// Generate seeds, then evaluate centrality
const seeds = await categorySamples('vehicle', { context: 'Land transportation' });
const centrality = await centralTendency('bicycle', seeds, { context: 'Personal transportation' });

// Use in concept hierarchies
const superordinateSeeds = await categorySamples('animal');
const basicLevelSeeds = await categorySamples('bird');
const subordinateResult = await centralTendency('robin', basicLevelSeeds);
```

