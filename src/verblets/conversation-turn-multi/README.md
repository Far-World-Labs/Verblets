# conversation-turn-multi

Generate conversation responses for multiple speakers in a single call. Efficiently produces contextual responses that reflect each speaker's unique perspective and background.

```javascript
import conversationTurnMulti from './src/verblets/conversation-turn-multi/index.js';

const speakers = [
  { id: 'chef', name: 'Marco', bio: 'Head chef with 15 years experience' },
  { id: 'server', name: 'Lisa', bio: 'Senior server, wine specialist' },
  { id: 'manager', name: 'David', bio: 'Restaurant manager focused on customer experience' }
];

const history = [
  { id: 'customer', name: 'Customer', comment: 'The food was excellent but service was slow', time: '14:30' }
];

const responses = await conversationTurnMulti({
  speakers,
  topic: 'improving restaurant service quality',
  history,
  rules: { customPrompt: 'Focus on practical solutions' }
});

console.log(responses);
// ['We can streamline our kitchen prep to reduce wait times', 
//  'I suggest implementing a better table management system',
//  'Let me coordinate between kitchen and front of house better']
```

Perfect for generating realistic multi-person discussions, focus groups, or team brainstorming sessions where each participant brings their unique expertise and viewpoint to the conversation. 