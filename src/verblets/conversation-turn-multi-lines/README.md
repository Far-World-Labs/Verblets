# conversation-turn-multi-lines

Generate multiple conversation turns simultaneously for different speakers in a multi-participant dialogue. This verblet efficiently processes multiple speakers at once while maintaining individual context and voice.

```javascript
import conversationTurnMultiLines from './src/verblets/conversation-turn-multi-lines/index.js';

const speakers = [
  { id: 'chef', name: 'Marco', bio: 'Head chef with 15 years experience' },
  { id: 'server', name: 'Lisa', bio: 'Senior server, wine specialist' },
  { id: 'manager', name: 'David', bio: 'Restaurant manager focused on customer experience' }
];

const history = [
  { id: 'customer', name: 'Customer', comment: 'The food was excellent but service was slow', time: '14:30' }
];

const responses = await conversationTurnMultiLines({
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