# socratic

Generate thought-provoking questions using the Socratic method to encourage deeper thinking and self-discovery through intelligent questioning.

## Usage

```javascript
import socratic from './index.js';

const topic = "Should social media platforms be regulated?";
const method = await socratic(topic, { challenge: 'high' });
const questions = await method.run(3);

// Returns: [
//   "What fundamental rights might be at stake when regulating social media?",
//   "How do we balance free speech with preventing harm?",
//   "Who should have the authority to determine what content is acceptable?",
//   "What are the potential consequences of both regulation and non-regulation?",
//   "How might different stakeholders be affected by these decisions?"
// ]
```

## API

### `socratic(statement, config)` / `SocraticMethod.create(statement, config)`

**Parameters:**
- `statement` (string): Subject or statement to explore
- `config` (Object): Configuration options
  - `challenge` (`'low'`|`'high'`): Controls dialogue intensity. `'low'` uses gentle hints with lower temperature (0.3). `'high'` uses provocative confrontation with higher temperature (0.9). Default: moderate challenge
  - `llm` (string|Object): LLM model configuration

**Returns:** Promise<SocraticMethod> - Socratic dialogue instance. Call `.run(depth)` to generate questions (default depth: 3)

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
const method = await socratic(concept, { challenge: 'high' });
const questions = await method.run(2);

// Returns questions that challenge students to think critically about democracy
```

### Problem-Solving Sessions
```javascript
const problem = "Our team productivity has decreased";
const method = await socratic(problem, { challenge: 'low' });
const questions = await method.run(5);

// Returns questions to help teams discover underlying issues
```

### Self-Reflection Prompts
```javascript
const statement = "I want to change careers";
const method = await socratic(statement);
const questions = await method.run(4);

// Returns questions for personal reflection and decision-making
```
