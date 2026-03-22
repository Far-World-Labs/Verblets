# socratic

Generate a dialogue that explores a topic through the Socratic method — alternating questions and answers that progressively move from surface-level inquiry toward underlying assumptions.

```javascript
import { socratic } from '@far-world-labs/verblets';

const method = await socratic('Should social media platforms be regulated?', {
  challenge: 'high',
});
const dialogue = await method.run(3);
// [
//   { question: 'What fundamental rights conflict when platforms moderate content?',
//     answer: 'Freedom of expression and protection from harm...' },
//   { question: 'Who decides what constitutes "harm" — and by whose standard?',
//     answer: 'Currently platforms themselves, which raises questions about...' },
//   { question: 'If we distrust both platforms and governments to moderate fairly, what alternative remains?',
//     answer: 'Some propose community-based moderation or transparency requirements...' },
// ]
```

Each round builds on the previous dialogue. At `challenge: 'high'`, the questions confront the weakest point in the reasoning; at `'low'`, they gently guide toward insight.

## API

### `socratic(statement, config?)` / `SocraticMethod.create(statement, config?)`

Both return `Promise<SocraticMethod>`. The `socratic` function is a convenience wrapper around `SocraticMethod.create`.

- **statement** (string): Topic or claim to explore
- **config.challenge** (`'low'`|`'med'`|`'high'`): Dialogue intensity. `'low'` uses gentle hints with temperature 0.3. `'high'` uses provocative confrontation with temperature 0.9. Default: exploratory, temperature 0.7.
- **config.ask** (function): Custom question generator — receives `{ topic, history, llm, temperature, challenge, config }`
- **config.answer** (function): Custom answer generator — receives `{ question, history, topic, llm, temperature, config }`
- **config.llm** (string|Object): LLM configuration
- **config.onProgress** (function): Progress callback (emits step events for each turn)

### Instance methods

- **`run(depth?)`** — Run `depth` rounds (default: 3). Returns the full dialogue history as `Array<{ question, answer }>`.
- **`step()`** — Run a single question-answer round. Returns the turn `{ question, answer }`.
- **`getDialogue()`** — Return the accumulated dialogue history so far.
