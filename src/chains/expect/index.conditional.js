// Conditional loader for expect chain
// This file provides the correct implementation based on the runtime environment

// Check if we're in a browser environment
/* global window */
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

// Export everything from the appropriate implementation
// Cannot use conditional exports with export * syntax, so we handle this differently

// Export default
import nodeExpect from './index.js';
import browserExpect from './index.browser.js';

export default isBrowser ? browserExpect : nodeExpect;
