# socratic

Generate thought-provoking questions using the Socratic method to encourage deeper thinking and self-discovery through intelligent questioning.

## Usage

```javascript
import socratic from './index.js';

const topic = "Should social media platforms be regulated?";
const questions = await socratic(topic, 'explore ethical implications', { depth: 3 });

// Returns: [
//   "What fundamental rights might be at stake when regulating social media?",
//   "How do we balance free speech with preventing harm?",
//   "Who should have the authority to determine what content is acceptable?",
//   "What are the potential consequences of both regulation and non-regulation?",
//   "How might different stakeholders be affected by these decisions?"
// ]
```

## API

### `socratic(topic, focus, config)`

**Parameters:**
- `topic` (string): Subject or statement to explore
- `focus` (string): Specific aspect or angle to examine
- `config` (Object): Configuration options
  - `depth` (number): Number of question levels (default: 3)
  - `questionCount` (number): Number of questions per level (default: 3)
  - `style` (string): Questioning style ('probing', 'clarifying', 'challenging')
  - `llm` (Object): LLM model options

**Returns:** Promise<Array<string>> - Array of Socratic questions

## Features

- **Progressive Questioning**: Builds from basic to complex inquiries
- **Multiple Perspectives**: Explores different viewpoints and assumptions
- **Critical Thinking**: Encourages examination of beliefs and reasoning
- **Flexible Focus**: Targets specific aspects or themes
- **Adaptive Depth**: Configurable levels of inquiry

## Use Cases

### Educational Discussion
```javascript
import socratic from './index.js';

const concept = "Democracy is the best form of government";
const questions = await socratic(concept, 'examine underlying assumptions', { depth: 2 });

// Returns questions that challenge students to think critically about democracy
```

### Problem-Solving Sessions
```javascript
const problem = "Our team productivity has decreased";
const questions = await socratic(problem, 'identify root causes', { 
  style: 'probing',
  questionCount: 5 
});

// Returns questions to help teams discover underlying issues
```

### Self-Reflection Prompts
```javascript
const statement = "I want to change careers";
const questions = await socratic(statement, 'explore motivations and concerns', { depth: 4 });

// Returns questions for personal reflection and decision-making
```
