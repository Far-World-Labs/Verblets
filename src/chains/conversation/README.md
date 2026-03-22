# conversation

Generate multi-speaker transcripts with contextual turn-taking. Each round, a turn policy selects which speakers participate, and either a bulk or per-speaker function generates their comments.

```javascript
import { Conversation } from '@far-world-labs/verblets';

const focusGroup = await Conversation.create('mobile app redesign feedback', [
  { id: 'mod', bio: 'UX research lead, keeps discussion focused' },
  { id: 'alex', bio: 'power user, age 28, uses app daily for work' },
  { id: 'sam', bio: 'casual user, age 45, switched from a competitor last month' },
  { id: 'jordan', bio: 'new user, age 19, found app through TikTok' }
], {
  rules: { shouldContinue: (round, transcript) => round < 4 }
});

const transcript = await focusGroup.run();
// [
//   { id: 'mod', name: 'Speaker 1', comment: 'Let\'s start with first impressions...', time: '10:00' },
//   { id: 'alex', name: 'Speaker 2', comment: 'The new nav is faster but...', time: '10:02' },
//   ...
// ]
```

## API

### `await Conversation.create(topic, speakers, options?)`

Async factory — resolves `depth` and `maxParallel` through the option system before constructing.

- **topic** (string): Conversation subject
- **speakers** (array): Speaker objects with `id` (required), `bio`, `name`, and `agenda`
- **options** (object):
  - `rules.shouldContinue` — `(round, messages) => boolean` (default: `round < depth`)
  - `rules.turnPolicy` — `(round, messages) => string[]` of speaker ids (default: all speakers each round)
  - `bulkSpeakFn` (function): Receives `{ speakers, topic, history, rules, llm }`, returns array of comments
  - `speakFn` (function): Receives `{ speaker, topic, history, rules, llm }`, returns a single comment
  - `depth` (number, default: 3): Number of rounds when using default `shouldContinue`
  - `maxParallel` (number, default: 3): Concurrent speaker calls when using `speakFn`
  - `llm` (string|object): LLM configuration

When neither `speakFn` nor `bulkSpeakFn` is provided, the built-in `conversationTurnReduce` chain generates all comments for the round in a single LLM call.

### `run()`

Returns `Array<{ id, name, comment, time }>`.
