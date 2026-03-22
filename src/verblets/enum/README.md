# enum

Classify free-form text into exactly one of several predefined categories. Exported as `classify` from the package.

The LLM evaluates the text's meaning against the provided options — it understands intent and context, not just keyword matching.

```javascript
import { classify } from '@far-world-labs/verblets';

await classify('This needs to be done ASAP!!!', ['low', 'medium', 'high', 'critical']);
// => 'critical'

await classify('quantum physics research', ['sports', 'cooking', 'fashion']);
// => undefined
```

When no option fits, the result is `undefined` rather than a forced match.

## API

### `classify(text, options, config?)`

- **text** (string): Input to classify
- **options** (string[]): Categories to choose from. The LLM sees these as an enum and picks the best match.
- **config.llm** (string|Object): LLM configuration

**Returns:** `Promise<string | undefined>` — one of the provided options, or `undefined` if none applies.

## Related

- [sentiment](../../verblets/sentiment/README.md) — positive/negative/neutral classification
- [bool](../../verblets/bool/README.md) — yes/no classification
