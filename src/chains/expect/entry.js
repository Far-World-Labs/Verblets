// Entry point that conditionally loads the correct implementation
// This avoids top-level imports of Node.js modules in browser environments

/* global window */
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

// Dynamically import the correct implementation
const implementation = isBrowser ? await import('./index.browser.js') : await import('./index.js');

// Re-export everything
export const { expect, expectSimple } = implementation;
export default implementation.expect;
