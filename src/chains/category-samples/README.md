# category-samples

Generate representative samples for different categories using AI-powered content creation with intelligent diversity and contextual appropriateness.

## Usage

```javascript
import categorySamples from './index.js';

const categories = ['beginner', 'intermediate', 'advanced'];
const samples = await categorySamples(categories, 'programming exercises', { samplesPerCategory: 2 });

// Returns:
// {
//   beginner: [
//     'Write a function that adds two numbers',
//     'Create a program that prints "Hello World"'
//   ],
//   intermediate: [
//     'Build a simple calculator with basic operations',
//     'Implement a function to reverse a string'
//   ],
//   advanced: [
//     'Design a recursive algorithm for tree traversal',
//     'Implement a custom data structure with optimized operations'
//   ]
// }
```

## API

### `categorySamples(categories, context, config)`

**Parameters:**
- `categories` (Array): List of category names
- `context` (string): Description of what type of samples to generate
- `config` (Object): Configuration options
  - `samplesPerCategory` (number): Number of samples per category (default: 3)
  - `diversity` (boolean): Ensure diverse samples within categories (default: true)
  - `llm` (Object): LLM model options

**Returns:** Promise<Object> - Object with category names as keys and arrays of samples as values

## Use Cases

### Educational Content Creation
```javascript
import categorySamples from './index.js';

const levels = ['elementary', 'middle school', 'high school'];
const questions = await categorySamples(levels, 'science quiz questions', { samplesPerCategory: 3 });

// Returns age-appropriate science questions for each education level
```

### Marketing Campaign Ideas
```javascript
const channels = ['social media', 'email', 'print advertising'];
const campaigns = await categorySamples(channels, 'summer sale promotion', { samplesPerCategory: 2 });

// Returns channel-specific marketing campaign ideas
```
