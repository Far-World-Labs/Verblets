/**
 * Simple test utilities for environment variable management
 */

/* global window */
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

const getEnvStore = () => {
  if (isBrowser) {
    if (!window.verblets) window.verblets = {};
    if (!window.verblets.env) window.verblets.env = {};
    return window.verblets.env;
  }
  return process.env;
};

export function saveTestEnv(key) {
  const store = getEnvStore();
  const originalValue = store[key];
  return () => {
    if (originalValue === undefined) {
      delete store[key];
    } else {
      store[key] = originalValue;
    }
  };
}

export function setTestEnv(key, value) {
  const store = getEnvStore();
  if (value === undefined) {
    delete store[key];
  } else {
    store[key] = value;
  }
}
