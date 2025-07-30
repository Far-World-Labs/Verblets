/**
 * Minimal debug logging module for tests
 *
 * Logs to stderr only when VERBLETS_DEBUG is set to a truthy value
 */
import { truthyValues } from '../../constants/common.js';

const isDebugEnabled = () => {
  return truthyValues.includes(process.env.VERBLETS_DEBUG);
};

export const debug = (...args) => {
  if (isDebugEnabled()) {
    console.error(...args);
  }
};
