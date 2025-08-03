// Environment variable abstraction for isomorphic support
// In browser: uses window.verblets.env
// In Node: uses process.env

/* global window */
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
const isNode = typeof process !== 'undefined' && process?.versions?.node;

// Get environment object based on runtime
const getEnv = () => {
  if (isBrowser) {
    // Initialize window.verblets.env if needed
    if (!window.verblets) {
      window.verblets = {};
    }
    if (!window.verblets.env) {
      window.verblets.env = {};
    }
    return window.verblets.env;
  }

  if (isNode) {
    return process.env;
  }

  return {};
};

// Get a specific environment variable with optional default
export const getEnvVar = (key, defaultValue = undefined) => {
  const env = getEnv();
  return env[key] ?? defaultValue;
};

// Get all environment variables
export const env = new Proxy(
  {},
  {
    get(target, prop) {
      return getEnv()[prop];
    },
    has(target, prop) {
      return prop in getEnv();
    },
  }
);

// Utility to check runtime environment
export const runtime = {
  isBrowser,
  isNode,
};

// Map browser-specific env vars to their Node.js equivalents
export const mapBrowserEnv = () => {
  if (isBrowser && window.verblets?.env) {
    // Map BROWSER_ENV to NODE_ENV if not already set
    if (window.verblets.env.BROWSER_ENV && !window.verblets.env.NODE_ENV) {
      window.verblets.env.NODE_ENV = window.verblets.env.BROWSER_ENV;
    }

    // Default NODE_ENV to 'development' with warning if not set
    if (!window.verblets.env.NODE_ENV) {
      console.warn('NODE_ENV not defined in browser environment. Defaulting to "development".');
      window.verblets.env.NODE_ENV = 'development';
    }
  }
};

// Initialize browser environment mappings
if (isBrowser) {
  mapBrowserEnv();
}

export default env;
