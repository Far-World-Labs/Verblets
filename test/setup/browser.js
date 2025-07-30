/**
 * Browser test setup
 * Initializes environment variables for browser testing
 */

// Initialize window.verblets.env with necessary API keys BEFORE any imports
globalThis.window = globalThis.window || globalThis;

if (typeof window !== 'undefined') {
  // Ensure window.verblets.env exists before any module imports
  window.verblets = window.verblets || {};
  window.verblets.env = window.verblets.env || {};
  
  // Set API keys from process.env (injected by Vite's define)
  if (typeof process !== 'undefined') {
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'undefined') {
      window.verblets.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    }
    if (process.env.OPENWEBUI_API_URL && process.env.OPENWEBUI_API_URL !== 'undefined') {
      window.verblets.env.OPENWEBUI_API_URL = process.env.OPENWEBUI_API_URL;
    }
    if (process.env.OPENWEBUI_API_KEY && process.env.OPENWEBUI_API_KEY !== 'undefined') {
      window.verblets.env.OPENWEBUI_API_KEY = process.env.OPENWEBUI_API_KEY;
    }
  }
  
  // Set test environment
  window.verblets.env.NODE_ENV = 'test';
  window.verblets.env.USE_REDIS_CACHE = 'true';
  
  
  // Enable debug logging if requested
  if (process.env.VERBLETS_DEBUG) {
    window.verblets.env.VERBLETS_DEBUG = process.env.VERBLETS_DEBUG;
  }
  
  // Log for debugging (only in verbose mode)
  if (process.env.VERBOSE) {
    console.log('Browser test setup complete.');
    console.log('API key available:', !!window.verblets.env.OPENAI_API_KEY);
  }
}