/**
 * Test utilities for managing environment variables across Node and browser environments
 */

/**
 * Set an environment variable in a way that works for both Node and browser
 * @param {string} key - The environment variable name
 * @param {string} value - The value to set
 */
export function setTestEnv(key, value) {
  if (typeof window !== 'undefined') {
    // Browser environment
    window.verblets = window.verblets || {};
    window.verblets.env = window.verblets.env || {};
    window.verblets.env[key] = value;
  } else if (typeof process !== 'undefined') {
    // Node environment
    process.env[key] = value;
  }
}

/**
 * Get an environment variable in a way that works for both Node and browser
 * @param {string} key - The environment variable name
 * @returns {string|undefined} The value of the environment variable
 */
export function getTestEnv(key) {
  if (typeof window !== 'undefined') {
    return window.verblets?.env?.[key];
  } else if (typeof process !== 'undefined') {
    return process.env[key];
  }
  return undefined;
}

/**
 * Clear/delete an environment variable in both Node and browser
 * @param {string} key - The environment variable name
 */
export function clearTestEnv(key) {
  if (typeof window !== 'undefined') {
    if (window.verblets?.env) {
      delete window.verblets.env[key];
    }
  } else if (typeof process !== 'undefined') {
    delete process.env[key];
  }
}

/**
 * Create a function to save the current state of an environment variable
 * @param {string} key - The environment variable name
 * @returns {() => void} A restore function that resets the variable to its saved state
 */
export function saveTestEnv(key) {
  const savedValue = getTestEnv(key);
  
  return function restore() {
    if (savedValue === undefined) {
      clearTestEnv(key);
    } else {
      setTestEnv(key, savedValue);
    }
  };
}

/**
 * Set an environment variable temporarily and return a restore function
 * @param {string} key - The environment variable name
 * @param {string} value - The value to set
 * @returns {() => void} A restore function that resets the variable
 */
export function withTestEnv(key, value) {
  const restore = saveTestEnv(key);
  setTestEnv(key, value);
  return restore;
}

/**
 * Save multiple environment variables and return a single restore function
 * @param {string[]} keys - Array of environment variable names to save
 * @returns {() => void} A restore function that resets all variables
 */
export function saveTestEnvs(keys) {
  const restoreFns = keys.map(key => saveTestEnv(key));
  
  return function restoreAll() {
    restoreFns.forEach(restore => restore());
  };
}

/**
 * Set multiple environment variables and return a restore function
 * @param {Object} envVars - Object mapping keys to values
 * @returns {() => void} A restore function that resets all variables
 */
export function withTestEnvs(envVars) {
  const keys = Object.keys(envVars);
  const restore = saveTestEnvs(keys);
  
  Object.entries(envVars).forEach(([key, value]) => {
    setTestEnv(key, value);
  });
  
  return restore;
}