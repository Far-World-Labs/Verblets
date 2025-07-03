# collect-terms

Extract the most difficult or technical terms from any passage. Useful for building a glossary or highlighting vocabulary that needs clarification.

## Usage

```javascript
import collectTerms from './collect-terms/index.js';

const terms = await collectTerms(longText, { topN: 15 });
// => ['usufructuary rights', 'riparian', 'hydrological cycle', ...]
```

## Parameters

- **`text`** (string, required): The text passage to analyze for technical terms
- **`config`** (object, optional): Configuration options
  - **`topN`** (number, default: 10): Maximum number of terms to extract
  - **`minComplexity`** (number, default: 3): Minimum complexity threshold for term selection
  - **`excludeCommon`** (boolean, default: true): Whether to exclude common words
  - **`llm`** (object, optional): LLM configuration for analysis

## Return Value

Returns an array of strings representing the most difficult or technical terms found in the text, ordered by complexity/importance.

## Features

- **Intelligent Term Recognition**: Identifies technical jargon, specialized vocabulary, and complex concepts
- **Complexity Scoring**: Ranks terms by difficulty and technical specificity
- **Contextual Analysis**: Considers domain-specific terminology and field expertise
- **Configurable Filtering**: Adjustable thresholds for term selection and exclusion
- **Multi-domain Support**: Works across various fields including legal, medical, scientific, and technical texts

## Use Cases

### Academic Research
```javascript
const academicText = "The phenomenological approach to consciousness studies...";
const terms = await collectTerms(academicText, { topN: 8 });
// => ['phenomenological', 'consciousness studies', 'intentionality', ...]
```

### Legal Document Analysis
```javascript
const legalText = "The aforementioned usufructuary rights shall be...";
const terms = await collectTerms(legalText, { 
  topN: 12, 
  minComplexity: 4 
});
// => ['usufructuary rights', 'aforementioned', 'indemnification', ...]
```

### Technical Documentation
```javascript
const techDoc = "The microservice architecture implements...";
const terms = await collectTerms(techDoc, { 
  topN: 10,
  excludeCommon: true 
});
// => ['microservice architecture', 'containerization', 'orchestration', ...]
```

## Advanced Usage

### Custom Complexity Thresholds
```javascript
const terms = await collectTerms(text, {
  topN: 20,
  minComplexity: 2,  // Lower threshold for more inclusive results
  excludeCommon: false
});
```

### Batch Processing
```javascript
const documents = [doc1, doc2, doc3];
const allTerms = await Promise.all(
  documents.map(doc => collectTerms(doc, { topN: 5 }))
);
```

## Integration Patterns

### With Glossary Generation
```javascript
import collectTerms from './collect-terms/index.js';
import { define } from '../define/index.js';

const terms = await collectTerms(document);
const glossary = await Promise.all(
  terms.map(async term => ({
    term,
    definition: await define(term)
  }))
);
```

### With Content Analysis
```javascript
import collectTerms from './collect-terms/index.js';
import { analyze } from '../analyze/index.js';

const terms = await collectTerms(content);
const analysis = await analyze(`Key terms: ${terms.join(', ')}`);
```

## Related Modules

- [`define`](../define/README.md) - Generate definitions for extracted terms
- [`analyze`](../analyze/README.md) - Analyze content complexity and readability
- [`summarize`](../summarize/README.md) - Create summaries highlighting key concepts

## Error Handling

```javascript
try {
  const terms = await collectTerms(text, config);
  console.log(`Extracted ${terms.length} technical terms`);
} catch (error) {
  if (error.message.includes('Empty text')) {
    console.log('No text provided for analysis');
  } else if (error.message.includes('Invalid config')) {
    console.log('Configuration parameters are invalid');
  } else {
    console.error('Term extraction failed:', error.message);
  }
}
```
