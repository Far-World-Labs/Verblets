# fill-missing

Infer the missing or censored portions of text or structured data.

This verblet analyzes context to suggest replacements for each missing section. It returns a template with numbered placeholders and a map of suggested values with confidence scores.

```javascript
import fillMissing from './index.js';
import templateReplace from '../../lib/template-replace/index.js';

const { template, variables } = await fillMissing('The ??? sailed across the ??? river.');

const confident = Object.fromEntries(
  Object.entries(variables)
    .filter(([, v]) => v.confidence > 0.75)
    .map(([k, v]) => [k, v.candidate])
);

const finalText = templateReplace(template, confident, '[unknown]');
console.log(finalText); // "The explorer sailed across the Nile river." (example)
```
