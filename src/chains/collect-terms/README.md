# collect-terms

Extract the most difficult or technical terms from any passage. Useful for building a glossary or highlighting vocabulary that needs clarification.

## Usage

```javascript
import collectTerms from './collect-terms/index.js';

const terms = await collectTerms(longText, { topN: 15 });
// => ['usufructuary rights', 'riparian', 'hydrological cycle', ...]
```
