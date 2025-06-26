# Conversation

A flexible engine that produces multi-speaker transcripts on demand. Provide a list of speakers and conversation rules. The chain manages turn taking, facilitator remarks, and closing summaries.

```javascript
import Conversation from './src/chains/conversation/index.js';

const speakers = [
  { id: 'fac', role: 'facilitator', bio: 'organizes community events' },
  { id: 'max', bio: 'local baker' },
  { id: 'lily', bio: 'youth soccer coach' },
];

const chain = new Conversation('neighborhood picnic', speakers, {
  rules: { shouldContinue: (round) => round < 2 },
});
const transcript = await chain.run();
console.log(transcript);
```

Each message in the transcript has the shape `{ id, name, comment, time }` where
`time` is in `HH:MM` format.

The conversation engine uses `conversation-turn-multi` and `conversation-turn` verblets internally to generate contextual responses. You can supply custom `bulkSpeakFn` and `speakFn` implementations for specialized conversation behaviors.

Perfect for simulating realistic discussions, focus groups, team meetings, or any multi-participant dialogue where each speaker brings their unique perspective and expertise to the conversation.
