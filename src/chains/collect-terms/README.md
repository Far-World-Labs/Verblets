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

## Use Cases

### Academic Research
```javascript
const academicText = "The phenomenological approach to consciousness studies...";
const terms = await collectTerms(academicText, { topN: 8 });
// => ['phenomenological', 'consciousness studies', 'intentionality', ...]
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
