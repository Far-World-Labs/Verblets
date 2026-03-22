# questions

AI-powered question generator that creates relevant, thought-provoking questions from any input text. Uses an iterative approach to explore different angles and drill down into interesting areas.

## Usage

```javascript
import questions from './src/chains/questions/index.js';

const inputText = "The impact of artificial intelligence on modern healthcare";

// Generate questions with default settings
const generatedQuestions = await questions(inputText);

// Generate questions with custom configuration
const customQuestions = await questions(inputText, {
  exploration: 'low',  // More focused exploration (vs 'high' for broad)
  llm: 'fastGoodCheap',
  shouldSkip: (question, existing) => existing.includes(question),
  shouldStop: (question, all, recent, attempts) => all.length > 20
});
```

## Parameters

- **text** (string): The input text to generate questions about
- **config** (object, optional):
  - **exploration** (`'low'`|`'high'`|number): Controls exploration breadth. `'low'` focuses narrowly (0.3), `'high'` explores broadly (0.7). A raw number (0-1) passes through directly. Default: 0.5
  - **llm** (string|Object): LLM model configuration
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
    exploration: 'high',  // Broad exploration
    shouldStop: (q, all) => all.length > 30
  }
);
```

### Focused Inquiry
```javascript
const focusedQuestions = await questions(
  "Machine learning model interpretability",
  {
    exploration: 'low',  // Deep, narrow focus
    shouldStop: (q, all) => all.length > 15
  }
);
``` 