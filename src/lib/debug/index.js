/**
 * Minimal debug logging module
 *
 * Logs to stderr only when VERBLETS_DEBUG is set to a truthy value.
 * Uses the isomorphic env module so this works in both Node and browser.
 */
import { truthyValues } from '../../constants/common.js';
import { getEnvVar } from '../env/index.js';

const isDebugEnabled = () => {
  return truthyValues.includes(getEnvVar('VERBLETS_DEBUG'));
};

export const debug = (...args) => {
  if (isDebugEnabled()) {
    console.error(...args);
  }
};
