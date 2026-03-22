# socratic

Generate thought-provoking questions using the Socratic method to encourage deeper thinking and self-discovery through intelligent questioning.

## Usage

```javascript
import { socratic } from '@far-world-labs/verblets';

const topic = "Should social media platforms be regulated?";
const method = await socratic(topic, { challenge: 'high' });
const questions = await method.run(3);

// Returns: [
//   "What fundamental rights might be at stake when regulating social media?",
//   "How do we balance free speech with preventing harm?",
//   "Who should have the authority to determine what content is acceptable?",
//   "What are the potential consequences of both regulation and non-regulation?",
//   "How might different stakeholders be affected by these decisions?"
// ]
```

## API

### `socratic(statement, config)` / `SocraticMethod.create(statement, config)`

**Parameters:**
- `statement` (string): Subject or statement to explore
- `config` (Object): Configuration options
  - `challenge` (`'low'`|`'high'`): Controls dialogue intensity. `'low'` uses gentle hints with lower temperature (0.3). `'high'` uses provocative confrontation with higher temperature (0.9). Default: moderate challenge
  - `llm` (string|Object): LLM model configuration

**Returns:** Promise<SocraticMethod> - Socratic dialogue instance. Call `.run(depth)` to generate questions (default depth: 3)

Each round builds on previous questions, progressively moving from surface-level inquiry toward underlying assumptions and values. The `challenge` dial controls the tone — from gentle hints at `'low'` to provocative confrontation at `'high'`.
