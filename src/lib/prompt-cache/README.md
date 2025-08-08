# prompt-cache

Redis-based caching system for LLM prompts and responses.

## Purpose

The `prompt-cache` module provides a caching layer for language model interactions, using SHA-256 hashing to create deterministic cache keys from prompt data. This reduces API calls, improves response times, and lowers costs by reusing previous responses for identical prompts.

## Usage

```javascript
import { get, set } from '../lib/prompt-cache/index.js';
import redis from '../services/redis/index.js';

// Check cache for existing response
const promptData = {
  messages: [{ role: 'user', content: 'What is 2+2?' }],
  model: 'gpt-4',
  temperature: 0.7
};

const { created, result } = await get(redis, promptData);

if (!created && result) {
  // Use cached response
  console.log('Cache hit:', result);
} else {
  // Make API call and cache result
  const apiResponse = await callLLM(promptData);
  await set(redis, promptData, apiResponse);
}
```

## API

### `get(redis, inputData)`

Retrieves cached response for the given prompt data.

**Parameters:**
- `redis` - Redis client instance
- `inputData` (Object): Prompt data to look up

**Returns:**
- `Object`: { created: boolean, result: any }
  - `created`: false if found in cache, true if not
  - `result`: Cached response data (if found)

### `set(redis, inputData, outputData)`

Caches a response for the given prompt data.

**Parameters:**
- `redis` - Redis client instance
- `inputData` (Object): Original prompt data
- `outputData` (any): Response to cache

### `toKey(data)`

Generates a deterministic cache key from data.

**Parameters:**
- `data` (Object): Data to hash

**Returns:**
- `Promise<string>`: SHA-256 hash hex string

## Features

- **Deterministic Keys**: Same input always generates same cache key
- **Automatic TTL**: Cached items expire based on configured TTL
- **Variable Key Filtering**: Ignores non-deterministic fields (created, id, usage)
- **Message Preservation**: Maintains message order and roles
- **Sorted Keys**: Ensures consistent hashing regardless of key order

## Cache Key Generation

The module creates cache keys by:
1. Removing variable fields (created, id, max_tokens, usage)
2. Sorting object keys alphabetically
3. Preserving message array structure
4. Creating SHA-256 hash of JSON string

## Notes

- Uses Redis for distributed caching
- TTL configured via `cacheTTL` constant
- Preserves message roles and content exactly
- Automatically filters non-deterministic fields
- Hash ensures consistent keys across runs

## Related Modules

- [crypto](../crypto) - Provides SHA-256 hashing
- [chatgpt](../chatgpt) - Could integrate caching for API calls
- [retry](../retry) - Could use cache to avoid retrying cached requests