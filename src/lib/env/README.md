# env

Cross-platform environment variable access for browser and Node.js.

## Purpose

The `env` module provides a unified interface for accessing environment variables across different JavaScript runtimes. It automatically detects the environment and provides appropriate access to configuration values whether running in Node.js or a browser.

## Usage

```javascript
import env, { getEnvVar, runtime } from '../lib/env/index.js';

// Direct access via proxy
const apiKey = env.API_KEY;

// With default value
const port = getEnvVar('PORT', 3000);

// Check runtime
if (runtime.isBrowser) {
  console.log('Running in browser');
} else if (runtime.isNode) {
  console.log('Running in Node.js');
}
```

## API

### `env`

A proxy object providing direct access to environment variables.

```javascript
const value = env.VARIABLE_NAME;
```

### `getEnvVar(key, defaultValue)`

Get an environment variable with optional default.

**Parameters:**
- `key` (string): Environment variable name
- `defaultValue` (any, optional): Default value if variable is not set

**Returns:**
- Value of the environment variable or default

### `runtime`

Object containing runtime detection flags.

**Properties:**
- `isBrowser` (boolean): True if running in a browser
- `isNode` (boolean): True if running in Node.js

### `mapBrowserEnv()`

Maps browser-specific environment variables to Node.js equivalents. Called automatically in browser environments.

## Browser Configuration

In browser environments, environment variables are stored in `window.verblets.env`:

```javascript
// Set environment variables in browser
window.verblets = {
  env: {
    API_KEY: 'your-api-key',
    NODE_ENV: 'production'
  }
};
```

## Features

- **Isomorphic**: Works seamlessly in both Node.js and browser environments
- **Proxy-based Access**: Natural property access syntax
- **Default Values**: Support for fallback values
- **Runtime Detection**: Built-in environment detection
- **Browser Mapping**: Automatic mapping of browser-specific env vars
- **Zero Configuration**: Works out of the box in both environments

## Notes

- Browser environment uses `window.verblets.env` object
- Node.js environment uses standard `process.env`
- Automatically initializes browser environment if needed
- Provides warnings for missing critical variables in browser
- Maps `BROWSER_ENV` to `NODE_ENV` for compatibility

## Related Modules

- [debug](../debug) - Uses environment variables for debug control
- [crypto](../crypto) - Uses runtime detection for crypto implementation
- [chatgpt](../chatgpt) - Likely uses env for API configuration