# conversation

Generate realistic multi-speaker transcripts with intelligent turn-taking, contextual responses, and natural conversation flow.

## Usage

```javascript
import Conversation from './conversation/index.js';

const speakers = [
  { id: 'fac', role: 'facilitator', bio: 'organizes community events' },
  { id: 'max', bio: 'local baker' },
  { id: 'lily', bio: 'youth soccer coach' }
];

const chain = new Conversation('neighborhood picnic planning', speakers, {
  rules: { shouldContinue: (round) => round < 3 }
});

const transcript = await chain.run();
console.log(transcript);
// => [
//   { id: 'fac', name: 'Facilitator', comment: 'Welcome everyone...', time: '09:00' },
//   { id: 'max', name: 'Max', comment: 'I can provide baked goods...', time: '09:02' },
//   ...
// ]
```

## Constructor Parameters

- **`topic`** (string, required): The conversation topic or subject
- **`speakers`** (array, required): Array of speaker objects with properties:
  - **`id`** (string, required): Unique identifier for the speaker
  - **`role`** (string, optional): Speaker's role in the conversation
  - **`bio`** (string, optional): Background information about the speaker
  - **`name`** (string, optional): Display name (defaults to capitalized id)
- **`config`** (object, optional): Configuration options
  - **`rules`** (object, optional): Conversation flow rules
    - **`shouldContinue`** (function, optional): Function to determine if conversation should continue
    - **`maxRounds`** (number, default: 5): Maximum number of conversation rounds
  - **`bulkSpeakFn`** (function, optional): Custom function for generating multiple responses
  - **`speakFn`** (function, optional): Custom function for generating individual responses
  - **`llm`** (object, optional): LLM configuration for conversation generation

## Methods

### `run()`
Executes the full conversation and returns the complete transcript.

**Returns**: Array of message objects with structure:
```javascript
{
  id: string,        // Speaker ID
  name: string,      // Speaker display name
  comment: string,   // The speaker's contribution
  time: string       // Timestamp in HH:MM format
}
```

## Features

- **Intelligent Turn-Taking**: Manages natural conversation flow between multiple speakers
- **Contextual Responses**: Each speaker responds based on their background and the conversation history
- **Flexible Speaker Roles**: Supports facilitators, participants, and specialized roles
- **Customizable Rules**: Define when conversations should continue or conclude
- **Realistic Timing**: Generates believable timestamps for each contribution
- **Extensible Functions**: Override default speaking functions for specialized behaviors

## Use Cases

### Community Planning Meeting
```javascript
const speakers = [
  { id: 'mayor', role: 'facilitator', bio: 'city mayor, experienced in public meetings' },
  { id: 'resident1', bio: 'longtime resident, concerned about traffic' },
  { id: 'business', bio: 'local business owner' },
  { id: 'planner', role: 'expert', bio: 'urban planning consultant' }
];

const meeting = new Conversation('downtown revitalization project', speakers, {
  rules: { shouldContinue: (round) => round < 4 }
});

const transcript = await meeting.run();
```

### Focus Group Discussion
```javascript
const participants = [
  { id: 'moderator', role: 'facilitator', bio: 'market research professional' },
  { id: 'user1', bio: 'frequent app user, age 25-34' },
  { id: 'user2', bio: 'occasional user, age 35-44' },
  { id: 'user3', bio: 'new user, age 18-24' }
];

const focusGroup = new Conversation('mobile app user experience', participants);
const feedback = await focusGroup.run();
```

### Team Brainstorming Session
```javascript
const team = [
  { id: 'lead', role: 'facilitator', bio: 'product manager' },
  { id: 'dev', bio: 'senior developer' },
  { id: 'design', bio: 'UX designer' },
  { id: 'qa', bio: 'quality assurance engineer' }
];

const brainstorm = new Conversation('new feature ideation', team, {
  rules: { maxRounds: 6 }
});

const ideas = await brainstorm.run();
```

### Educational Seminar
```javascript
const seminar = [
  { id: 'prof', role: 'facilitator', bio: 'computer science professor' },
  { id: 'student1', bio: 'graduate student in AI' },
  { id: 'student2', bio: 'undergraduate in computer science' },
  { id: 'industry', role: 'expert', bio: 'machine learning engineer' }
];

const discussion = new Conversation('future of artificial intelligence', seminar);
const transcript = await discussion.run();
```

## Advanced Usage

### Custom Speaking Functions
```javascript
const customSpeakFn = async (speaker, context, topic) => {
  // Custom logic for generating responses
  return `${speaker.name}: [Custom response based on ${topic}]`;
};

const conversation = new Conversation(topic, speakers, {
  speakFn: customSpeakFn
});
```

### Dynamic Conversation Rules
```javascript
const dynamicRules = {
  shouldContinue: (round, transcript) => {
    // Continue if less than 5 rounds and no consensus reached
    return round < 5 && !transcript.some(msg => msg.comment.includes('consensus'));
  }
};

const conversation = new Conversation(topic, speakers, {
  rules: dynamicRules
});
```

### Batch Processing Multiple Topics
```javascript
const topics = ['budget planning', 'event coordination', 'volunteer recruitment'];
const conversations = await Promise.all(
  topics.map(topic => new Conversation(topic, speakers).run())
);
```

## Integration Patterns

### With Content Analysis
```javascript
import Conversation from './conversation/index.js';
import { analyze } from '../analyze/index.js';

const transcript = await new Conversation(topic, speakers).run();
const analysis = await analyze(transcript.map(msg => msg.comment).join('\n'));
```

### With Summarization
```javascript
import Conversation from './conversation/index.js';
import { summarize } from '../summarize/index.js';

const transcript = await new Conversation(topic, speakers).run();
const summary = await summarize(transcript.map(msg => msg.comment).join('\n'));
```

## Related Modules

- [`ask`](../ask/README.md) - Generate single responses to questions
- [`debate`](../debate/README.md) - Create structured debates between positions
- [`interview`](../interview/README.md) - Conduct one-on-one interviews

## Error Handling

```javascript
try {
  const conversation = new Conversation(topic, speakers, config);
  const transcript = await conversation.run();
  console.log(`Generated conversation with ${transcript.length} messages`);
} catch (error) {
  if (error.message.includes('Invalid speakers')) {
    console.log('Speaker configuration is invalid');
  } else if (error.message.includes('Empty topic')) {
    console.log('Conversation topic is required');
  } else {
    console.error('Conversation generation failed:', error.message);
  }
}
```
