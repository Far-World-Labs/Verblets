# enum

Classify free-form text into exactly one of several predefined categories.

```javascript
import { classify } from '@far-world-labs/verblets';

// Understands intent, not just keywords
await classify('This needs to be done ASAP!!!', ['low', 'medium', 'high', 'critical']);
// => 'critical'

// Returns undefined when nothing fits
await classify('quantum physics research', ['sports', 'cooking', 'fashion']);
// => undefined
```

## API

### `classify(text, options, config?)`

- **text** (string): Input text to classify
- **options** (string[]): Possible categories to choose from
- **config** (Object): Configuration options
  - **llm**: LLM configuration

**Returns:** Promise\<string | undefined\> — One of the provided options, or undefined
