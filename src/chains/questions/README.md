# questions

Generate questions from input text using an iterative exploration strategy. Each round picks interesting questions from the previous round and uses them as seeds for deeper inquiry, building a branching tree of questions that covers the topic from multiple angles.

```javascript
import { questions } from '@far-world-labs/verblets';

const qs = await questions(
  'The city of Venice is sinking at a rate of 1-2mm per year while sea levels rise',
  {
    exploration: 'high',
    shouldStop: (q, all) => all.length > 25
  }
);
// => [
//   'What engineering solutions have been proposed to counteract subsidence?',
//   'How does the salt content of the Adriatic affect foundation erosion?',
//   'What would a managed retreat from Venice look like economically?',
//   ...25 more questions spanning engineering, ecology, economics, history
// ]
```

### Routing through a privacy-capable model

For text that should not be sent to a cloud model — clinical notes, internal incident write-ups, anything you'd rather keep local — pass `llm: { sensitive: true }`. The library routes the call to whichever model your rules map sensitive traffic to (typically a local Ollama / OpenWebUI host):

```javascript
const qs = await questions(
  patientNoteText,
  {
    exploration: 'low',
    shouldStop: (q, all) => all.length > 10,
    llm: { sensitive: true },
  }
);
```

## API

### `questions(text, config?)`

- **text** (string): Input text to generate questions about
- **config.exploration** (`'low'`|`'high'`|number): Controls breadth of exploration. `'low'` focuses narrowly (0.3). `'high'` explores broadly (0.8). A raw number (0–1) passes through directly. Default: 0.5
- **config.shouldSkip** (function): Skip specific questions. Receives `(question, allQuestions)`, returns boolean
- **config.shouldStop** (function): Stop generation early. Receives `(question, allQuestions, recentQuestions, attempts)`, returns boolean
- **config.llm** (string|Object): LLM model configuration

**Returns:** `Promise<string[]>` — Unique questions, sorted alphabetically

## Algorithm

The chain works in rounds. The first round generates questions directly from the input text. Each subsequent round selects the most interesting questions from the previous batch and uses them as new input, with the `exploration` dial controlling how broadly or narrowly to branch. Duplicates are filtered automatically. Generation stops when either the `shouldStop` callback returns true or built-in limits are reached (50+ questions or 5+ attempts). 