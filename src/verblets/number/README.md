# number

Extract a single number from natural language text.

```javascript
import { number } from '@far-world-labs/verblets';

await number('The recipe calls for three-quarters of a cup');  // 0.75
await number('About two and a half million visitors per year'); // 2500000
await number('No numeric information here');                    // undefined
```

## API

### `number(text, config?)`

- **text** (string): Text containing numeric information
- **config** (Object): Configuration options
  - **llm**: LLM configuration

**Returns:** Promise\<number | undefined\> — Extracted number, or undefined if none found
