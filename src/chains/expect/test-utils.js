/**
 * Simple test utilities for environment variable management
 */

export function saveTestEnv(key) {
  const originalValue = process.env[key];
  return () => {
    if (originalValue === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = originalValue;
    }
  };
}

export function setTestEnv(key, value) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}
