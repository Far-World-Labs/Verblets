// Main entry file for testing
import { helper } from './helper.js';
import utils from './utils.js';

export function mainFunction() {
  return helper() + utils.calc(5);
}

export const mainVariable = 42;

// Private function example (not exported)
// Demonstrates that parse-js-parts can find non-exported functions too
// function privateFunction() {
//   return 'private';
// }

export default mainFunction;
