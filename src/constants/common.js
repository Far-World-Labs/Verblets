export const longTestTimeout = 10 * 60 * 1000; // 10 minutes

export const maxRetries = 3;

export const retryDelay = 1000;

export const debugToObject = process.env.DEBUG_TO_OBJECT ?? false;

// Utility to conditionally skip long-running examples
// Set ENABLE_LONG_EXAMPLES=true to run all examples
// Set ENABLE_LONG_EXAMPLES=false or leave unset to skip long examples
export const shouldRunLongExamples =
  process.env.ENABLE_LONG_EXAMPLES === 'true' || process.env.ENABLE_LONG_EXAMPLES === '1';
