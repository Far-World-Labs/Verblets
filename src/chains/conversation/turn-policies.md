# Turn Policies

Turn policies control the order and selection of speakers in conversation chains. They are functions that take `(round, history)` parameters and return an array of speaker IDs for that round.

## Available Policies

### `roundRobin(speakers)`

Simple round-robin turn policy that cycles through speakers in order.

```javascript
import { turnPolicies } from '@far-world-labs/verblets';

const speakers = [
  { id: 'alice', name: 'Alice' },
  { id: 'bob', name: 'Bob' },
  { id: 'charlie', name: 'Charlie' }
];

const policy = turnPolicies.roundRobin(speakers);
// Round 0: ['alice']
// Round 1: ['bob'] 
// Round 2: ['charlie']
// Round 3: ['alice'] (cycles back)
```

### `probabilisticSampling(speakers, options)`

Advanced probabilistic sampling that can select multiple speakers per round with configurable weights.

**Options:**
- `weights` - Array of weights for each speaker (defaults to equal weights)
- `minSpeakers` - Minimum speakers per round (default: 1)
- `maxSpeakers` - Maximum speakers per round (default: min(speakers.length, 3))

```javascript
const policy = turnPolicies.probabilisticSampling(speakers, {
  weights: [5, 3, 2], // Alice speaks most often, Charlie least
  minSpeakers: 1,
  maxSpeakers: 2
});

// Can return: ['alice'], ['bob', 'alice'], ['charlie', 'bob'], etc.
```

### `defaultTurnPolicy(speakers)`

Default policy used when no turn policy is specified. Uses probabilistic sampling with up to 5 speakers per round.

```javascript
const policy = turnPolicies.defaultTurnPolicy(speakers);
// Equivalent to probabilisticSampling with maxSpeakers: min(speakers.length, 5)
```

## Usage in Conversations

```javascript
import Conversation, { turnPolicies } from '@far-world-labs/verblets';

const speakers = [
  { id: 'facilitator', name: 'Sarah', bio: 'meeting facilitator' },
  { id: 'engineer', name: 'Mike', bio: 'software engineer' },
  { id: 'designer', name: 'Lisa', bio: 'UX designer' }
];

// Using round-robin
const conversation = new Conversation('project planning', speakers, {
  rules: {
    turnPolicy: turnPolicies.roundRobin(speakers),
    shouldContinue: (round) => round < 5
  }
});

// Using probabilistic with custom weights
const dynamicConversation = new Conversation('brainstorming', speakers, {
  rules: {
    turnPolicy: turnPolicies.probabilisticSampling(speakers, {
      weights: [2, 4, 4], // Facilitator speaks less, others speak more
      maxSpeakers: 2
    }),
    shouldContinue: (round) => round < 3
  }
});
```

## Custom Turn Policies

You can create your own turn policies:

```javascript
function customPolicy(speakers) {
  const speakerIds = speakers.map(s => s.id);
  
  return function(round, history) {
    // Your custom logic here
    // Return array of speaker IDs for this round
    
    if (round === 0) {
      return [speakerIds[0]]; // First speaker starts
    }
    
    // Analyze history to determine next speakers
    const lastSpeaker = history[history.length - 1]?.id;
    return speakerIds.filter(id => id !== lastSpeaker);
  };
}

const conversation = new Conversation('topic', speakers, {
  rules: { 
    turnPolicy: customPolicy(speakers),
    shouldContinue: (round) => round < 4
  }
});
```

## Behavior Notes

- If a turn policy returns an empty array, the conversation falls back to the default sampling policy
- Speakers can appear multiple times in a single round (with probabilistic sampling)
- The same speaker can speak consecutively across rounds
- Turn policies receive the full conversation history to make informed decisions
- Maximum of 5 speakers per round is enforced by default to maintain conversation quality
- Weights are automatically normalized, so `[1, 2, 3]` is equivalent to `[0.167, 0.333, 0.5]` 