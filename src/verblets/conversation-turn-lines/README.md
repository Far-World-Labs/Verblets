# conversation-turn-lines

Generate contextual conversation turns with role-aware AI responses. This verblet creates natural dialogue by understanding participant context, conversation history, and situational dynamics.

```javascript
import conversationTurnLines from './src/verblets/conversation-turn-lines/index.js';

const speaker = {
  id: 'therapist',
  name: 'Dr. Sarah Chen',
  bio: 'Licensed clinical psychologist specializing in anxiety disorders',
  agenda: 'Help the client develop coping strategies'
};

const history = [
  { id: 'client', name: 'Alex', comment: 'I feel overwhelmed at work lately', time: '10:15' },
  { id: 'therapist', name: 'Dr. Sarah Chen', comment: 'Can you tell me more about what specifically feels overwhelming?', time: '10:16' },
  { id: 'client', name: 'Alex', comment: 'Deadlines keep piling up and I can\'t seem to prioritize', time: '10:17' }
];

const response = await conversationTurnLines({
  speaker,
  topic: 'managing work stress and anxiety',
  history,
  rules: { customPrompt: 'Use therapeutic techniques like reflection and open-ended questions' }
});

console.log(response);
// "It sounds like you're experiencing decision paralysis when faced with multiple competing priorities. 
//  Have you noticed if there are particular times of day or types of tasks where this feeling is stronger?"
```

Ideal for creating realistic individual responses in therapeutic sessions, interviews, coaching conversations, or any scenario where authentic, personalized dialogue is needed. 