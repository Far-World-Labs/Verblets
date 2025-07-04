# socratic

Guide deeper understanding through automated Socratic questioning that generates and answers a series of probing questions. The chain facilitates self-discovery by creating a dialogue that progressively explores assumptions and reasoning.

## Usage

```javascript
import { socratic } from './index.js';

const session = socratic('I want to start exercising more');
const dialogue = await session.run(3);

// Returns array of question-answer pairs:
// [
//   { question: 'What benefits do you hope to gain from exercising?', answer: 'I want more energy during the day.' },
//   { question: 'Why is having more energy important to you?', answer: 'So I can keep up with my kids after work.' },
//   { question: 'How might regular exercise help you achieve that?', answer: 'It will improve my stamina and mood.' }
// ]
<<<<<<< HEAD
```

## Parameters

### Constructor Parameters
- **statement** (string, required): The subject, belief, or statement to explore through questioning
- **options** (object, optional): Configuration options
  - **ask** (function): Custom question generation function
  - **answer** (function): Custom answer generation function

### Method Parameters
- **run(depth)**: Execute the full dialogue
  - **depth** (number): Number of question-answer pairs to generate (default: 3)
- **step()**: Execute a single question-answer cycle

## Return Value

### From `run()` method:
Returns an array of dialogue objects, each containing:
- **question** (string): The Socratic question posed
- **answer** (string): The generated response to that question

### From `step()` method:
Returns a single dialogue object with `question` and `answer` properties.

### From `getDialogue()` method:
Returns the complete dialogue history as an array.

## Features

- **Progressive questioning**: Each question builds on previous answers
- **Self-contained dialogue**: Generates both questions and answers automatically
- **Flexible execution**: Run complete dialogues or step through individually
- **Customizable functions**: Override default question/answer generation
- **Context preservation**: Maintains dialogue history throughout the session

## Advanced Usage

### Custom Question and Answer Functions

```javascript
import SocraticMethod from './index.js';

const customAsk = async ({ topic, history }) => {
  // Custom logic for generating questions
  return `What evidence supports your belief that "${topic}"?`;
};

const customAnswer = async ({ question, history }) => {
  // Custom logic for generating answers
  return `Based on my experience, ${question.toLowerCase()} because...`;
};

const session = new SocraticMethod('Artificial intelligence will replace human jobs', {
  ask: customAsk,
  answer: customAnswer
});
```

### Step-by-Step Execution

```javascript
const session = socratic('Remote work is more productive than office work');

// Execute individual steps
const firstTurn = await session.step();
console.log(firstTurn.question);
console.log(firstTurn.answer);

// Get complete dialogue history
const fullDialogue = session.getDialogue();
=======
>>>>>>> origin/main
```

## Parameters

### Constructor Parameters
- **statement** (string, required): The subject, belief, or statement to explore through questioning
- **options** (object, optional): Configuration options
  - **ask** (function): Custom question generation function
  - **answer** (function): Custom answer generation function

### Method Parameters
- **run(depth)**: Execute the full dialogue
  - **depth** (number): Number of question-answer pairs to generate (default: 3)
- **step()**: Execute a single question-answer cycle

## Return Value

### From `run()` method:
Returns an array of dialogue objects, each containing:
- **question** (string): The Socratic question posed
- **answer** (string): The generated response to that question

### From `step()` method:
Returns a single dialogue object with `question` and `answer` properties.

### From `getDialogue()` method:
Returns the complete dialogue history as an array.

## Features

- **Progressive questioning**: Each question builds on previous answers
- **Self-contained dialogue**: Generates both questions and answers automatically
- **Flexible execution**: Run complete dialogues or step through individually
- **Customizable functions**: Override default question/answer generation
- **Context preservation**: Maintains dialogue history throughout the session

## Use Cases

### Personal Development and Self-Reflection
Explore personal beliefs and motivations:

```javascript
const session = socratic('Success means having a lot of money');
const dialogue = await session.run(4);

// Generates questions like:
// "What does 'a lot of money' mean to you specifically?"
// "How would having that amount change your daily life?"
// "What other forms of success might exist beyond financial wealth?"
```

### Educational Critical Thinking
Encourage deeper analysis of academic topics:

```javascript
const session = socratic('Democracy is the best form of government');
const dialogue = await session.run(3);

// Explores assumptions about governance, representation, and effectiveness
```

### Problem-Solving and Decision Making
Work through complex decisions systematically:

```javascript
const session = socratic('I should change careers to follow my passion');
const dialogue = await session.run(5);

// Questions practical considerations, risks, and underlying assumptions
```

### Therapeutic and Coaching Applications
Facilitate self-discovery in professional contexts:

```javascript
const session = socratic('I always feel anxious in social situations');
const dialogue = await session.run(4);

// Explores triggers, patterns, and coping strategies
```

## Advanced Usage

### Custom Question and Answer Functions

```javascript
import SocraticMethod from './index.js';

const customAsk = async ({ topic, history }) => {
  // Custom logic for generating questions
  return `What evidence supports your belief that "${topic}"?`;
};

const customAnswer = async ({ question, history }) => {
  // Custom logic for generating answers
  return `Based on my experience, ${question.toLowerCase()} because...`;
};

const session = new SocraticMethod('Artificial intelligence will replace human jobs', {
  ask: customAsk,
  answer: customAnswer
});
```

### Step-by-Step Execution

```javascript
const session = socratic('Remote work is more productive than office work');

// Execute individual steps
const firstTurn = await session.step();
console.log(firstTurn.question);
console.log(firstTurn.answer);

const secondTurn = await session.step();
// Continue as needed...

// Get complete dialogue history
const fullDialogue = session.getDialogue();
```

### Batch Processing Multiple Topics

```javascript
const topics = [
  'Social media makes people more connected',
  'Standardized testing measures intelligence',
  'Technology always improves quality of life'
];

const dialogues = await Promise.all(
  topics.map(topic => socratic(topic).run(3))
);
```

## Integration Patterns

### With Other Chains
Combine with analysis chains for deeper insights:

```javascript
import { socratic } from './index.js';
import analyze from '../analyze/index.js';

const session = socratic('Climate change is primarily caused by human activities');
const dialogue = await session.run(3);

// Analyze the dialogue for patterns or insights
const analysis = await analyze(dialogue.map(turn => turn.answer).join(' '));
```

### Educational Curriculum Integration
Create structured learning experiences:

```javascript
const philosophicalTopics = [
  'Free will exists',
  'Morality is objective',
  'Knowledge comes from experience'
];

const curriculum = await Promise.all(
  philosophicalTopics.map(async topic => ({
    topic,
    dialogue: await socratic(topic).run(4)
  }))
);
```

## Related Modules

- [`ask`](../../verblets/ask/README.md) - Generate single questions
- [`clarify`](../clarify/README.md) - Clarify unclear statements
- [`analyze`](../analyze/README.md) - Analyze text for patterns and insights

## Error Handling

The chain handles various error conditions gracefully:

```javascript
try {
  const session = socratic('');
  const dialogue = await session.run(3);
} catch (error) {
  if (error.message.includes('statement required')) {
    console.log('Please provide a statement to explore');
  }
}
```

Common considerations:
- **Empty statements**: Ensure meaningful input for question generation
- **Network issues**: Handle LLM API connectivity problems
- **Context limits**: Manage dialogue length for very long conversations
- **Custom function errors**: Validate custom ask/answer function implementations
