# Developing Verblets

This document explains the development workflow and testing strategy for the Verblets library.

## Testing Strategy

The Verblets library uses a dual testing approach with two types of test files:

### 1. Spec Files (`*.spec.js`)
- **Purpose**: Deterministic unit tests with mocked LLM responses
- **Reliability**: Should always pass consistently
- **LLM Usage**: Uses mocked responses, no actual API calls
- **Caching**: Uses in-memory `NullRedisClient` or local mocking (no Redis required)
- **Speed**: Fast execution
- **Use Case**: CI/CD, development validation, regression testing

### 2. Example Files (`*.examples.js`)
- **Purpose**: Non-deterministic integration tests with real LLM calls
- **Reliability**: May fail due to LLM response variability
- **LLM Usage**: Makes actual API calls to language models
- **Caching**: Uses Redis for response caching (when available)
- **Speed**: Slower due to network calls (mitigated by caching)
- **Use Case**: Manual testing, demonstrating real-world usage, validating LLM integration

## Environment Configuration

### Spec Tests
```bash
npm test                    # Runs spec tests with mocked responses
```

### Example Tests
```bash
npm run examples                # Runs example tests with real LLM calls
EXAMPLES=true npm run examples  # Automatically set, enables Redis caching
```

## Caching System

### Redis Caching for Examples
- Example tests use Redis to cache LLM responses based on prompt content
- Cached responses reduce API costs and improve test speed
- Falls back to in-memory caching if Redis is unavailable

### Cache Behavior
- **Cache Hit**: Returns cached response instantly
- **Cache Miss**: Makes LLM API call and caches the response
- **TTL**: Cached responses expire based on `cacheTTL` configuration
- **Fallback**: Gracefully handles Redis connection failures

## Development Workflow

### Adding New Verblets or Chains

When creating a new verblet or chain, you should add both types of tests:

#### 1. Create Spec File (`index.spec.js`)
```javascript
import { describe, expect, it } from 'vitest';
import myVerblet from './index.js';

const examples = [
  {
    inputs: { text: 'test input' },
    want: { result: 'expected output' },
  },
];

describe('My Verblet', () => {
  examples.forEach((example) => {
    it(example.inputs.text, async () => {
      const result = await myVerblet(example.inputs.text);
      expect(result).toStrictEqual(example.want.result);
    });
  });
});
```

#### 2. Create Example File (`index.examples.js`)
```javascript
import { describe, expect, it } from 'vitest';
import myVerblet from './index.js';
import { longTestTimeout } from '../../constants/common.js';

describe('My Verblet Examples', () => {
  it(
    'processes real input',
    async () => {
      const result = await myVerblet('What is the capital of France?');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    },
    longTestTimeout
  );
});
```