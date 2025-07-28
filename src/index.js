// Node.js entry point for verblets
// Load environment variables from .env file FIRST (Node.js only)
import { runtime } from './lib/env/index.js';

// Conditionally load dotenv in Node.js environments
if (runtime.isNode) {
  const dotenv = await import('dotenv');
  dotenv.config();
}

// Export all shared browser-compatible modules
export * from './shared.js';

// Node-only exports (codebase utilities)
export { default as aiArchExpect } from './chains/ai-arch-expect/index.js';
export { default as scanJS } from './chains/scan-js/index.js';
export { default as test } from './chains/test/index.js';
export { default as testAdvice } from './chains/test-advice/index.js';

// Default export
export { chatGPT as default } from './shared.js';
