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

## Advanced Usage

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
