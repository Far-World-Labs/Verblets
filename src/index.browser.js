// Browser entry point for verblets
// Initialize browser environment
import { mapBrowserEnv } from './lib/env/index.js';
mapBrowserEnv();

// Export all shared browser-compatible modules
export * from './shared.js';

// Default export
export { chatGPT as default } from './shared.js';
