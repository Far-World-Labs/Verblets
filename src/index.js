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

// Shallow verblets (RAG — query transforms)
export { default as embedRewriteQuery } from './verblets/embed-rewrite-query/index.js';
export { default as embedMultiQuery } from './verblets/embed-multi-query/index.js';
export { default as embedStepBack } from './verblets/embed-step-back/index.js';
export { default as embedSubquestions } from './verblets/embed-subquestions/index.js';

// RAG chains
export { default as embedExpandQuery } from './chains/embed-expand-query/index.js';

// Node-only exports (codebase utilities)
export { default as aiArchExpect } from './chains/ai-arch-expect/index.js';
export { default as scanJS } from './chains/scan-js/index.js';
export { default as test } from './chains/test/index.js';
export { default as testAdvice } from './chains/test-advice/index.js';

// Default export
export { llm as default } from './shared.js';
