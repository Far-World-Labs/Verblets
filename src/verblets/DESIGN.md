# Verblet Module Guidelines

## Overview

Verblets are AI-powered functions that emulate constructs from classical programming while adding intelligence. They represent single-purpose operations that transform input data through LLM processing, providing structured outputs with schema validation.

**For complex multi-step workflows, see [Chain Design Guidelines](../chains/DESIGN.md)** - chains build on these verblet patterns to orchestrate batch processing, retry logic, and stateful operations.

## What is a Verblet?

Verblets are the foundational building blocks of the AI function library. They handle:
- **Single Purpose Operations**: Each verblet performs one clear, focused task
- **Reliable Structured Output**: Consistent JSON responses using schemas
- **Input Validation**: Contract-based validation with meaningful errors
- **LLM Integration**: Seamless interaction with language models

## Module Structure

Each verblet directory contains:
- `index.js` - Main implementation
- `index.spec.js` - Unit tests (mock LLM calls)
- `index.examples.js` - Integration examples (real LLM calls)
- `README.md` - **Optional for simple verblets**, required for complex ones

## Core Characteristics

- **Single Purpose**: Each verblet performs one clear operation
- **Reliable Output**: Consistent structured responses using schemas
- **Error Handling**: Graceful failure with meaningful error messages
- **Async Behavior**: All verblets return promises
- **Schema-Driven**: Use JSON schemas for structured output validation

## Schema Passing and Structured Output

**This is the most critical aspect for reliable verblets.** Understanding proper schema configuration prevents JSON parsing issues and ensures consistent responses.

### Correct Schema Configuration

Use `modelOptions.response_format` for structured output with ChatGPT:

```javascript
import chatGPT from '../../lib/chatgpt/index.js';

export async function sentiment(text, options = {}) {
  const prompt = `Analyze the sentiment of this text: ${text}`;
  
  const response = await chatGPT(prompt, {
    modelOptions: {
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'sentiment_result',
          schema: {
            type: 'object',
            properties: {
              sentiment: { 
                type: 'string', 
                enum: ['positive', 'negative', 'neutral'] 
              },
              confidence: { 
                type: 'number', 
                minimum: 0, 
                maximum: 1 
              },
              reasoning: { type: 'string' }
            },
            required: ['sentiment', 'confidence', 'reasoning']
          },
        },
      },
    },
    ...options.llm,
  });

  // Structured output returns proper JSON - handle both string and object
  return typeof response === 'string' ? JSON.parse(response) : response;
}
```

### Schema Design Best Practices

**Use Specific Types and Constraints:**
```javascript
const schema = {
  type: 'object',
  properties: {
    // Use enums for limited options
    category: { 
      type: 'string', 
      enum: ['urgent', 'normal', 'low'] 
    },
    // Add ranges for numbers
    score: { 
      type: 'number', 
      minimum: 0, 
      maximum: 100 
    },
    // Require essential fields
    description: { type: 'string' }
  },
  required: ['category', 'score', 'description']
};
```

**Array Processing Schemas:**
```javascript
const listSchema = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          processed: { type: 'boolean' },
          result: { type: 'string' }
        },
        required: ['id', 'processed', 'result']
      }
    }
  },
  required: ['items']
};
```

### Common Schema Passing Mistakes

**❌ Wrong: Embedding schema in prompt**
```javascript
const prompt = `Return JSON with this structure: {"sentiment": "positive|negative|neutral"}`;
// This leads to unreliable parsing and markdown-wrapped responses
```

**❌ Wrong: Using deprecated schema parameter**
```javascript
const response = await chatGPT(prompt, {
  schema: mySchema, // Old pattern - don't use
});
```

**❌ Wrong: Not handling response type variations**
```javascript
const result = JSON.parse(response); // Fails if response is already an object
```

### Response Handling Patterns

**Robust Response Processing:**
```javascript
try {
  const response = await chatGPT(prompt, {
    modelOptions: { response_format: { /* schema */ } }
  });
  
  // Handle both string and object responses
  const result = typeof response === 'string' ? JSON.parse(response) : response;
  
  // Validate required fields exist
  if (!result.sentiment || typeof result.confidence !== 'number') {
    throw new Error('Invalid response structure');
  }
  
  return result;
} catch (error) {
  throw new Error(`Sentiment analysis failed: ${error.message}`);
}
```

**For List Processing Verblets:**
```javascript
export async function processItems(items, options = {}) {
  const response = await chatGPT(buildPrompt(items), {
    modelOptions: {
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'batch_result',
          schema: batchSchema
        }
      }
    },
    ...options.llm
  });

  const parsed = typeof response === 'string' ? JSON.parse(response) : response;
  
  // Ensure we got the expected array structure
  const results = parsed.items || parsed.results || parsed;
  if (!Array.isArray(results)) {
    throw new Error('Expected array response from batch processing');
  }
  
  return results;
}
```

### Integration with Other Functions

When verblets call other functions that expect different schema formats:

```javascript
// For chains that use reduce function (which expects llm.response_format)
import reduce from '../chains/reduce/index.js';

const response = await reduce(items, prompt, {
  llm: {
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'result', schema: mySchema }
    }
  }
});
```

## Expected Exports

```javascript
/**
 * Extract sentiment from text input
 * @param {string} text - The text to analyze
 * @param {Object} [options] - Configuration options
 * @param {Object} [options.llm] - LLM configuration
 * @returns {Promise<Object>} Sentiment analysis result
 */
export async function sentiment(text, options = {}) {
  // Implementation
}

// Primary export
export default sentiment;
```

## Common Verblet Types

- **Primitive**: Extract single values (`toNumber`, `toBool`, `toEnum`)
- **List**: Process arrays of items (`map`, `filter`, `reduce` operations)
- **Content**: Generate or transform text content (`summarize`, `rewrite`)
- **Analysis**: Analyze and classify content (`sentiment`, `intent`, `classify`)
- **Utility**: Parse, validate, or format data (`parseDate`, `validateEmail`)

## Error Handling

Use contract-based validation with meaningful error messages:

```javascript
export async function sentiment(text, options = {}) {
  // Input validation
  if (!text || typeof text !== 'string') {
    throw new Error('Text input is required and must be a string');
  }
  
  if (text.length > 10000) {
    throw new Error('Text input is too long (max 10,000 characters)');
  }
  
  try {
    // LLM processing
    const result = await processWithLLM(text, options);
    return result;
  } catch (error) {
    // Provide context-specific error messages
    throw new Error(`Sentiment analysis failed: ${error.message}`);
  }
}
```

## Documentation Standards

### When README is Required

**Complex verblets need documentation when they have:**
- Multiple configuration options beyond basic `llm` settings
- Non-obvious behavior or edge cases
- Integration with external systems
- Custom schema requirements
- Performance considerations

### When README is Optional

**Simple verblets can skip documentation when they:**
- Have single parameter input with obvious behavior
- Use standard verblet patterns without customization
- Are self-explanatory from function name and JSDoc

### README Structure (when needed)

```markdown
# Verblet Name

Brief description of what it does and when to use it.

## Usage

\`\`\`javascript
import { verbletName } from '@far-world-labs/verblets';
const result = await verbletName(input, options);
\`\`\`

## Parameters
- `input` - Description and constraints
- `options.llm` - LLM configuration (optional)
- `options.customOption` - Any verblet-specific options

## Returns
Description of output structure and format

## Examples (optional)
Real-world usage scenarios for complex cases
```

## Testing Standards

### Unit Tests (index.spec.js)

Mock LLM calls for fast, deterministic tests:

```javascript
import { vi, describe, it, expect } from 'vitest';
import { sentiment } from './index.js';
import chatGPT from '../../lib/chatgpt/index.js';

vi.mock('../../lib/chatgpt/index.js');

describe('sentiment', () => {
  it('should analyze positive sentiment', async () => {
    chatGPT.mockResolvedValue({
      sentiment: 'positive',
      confidence: 0.95,
      reasoning: 'Expresses joy and satisfaction'
    });

    const result = await sentiment('I love this product!');
    
    expect(result.sentiment).toBe('positive');
    expect(result.confidence).toBeGreaterThan(0.9);
    expect(chatGPT).toHaveBeenCalledWith(
      expect.stringContaining('I love this product!'),
      expect.objectContaining({
        modelOptions: expect.objectContaining({
          response_format: expect.any(Object)
        })
      })
    );
  });
});
```

### Integration Tests (index.examples.js)

Use real LLM calls for validation:

```javascript
import { sentiment } from './index.js';

// Test with real data to validate AI behavior
const examples = [
  {
    input: 'This product exceeded my expectations!',
    expected: 'positive'
  },
  {
    input: 'I hate waiting in long lines.',
    expected: 'negative'
  }
];

for (const example of examples) {
  const result = await sentiment(example.input);
  console.log(`Input: ${example.input}`);
  console.log(`Result: ${JSON.stringify(result, null, 2)}`);
  console.log(`Expected: ${example.expected}, Got: ${result.sentiment}`);
  console.log('---');
}
```

## Quality Patterns

### Function Structure
```javascript
export async function verbletName(input, options = {}) {
  // 1. Input validation
  if (!input) {
    throw new Error('Input is required');
  }
  
  // 2. Configuration setup
  const config = {
    ...defaultOptions,
    ...options
  };
  
  // 3. LLM processing with proper schema
  const response = await chatGPT(prompt, {
    modelOptions: {
      response_format: { /* schema */ }
    },
    ...config.llm
  });
  
  // 4. Result validation and parsing
  const result = typeof response === 'string' ? JSON.parse(response) : response;
  
  // 5. Return structured output
  return result;
}
```

### Configuration Handling
- Accept `options.llm` for LLM configuration
- Provide sensible defaults for verblet-specific options
- Document required vs optional parameters in JSDoc
- Use destructuring with defaults for clean option handling

### Performance Considerations
- Use appropriate timeout values for different operation types
- Handle rate limiting gracefully with exponential backoff
- Cache expensive operations when appropriate (with TTL)
- Consider input size limits to prevent excessive API costs

## Examples from Codebase

**Simple Verblet:** `src/verblets/sentiment` - Basic text analysis with enum output
**Complex Verblet:** `src/verblets/intent` - Multi-parameter operation with custom schema
**List Processing:** `src/verblets/map` - Array transformation with individual item processing

## Anti-Patterns

### Schema and Response Handling
- **Using deprecated schema parameter instead of modelOptions.response_format**
- **Not handling both string and object response types from structured output**
- **Assuming all LLM responses will be markdown-wrapped (structured output returns clean JSON)**
- **Inconsistent schema passing patterns between different LLM function calls**

### General Patterns
- Over-defensive input validation for simple cases
- Embedding schemas directly in prompts
- Complex configuration for simple operations
- Poor error messages that don't guide users
- Missing JSDoc for public functions
- Hard-coding timeouts or retry logic without configuration options

## Advanced Patterns

### Conditional Schema Selection
```javascript
export async function analyze(text, options = {}) {
  const { analysisType = 'basic' } = options;
  
  const schema = analysisType === 'detailed' 
    ? detailedAnalysisSchema 
    : basicAnalysisSchema;
  
  const response = await chatGPT(prompt, {
    modelOptions: {
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'analysis', schema }
      }
    }
  });
  
  return typeof response === 'string' ? JSON.parse(response) : response;
}
```

### Streaming for Large Outputs
```javascript
export async function generateLongContent(prompt, options = {}) {
  const { stream = false } = options;
  
  if (stream) {
    // Handle streaming response for large content
    return chatGPT(prompt, { 
      stream: true,
      ...options.llm
    });
  }
  
  // Standard response for smaller content
  return chatGPT(prompt, {
    modelOptions: {
      response_format: { /* schema */ }
    },
    ...options.llm
  });
}
``` 