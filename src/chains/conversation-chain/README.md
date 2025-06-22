# ConversationChain

A flexible engine that produces multi-speaker transcripts on demand. Provide a list of speakers and conversation rules. The chain manages turn taking, facilitator remarks, and closing summaries.

```javascript
import ConversationChain from '../../chains/conversation-chain/index.js';

const speakers = [
  { id: 'fac', role: 'facilitator', bio: 'organizes community events' },
  { id: 'max', bio: 'local baker' },
  { id: 'lily', bio: 'youth soccer coach' },
];

const chain = new ConversationChain('neighborhood picnic', speakers, {
  rules: { shouldContinue: (round) => round < 2 },
});
const transcript = await chain.run();
console.log(transcript);
```

Each message in the transcript has the shape `{ id, name, comment, time }` where
`time` is in `HH:MM` format.

For larger conversations you can supply `bulkSpeakFn` and `bulkSummaryFn` implementations. These functions
generate comments or summaries for many speakers in parallel and are ideal for simulations with dozens of speakers.
