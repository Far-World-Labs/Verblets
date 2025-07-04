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

## Advanced Usage

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
