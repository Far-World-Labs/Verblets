# date

Extract and validate dates from natural language queries, returning a properly formatted JavaScript `Date` object. The chain uses iterative refinement to ensure accuracy by self-validating results against contextual expectations.

## Usage

```javascript
import date from './index.js';

const release = await date('When was the original Star Wars film released?');
// => new Date('1977-05-25')
```

## Parameters

- **query** (string, required): Natural language question or statement about a date
- **config** (object, optional): Configuration options
  - **llm** (object): LLM configuration for date extraction
  - **maxAttempts** (number): Maximum retry attempts for validation (default: 3)
  - **timezone** (string): Target timezone for the result (default: UTC)

## Return Value

Returns a JavaScript `Date` object representing the extracted date, or throws an error if no valid date can be determined.

## Features

- **Self-validating extraction**: Generates validation criteria and checks results
- **Iterative refinement**: Retries until date passes validation checks
- **Natural language processing**: Handles various date formats and expressions
- **Context awareness**: Considers historical and cultural context for accuracy

## Use Cases

### Historical Event Dates
Extract dates of significant historical events:

```javascript
const independence = await date('When did the United States declare independence?');
// => new Date('1776-07-04')

const moonLanding = await date('Apollo 11 moon landing date');
// => new Date('1969-07-20')
```

### Entertainment and Media
Get release dates for movies, books, and other media:

```javascript
const harryPotter = await date('When was the first Harry Potter book published?');
// => new Date('1997-06-26')

const iphone = await date('Original iPhone announcement date');
// => new Date('2007-01-09')
```

### Scientific and Technical Milestones
Extract dates of important discoveries and inventions:

```javascript
const dna = await date('When was the structure of DNA discovered?');
// => new Date('1953-04-25')

const internet = await date('When was the World Wide Web invented?');
// => new Date('1989-03-12')
```

## Advanced Usage

### With Custom Configuration

```javascript
const result = await date('When was the Berlin Wall torn down?', {
  config: {
    llm: {
      temperature: 0.1, // Lower temperature for more precise dates
      maxTokens: 150
    },
    maxAttempts: 5,
    timezone: 'Europe/Berlin'
  }
});
```

### Handling Relative Dates

```javascript
const lastChristmas = await date('What date was Christmas last year?');
const nextNewYear = await date('When is New Year\'s Day next year?');
```

### Batch Processing

```javascript
const queries = [
  'When was JavaScript created?',
  'React.js initial release date',
  'Node.js first release'
];

const dates = await Promise.all(
  queries.map(query => date(query))
);
```

## Validation Process

The chain implements a sophisticated validation process:

1. **Initial extraction**: LLM extracts date from natural language
2. **Criteria generation**: Creates specific validation checks for the context
3. **Self-validation**: Tests the extracted date against generated criteria
4. **Iterative refinement**: Retries if validation fails, up to maxAttempts

Example validation criteria for "When was the iPhone released?":
- Date should be in the 2000s
- Should be before widespread smartphone adoption
- Should align with Apple's product announcement patterns

## Related Modules

- [`bool`](../../verblets/bool/README.md) - Boolean validation used internally
- [`to-number`](../../verblets/to-number/README.md) - Number extraction from text
- [`with-inactivity-timeout`](../../verblets/with-inactivity-timeout/README.md) - Timeout handling

## Error Handling

The chain provides detailed error information:

```javascript
try {
  const result = await date('When will the world end?');
} catch (error) {
  if (error.message.includes('validation failed')) {
    console.log('Could not validate the extracted date');
  } else if (error.message.includes('max attempts')) {
    console.log('Exceeded retry limit for date extraction');
  }
}
```

Common error scenarios:
- **Ambiguous queries**: Questions with multiple possible dates
- **Fictional events**: Dates for non-historical events
- **Future uncertainties**: Predictions that cannot be validated
- **Insufficient context**: Queries lacking enough information for accurate extraction
