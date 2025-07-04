# disambiguate

Determine the intended meaning of a polysemous word or short phrase based on surrounding context. The chain analyzes multiple possible meanings and selects the most appropriate one using contextual clues.

## Usage

```javascript
import disambiguate from './index.js';

const result = await disambiguate({
  term: 'bat',
  context: 'The child swung the bat at the baseball.'
});

console.log(result.meaning);
// => "a club used in sports like baseball"
```

## Parameters

- **term** (string, required): The ambiguous word or phrase to disambiguate
- **context** (string, required): The surrounding text that provides contextual clues
- **config** (object, optional): Configuration options
  - **llm** (object): LLM configuration for the analysis
  - **maxAttempts** (number): Maximum retry attempts (default: 3)

## Return Value

Returns an object containing:
- **meaning** (string): The most likely meaning of the term in the given context
- **confidence** (number): Confidence score between 0 and 1
- **alternatives** (array): Other possible meanings considered
- **reasoning** (string): Explanation of why this meaning was selected

## Use Cases

### Clarifying Travel Conversations
When a traveler says, "I spoke with the coach about my seat," determine whether they mean a sports instructor or an airline seating class:

```javascript
const result = await disambiguate({
  term: 'coach',
  context: 'I spoke with the coach about my seat on the flight to Denver.'
});
// => { meaning: "economy class seating on an aircraft", confidence: 0.9 }
```

## Advanced Usage

### Batch Processing Multiple Terms

```javascript
const terms = [
  { term: 'bark', context: 'The dog began to bark loudly.' },
  { term: 'bark', context: 'The bark of the tree was rough.' }
];

const results = await Promise.all(
  terms.map(item => disambiguate(item))
);
```
