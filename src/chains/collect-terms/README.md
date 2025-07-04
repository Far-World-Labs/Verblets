# collect-terms

Extract and organize specialized terminology from text using AI-powered analysis with intelligent categorization and contextual understanding.

## Usage

```javascript
import collectTerms from './index.js';

const text = `
Machine learning algorithms use neural networks to process data. 
Deep learning models employ backpropagation for training. 
Supervised learning requires labeled datasets, while unsupervised learning finds patterns without labels.
`;

const terms = await collectTerms(text, 'machine learning terminology');

// Returns: [
//   { term: 'machine learning', category: 'field', definition: 'AI technique for pattern recognition' },
//   { term: 'neural networks', category: 'architecture', definition: 'Computing systems inspired by biological neural networks' },
//   { term: 'deep learning', category: 'technique', definition: 'ML using deep neural networks' },
//   { term: 'backpropagation', category: 'algorithm', definition: 'Training algorithm for neural networks' },
//   { term: 'supervised learning', category: 'approach', definition: 'Learning with labeled training data' },
//   { term: 'unsupervised learning', category: 'approach', definition: 'Learning without labeled data' }
// ]
```

## API

### `collectTerms(text, domain, config)`

**Parameters:**
- `text` (string): Text to extract terms from
- `domain` (string): Domain or field context for term extraction
- `config` (Object): Configuration options
  - `includeDefinitions` (boolean): Include term definitions (default: true)
  - `categorize` (boolean): Group terms by category (default: true)
  - `minTermLength` (number): Minimum term length (default: 2)
  - `maxTerms` (number): Maximum number of terms to extract (default: 50)
  - `llm` (Object): LLM model options

**Returns:** Promise<Array<Object>> - Array of term objects with structure:
```javascript
{
  term: string,       // The extracted term
  category: string,   // Term category
  definition: string, // Term definition
  frequency: number   // Frequency in text
}
```

## Features

- **Domain-Aware Extraction**: Focuses on terminology relevant to specified domains
- **Intelligent Categorization**: Groups terms by type, concept, or function
- **Contextual Definitions**: Provides definitions based on usage context
- **Frequency Analysis**: Tracks term occurrence and importance
- **Flexible Configuration**: Customizable extraction criteria and output format

## Use Cases

### Technical Documentation Analysis
```javascript
import collectTerms from './index.js';

const documentation = `
RESTful APIs use HTTP methods for CRUD operations. 
Authentication tokens secure endpoints, while middleware handles request processing.
`;

const apiTerms = await collectTerms(documentation, 'web development', { maxTerms: 10 });
// Returns web development terminology with definitions
```

### Academic Paper Processing
```javascript
const paper = `
The study employed quantitative methods with statistical significance testing.
Correlation analysis revealed significant relationships between variables.
`;

const researchTerms = await collectTerms(paper, 'research methodology', { 
  categorize: true,
  includeDefinitions: true 
});
// Returns categorized research terminology
```

### Legal Document Analysis
```javascript
const contract = `
The parties agree to binding arbitration for dispute resolution.
Confidentiality clauses protect proprietary information.
`;

const legalTerms = await collectTerms(contract, 'contract law', { minTermLength: 3 });
// Returns legal terminology relevant to contracts
```
