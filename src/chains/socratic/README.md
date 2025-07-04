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
```
