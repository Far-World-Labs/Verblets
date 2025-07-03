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

## Features

- **Context-aware analysis**: Uses surrounding text to determine meaning
- **Multiple meaning evaluation**: Considers various interpretations
- **Confidence scoring**: Provides reliability assessment
- **Reasoning transparency**: Explains the disambiguation decision

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

### Processing Technical Documentation
Disambiguate technical terms that have multiple meanings:

```javascript
const result = await disambiguate({
  term: 'trunk',
  context: 'Check the trunk of the repository for the latest changes.'
});
// => { meaning: "main branch of a version control system", confidence: 0.95 }
```

### Understanding Medical Context
Resolve ambiguous medical terminology:

```javascript
const result = await disambiguate({
  term: 'cell',
  context: 'The patient was placed in a cell for observation.'
});
// => { meaning: "a small room in a medical facility", confidence: 0.8 }
```

## Advanced Usage

### With Custom LLM Configuration

```javascript
const result = await disambiguate({
  term: 'bank',
  context: 'She walked along the bank of the river.',
  config: {
    llm: {
      temperature: 0.3,
      maxTokens: 200
    }
  }
});
```

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

## Related Modules

- [`clarify`](../clarify/README.md) - Clarify unclear or vague statements
- [`find`](../find/README.md) - Find specific information in text
- [`filter`](../filter/README.md) - Filter content based on criteria

## Error Handling

The chain handles various error conditions:

```javascript
try {
  const result = await disambiguate({
    term: 'example',
    context: 'Very short.'
  });
} catch (error) {
  if (error.message.includes('insufficient context')) {
    console.log('Context too brief for reliable disambiguation');
  }
}
```

Common error scenarios:
- **Insufficient context**: Context too brief to determine meaning
- **Unknown term**: Term not recognized or too specialized
- **Multiple equally likely meanings**: Unable to confidently choose between options
