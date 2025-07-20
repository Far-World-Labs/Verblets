# chatgpt

Core LLM integration for making API calls with intelligent model selection, retry logic, and structured response handling.

## Usage

```javascript
import chatGPT from './index.js';

// Basic usage with default model
const response = await chatGPT('Explain quantum computing in simple terms');

// With specific model configuration
const result = await chatGPT('Generate a JSON list of colors', {
  modelOptions: {
    modelName: 'fastGoodCheap',
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'colors',
        schema: {
          type: 'object',
          properties: {
            colors: { type: 'array', items: { type: 'string' } }
          }
        }
      }
    }
  }
});
```

## API

### `chatGPT(prompt, options)`

**Parameters:**
- `prompt` (string): The text prompt to send to the LLM
- `options` (object, optional): Configuration options
  - `modelOptions` (object): Model configuration
    - `modelName` (string): Specific model to use ('fastGoodCheap', 'privacy', etc.)
    - `negotiate` (object): Model negotiation criteria
      - `fast` (boolean): Prioritize speed
      - `good` (boolean): Prioritize quality
      - `cheap` (boolean): Prioritize cost
      - `reasoning` (boolean): Prioritize reasoning capabilities
      - `multi` (boolean): Prioritize multimodal capabilities
    - `response_format` (object): Structured output format
  - `retryOptions` (object): Retry configuration
  - `timeout` (number): Request timeout in milliseconds
  - `unwrapValues` (boolean, default: true): Auto-unwrap `{value: ...}` responses
  - `unwrapCollections` (boolean, default: true): Auto-unwrap `{items: [...]}` responses
  - `skipResponseParse` (boolean, default: false): Skip JSON parsing

**Returns:** Promise that resolves with the LLM response (string or parsed object for structured outputs)

## Model Selection

### Privacy-First Rule
```javascript
// Always use privacy models for sensitive operations
const result = await chatGPT(prompt, {
  modelOptions: { modelName: 'privacy' }
});
```

### Model Negotiation
```javascript
// Optimize for speed and cost (bulk operations)
const result = await chatGPT(prompt, {
  modelOptions: { negotiate: { fast: true, cheap: true } }
});

// Optimize for quality (critical operations)
const result = await chatGPT(prompt, {
  modelOptions: { negotiate: { good: true } }
});

// Complex reasoning tasks
const result = await chatGPT(prompt, {
  modelOptions: { negotiate: { reasoning: true } }
});
```

## Structured Outputs

### JSON Schema (Recommended)
```javascript
const schema = {
  type: 'object',
  properties: {
    items: { type: 'array', items: { type: 'string' } },
    count: { type: 'number' }
  },
  required: ['items', 'count']
};

const result = await chatGPT('List 5 programming languages', {
  modelOptions: {
    modelName: 'fastGoodCheap',
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'languages', schema }
    }
  }
});

// Result is automatically parsed and validated
console.log(result.items); // ['JavaScript', 'Python', 'Java', 'C++', 'Go']
```

## Use Cases

### Basic Text Generation
```javascript
const explanation = await chatGPT(
  'Explain the concept of recursion in programming',
  { modelOptions: { modelName: 'fastGoodCheap' } }
);
```

### Structured Data Extraction
```javascript
const extractedData = await chatGPT(
  'Extract key information from this text: "John Smith, age 30, works at Tech Corp"',
  {
    modelOptions: {
      modelName: 'fastGoodCheap',
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'person',
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              age: { type: 'number' },
              company: { type: 'string' }
            }
          }
        }
      }
    }
  }
);
```

### Privacy-Sensitive Operations
```javascript
// Use privacy models for sensitive data
const anonymized = await chatGPT(
  'Anonymize this personal information: [sensitive data]',
  { modelOptions: { modelName: 'privacy' } }
);
```

## Features

- **Intelligent Model Selection**: Automatic model negotiation based on requirements
- **Privacy-First Architecture**: Dedicated privacy model support with absolute precedence
- **Structured Output Support**: JSON schema validation and parsing
- **Automatic Retry Logic**: Built-in resilience for transient failures
- **Timeout Handling**: Configurable request timeouts
- **Response Validation**: Automatic parsing and validation of structured responses
- **Smart Unwrapping**: Auto-unwraps `{value: ...}` and `{items: [...]}` patterns

## Related Modules

- [`llm-model`](../../services/llm-model/README.md) - Model negotiation and selection service
- [`retry`](../retry/README.md) - Retry logic implementation
- [`with-inactivity-timeout`](../with-inactivity-timeout/README.md) - Timeout handling utilities 