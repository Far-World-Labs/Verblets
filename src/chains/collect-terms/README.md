# collect-terms

Extract key search terms and phrases from text to improve document retrieval and search relevance.

## Usage

```javascript
import collectTerms from './index.js';

const document = `
The quantum entanglement phenomenon demonstrates non-local correlations 
between particles. Bell's theorem proves these correlations cannot be 
explained by hidden variables in classical physics.
`;

const terms = await collectTerms(document, { topN: 10 });
// => ['quantum entanglement', 'non-local correlations', 'Bell theorem', 
//     'hidden variables', 'classical physics', ...]
```

## API

### `collectTerms(text, config)`

Analyzes text to extract the most relevant search terms and phrases.

**Parameters:**
- `text` (string): The text to analyze
- `config` (Object): Configuration options
  - `chunkLen` (number): Maximum chunk size for processing (default: 1000)
  - `topN` (number): Number of top terms to return (default: 20)
  - `llm` (Object): LLM configuration

**Returns:** Promise<Array<string>> - Array of the most relevant search terms

## How It Works

1. **Chunking**: Splits long text into manageable chunks
2. **Term Extraction**: Uses AI to identify key words and phrases from each chunk
3. **Deduplication**: Removes duplicate terms across chunks
4. **Scoring**: Ranks terms by relevance as search keywords
5. **Selection**: Returns the top N most relevant terms

## Examples

### Technical Documentation
```javascript
const technicalDoc = await fs.readFile('api-docs.md', 'utf8');
const searchTerms = await collectTerms(technicalDoc, { topN: 15 });
// Extract key API concepts and terminology
```

### Research Papers
```javascript
const paper = `
This study investigates mitochondrial DNA mutations in aging cells.
We observed increased oxidative stress markers and telomere shortening.
`;
const keywords = await collectTerms(paper, { topN: 8 });
// => ['mitochondrial DNA', 'mutations', 'aging cells', 'oxidative stress', ...]
```

### Legal Documents
```javascript
const contract = await fs.readFile('service-agreement.txt', 'utf8');
const legalTerms = await collectTerms(contract, { topN: 20, chunkLen: 1500 });
// Extract key legal terms and clauses for indexing
```

## Best Practices

- Use larger `chunkLen` for documents with complex interconnected concepts
- Adjust `topN` based on document length and diversity
- For very long documents, consider using with `document-shrink` first
- Results work well with TF-IDF and other search algorithms