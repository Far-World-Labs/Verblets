# Questions Chain

AI-powered question generator that creates relevant, thought-provoking questions from any input text. Uses an iterative approach to explore different angles and drill down into interesting areas.

## Usage

```javascript
import questions from './src/chains/questions/index.js';

const inputText = "The impact of artificial intelligence on modern healthcare";

// Generate questions with default settings
const generatedQuestions = await questions(inputText);

// Generate questions with custom configuration
const customQuestions = await questions(inputText, {
  searchBreadth: 0.3,  // More focused exploration
  model: 'gpt-4',
  shouldSkip: (question, existing) => existing.includes(question),
  shouldStop: (question, all, recent, attempts) => all.length > 20
});
```

## Parameters

- **text** (string): The input text to generate questions about
- **options** (object, optional):
  - **searchBreadth** (number, 0-1): Controls exploration breadth. Lower values (0.1-0.3) focus more narrowly, higher values (0.7-1.0) explore more broadly. Default: 0.5
  - **model**: LLM model to use for generation. Default: best available public model
  - **shouldSkip** (function): Custom logic to skip certain questions. Receives `(question, allQuestions)` and returns boolean
  - **shouldStop** (function): Custom logic to stop generation. Receives `(question, allQuestions, recentQuestions, attempts)` and returns boolean

## Returns

Array of unique questions sorted alphabetically.

## Algorithm

1. **Initial Generation**: Creates questions directly from input text
2. **Iterative Refinement**: 
   - Picks interesting questions from previous results
   - Uses selected questions as new input for deeper exploration
   - Applies breadth control to balance focus vs. exploration
3. **Quality Control**: Filters duplicates and applies custom skip/stop logic
4. **Termination**: Stops when reaching limits (50+ questions or 5+ attempts by default)

## Examples

### Research Analysis
```javascript
const researchQuestions = await questions(
  "Climate change effects on polar ice caps",
  { 
    searchBreadth: 0.7,  // Broad exploration
    shouldStop: (q, all) => all.length > 30
  }
);
```

### Focused Inquiry
```javascript
const focusedQuestions = await questions(
  "Machine learning model interpretability",
  { 
    searchBreadth: 0.2,  // Deep, narrow focus
    shouldStop: (q, all) => all.length > 15
  }
);
``` 