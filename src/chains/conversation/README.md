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

## Parameters

- **`topic`** (string, required): The conversation topic or subject
- **`speakers`** (array, required): Array of speaker objects with:
  - **`id`** (string): Unique identifier for the speaker
  - **`role`** (string, optional): Speaker's role in the conversation
  - **`bio`** (string, optional): Background information about the speaker
  - **`name`** (string, optional): Display name (defaults to capitalized id)
- **`config`** (object, optional): Configuration options
  - **`rules`** (object): Conversation flow rules
    - **`shouldContinue`** (function): Function to determine if conversation should continue
    - **`maxRounds`** (number, default: 5): Maximum number of conversation rounds
  - **`llm`** (object): LLM configuration for conversation generation

## Return Value

Returns an array of message objects:
```javascript
{
  id: string,        // Speaker ID
  name: string,      // Speaker display name
  comment: string,   // The speaker's contribution
  time: string       // Timestamp in HH:MM format
}
```

## Use Cases

### Community Planning Meeting
Generate realistic multi-stakeholder discussions for planning scenarios:

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
