# sentiment

Classify text as positive, negative, or neutral.

```javascript
import { sentiment } from '@far-world-labs/verblets';

await sentiment('I love this!');           // => 'positive'
await sentiment('This is terrible');       // => 'negative'
await sentiment('The weather is cloudy');  // => 'neutral'
await sentiment('Mixed feelings — good quality but expensive'); // => 'neutral'
```

## API

### `sentiment(text, config?)`

- **text** (string): Text to analyze
- **config.llm** (string|Object): LLM model configuration

**Returns:** `Promise<string>` — `'positive'`, `'negative'`, or `'neutral'`
