# bool

Interpret natural language questions as yes/no decisions and return a boolean.
The verblet uses ChatGPT to reason about the provided text and responds with
`true` or `false`.

```javascript
import bool from './index.js';

const result = await bool('Does Mace Windu have a purple lightsaber?');
// result === true
```

## Use case: deployment gate

You can feed dynamic context to `bool` to make policy decisions. Combine local
variables with text to create nuanced yes/no prompts that a large language model
can reason about:

```javascript
const filesChanged = 3;
const testsPassing = 247;
const isFriday = true;

const shouldDeploy = await bool(`
  It's ${isFriday ? 'Friday' : 'a weekday'} at 4:45 PM.
  ${filesChanged} files changed and all ${testsPassing} tests are passing.
  The deployment window closes at 5 PM. Should we deploy to production?
`);

console.log(shouldDeploy);
// => false  (A cautious answer based on the context)
```

This approach enables policy checks and decision gates that rely on natural
language reasoning rather than hard‑coded rules.
