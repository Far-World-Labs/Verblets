// ============================================================================
// ID GENERATORS - Pure functions for generating IDs
// ============================================================================

/**
 * Create an ID generator with internal counter
 */
export const createIdGenerator = (prefix = '') => {
  let counter = 0;
  return () => prefix + (++counter);
};

/**
 * Create a run ID based on timestamp
 */
export const createRunId = () => Date.now();

/**
 * Create generators for different ID types
 */
export const createIdGenerators = () => ({
  suite: createIdGenerator(),
  test: createIdGenerator(),
  run: createRunId,
});