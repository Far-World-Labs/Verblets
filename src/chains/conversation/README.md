# conversation

Generate realistic multi-speaker transcripts with contextual turn-taking.

## Example

```javascript
import Conversation from './index.js';

// Simulate a focus group with distinct personas
const focusGroup = new Conversation('mobile app redesign feedback', [
  { id: 'mod', role: 'facilitator', bio: 'UX research lead, keeps discussion focused' },
  { id: 'alex', bio: 'power user, age 28, uses app daily for work' },
  { id: 'sam', bio: 'casual user, age 45, switched from a competitor last month' },
  { id: 'jordan', bio: 'new user, age 19, found app through TikTok' }
], {
  rules: { shouldContinue: (round) => round < 4 }
});

const transcript = await focusGroup.run();
// => [
//   { id: 'mod', name: 'Mod', comment: 'Let\'s start with first impressions...', time: '10:00' },
//   { id: 'alex', name: 'Alex', comment: 'The new nav is faster but...', time: '10:02' },
//   ...
// ]
```

## API

### `new Conversation(topic, speakers, config?)`

- **topic** (string): Conversation subject
- **speakers** (array): Speaker objects:
  - `id` (string, required): Unique identifier
  - `role` (string): Role in conversation (e.g. `'facilitator'`)
  - `bio` (string): Background shaping the speaker's perspective
  - `name` (string): Display name (defaults to capitalized id)
- **config** (object):
  - `rules.shouldContinue` (function): `(round, transcript) => boolean` (default: 3 rounds)
  - `bulkSpeakFn` (function): Custom bulk response generator
  - `speakFn` (function): Custom individual response generator
  - `maxParallel` (number, default: 3): Concurrent speaker calls
  - `llm` (object): LLM configuration

### `run()`

Returns `Array<{ id, name, comment, time }>`.
