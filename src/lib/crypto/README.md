# crypto

Cross-platform cryptographic utilities for browser and Node.js environments.

## Purpose

The `crypto` module provides a unified interface for cryptographic operations that works seamlessly in both browser and Node.js environments. Currently supports SHA-256 hashing with automatic environment detection.

## Usage

```javascript
import { createHash } from '../lib/crypto/index.js';

// Create a SHA-256 hash
const hash = createHash('sha256');
hash.update('Hello World');
const result = await hash.digest('hex');
console.log(result); // Outputs hex-encoded hash
```

## API

### `createHash(algorithm)`

Creates a hash object for the specified algorithm.

**Parameters:**
- `algorithm` (string): Hash algorithm to use (currently only 'sha256' is supported)

**Returns:**
- `Object`: Hash object with `update()` and `digest()` methods

### `createHashSync(algorithm)`

Creates a synchronous hash object (Node.js only).

**Parameters:**
- `algorithm` (string): Hash algorithm to use

**Returns:**
- `crypto.Hash`: Node.js crypto hash object

**Note:** Throws an error if called in browser environment

## Hash Object Methods

### `update(data)`

Adds data to be hashed.

**Parameters:**
- `data` (string): Data to include in the hash

**Returns:**
- `this`: The hash object for method chaining

### `digest(encoding)`

Calculates the hash digest.

**Parameters:**
- `encoding` (string): Output encoding format ('hex' supported)

**Returns:**
- `Promise<string>`: The hash digest in the specified encoding

## Features

- **Cross-Platform**: Automatically uses Web Crypto API in browsers and Node.js crypto module in Node.js
- **Async Support**: Browser implementation uses async Web Crypto API
- **Environment Detection**: Automatically detects runtime environment via env module
- **Method Chaining**: Supports chaining `update()` calls for multiple data chunks

## Example

```javascript
import { createHash } from '../lib/crypto/index.js';

async function generateFileHash(content) {
  const hash = createHash('sha256');
  
  // Can chain multiple updates
  hash.update(content)
      .update('\n')
      .update(new Date().toISOString());
  
  const checksum = await hash.digest('hex');
  return checksum;
}

// Usage
const fileHash = await generateFileHash('File content here');
console.log(`SHA-256: ${fileHash}`);
```

## Notes

- Browser implementation uses Web Crypto API (crypto.subtle.digest)
- Node.js implementation uses native crypto module
- Currently limited to SHA-256 algorithm
- Hex encoding is the primary supported output format
- All data is concatenated before hashing in async mode

## Related Modules

- [env](../env) - Runtime environment detection
- [prompt-cache](../prompt-cache) - Uses hashing for cache keys