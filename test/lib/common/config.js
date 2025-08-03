/**
 * Common config checking functionality
 */

import { getConfig } from '../config.js';

export function withConfigCheck(fn) {
  return async (...args) => {
    const config = getConfig();
    
    // Skip if debug mode is not enabled
    if (!config.enabled) {
      return;
    }
    
    return await fn(config, ...args);
  };
}

export function getConfigOrExit() {
  const config = getConfig();
  if (!config.enabled) {
    return null;
  }
  return config;
}