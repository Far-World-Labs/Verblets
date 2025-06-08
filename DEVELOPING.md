# Developing Verblets

This document explains the development workflow and testing strategy for the Verblets library.

## Testing Strategy

The Verblets library uses a dual testing approach with two types of test files:

### 1. Spec Files (`*.spec.js`)
- **Purpose**: Deterministic unit tests with mocked LLM responses
- **Reliability**: Should always pass consistently
- **LLM Usage**: Uses mocked responses, no actual API calls
- **Caching**: Uses in-memory `NullRedisClient` (no Redis required)
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
TEST=true                   # Automatically set, uses NullRedisClient
```

### Example Tests
```bash
npm run examples            # Runs example tests with real LLM calls
EXAMPLES=true               # Automatically set, enables Redis caching
```

## Caching System

### Redis Caching for Examples
- Example tests use Redis to cache LLM responses based on prompt content
- Cache keys are generated from SHA256 hash of the request configuration
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

### Key Differences

| Aspect | Spec Files | Example Files |
|--------|------------|---------------|
| **LLM Calls** | Mocked | Real |
| **Determinism** | Always same result | Variable results |
| **Speed** | Fast | Slower |
| **Reliability** | Always pass | May fail |
| **Purpose** | Unit testing | Integration testing |
| **Caching** | In-memory only | Redis + fallback |
| **API Costs** | None | Actual costs (mitigated by caching) |

## Understanding Example Test Failures

Example tests may fail for several reasons:

### 1. LLM Response Variability
- Language models can produce different outputs for the same input
- This is expected behavior, not a bug
- Consider adjusting test assertions to be more flexible

### 2. API Rate Limits or Timeouts
- Network issues or API rate limiting can cause failures
- Tests have extended timeouts (`longTestTimeout = 120000ms`)
- Retry failed tests as they may pass on subsequent runs

### 3. Model Changes
- LLM providers may update their models
- Response formats or quality may change
- Update test expectations if needed

### 4. Caching Issues
- Redis connection problems fall back to in-memory caching
- Cache misses result in new API calls
- Check Redis connectivity if experiencing unexpected API usage

## Best Practices

### For Spec Tests
- Use realistic but predictable test data
- Mock all external dependencies
- Test edge cases and error conditions
- Ensure tests are fast and reliable

### For Example Tests
- Use real-world scenarios
- Make assertions flexible enough to handle response variability
- Focus on testing integration and overall functionality
- Document expected behavior in test descriptions

### General Guidelines
- Keep test descriptions clear and descriptive
- Use appropriate timeouts for async operations
- Handle both success and failure cases
- Maintain good test coverage across both test types

## Troubleshooting

### Redis Connection Issues
If you see warnings about Redis connection failures:
```
Redis service [warning]: "ECONNREFUSED" Falling back to mock Redis client.
```

This is normal when Redis is not running. The system automatically falls back to in-memory caching.

### Example Test Failures
If example tests fail intermittently:
1. Check if the failure is due to LLM response variability
2. Verify API keys and network connectivity
3. Consider if test assertions are too strict
4. Re-run tests to see if they pass on retry

### Performance Issues
If tests are running slowly:
1. Ensure Redis is running for better caching
2. Check if tests are making unnecessary API calls
3. Verify cache hit rates in test output
4. Consider adjusting test scope or expectations

## Environment Variables

| Variable | Purpose | Default | Used By |
|----------|---------|---------|---------|
| `TEST` | Indicates test environment | `false` | All tests |
| `EXAMPLES` | Enables Redis for example tests | `false` | Example tests |
| `REDIS_HOST` | Redis server hostname | `localhost` | Caching |
| `REDIS_PORT` | Redis server port | `6379` | Caching |
| `DEBUG_PROMPT` | Log prompts to console | `false` | Development |
| `DEBUG_RESULT` | Log results to console | `false` | Development |

## Summary

The dual testing approach ensures both reliability (spec tests) and real-world validation (example tests). Spec tests provide fast, deterministic validation for development and CI/CD, while example tests demonstrate actual functionality and catch integration issues. The caching system optimizes API usage and improves test performance while maintaining the ability to test real LLM interactions. 