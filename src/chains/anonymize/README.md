# anonymize

Remove personal style, references, and formatting from text to conceal the original author. The chain runs through your configured LLM models, so it works with fully private or self‑hosted LLMs.

Supported methods: `STRICT`, `BALANCED`, and `LIGHT` to control how aggressively style is removed.


```javascript
import anonymize, { anonymizeMethod } from './index.js';

const message = `As a software lead in Chicago, I've found our new UI framework helps junior devs ramp up fast.`;

const { text } = await anonymize({
  text: message,
  method: anonymizeMethod.STRICT,
});

console.log(text);
// => "The new UI framework shortens the learning curve for new developers."
```

