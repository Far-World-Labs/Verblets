/**
 * Fluent Assertion Library
 *
 * A lightweight assertion library with a fluent interface similar to chai.
 * Supports direct equality assertion via toBe().
 *
 * Usage:
 *   assert(value).toBe(expected);
 *   assert(value, 'Custom error message').toBe(expected);
 */

/**
 * Assertion class that provides fluent interface for assertions
 */
class Assertion {
  constructor(actual, message = null) {
    this.actual = actual;
    this.customMessage = message;
  }

  /**
   * Assert that the actual value is strictly equal to the expected value
   * @param {*} expected - The expected value
   * @throws {Error} If assertion fails
   * @returns {Assertion} Returns this for chaining (though not needed for toBe)
   */
  toBe(expected) {
    if (this.actual !== expected) {
      const defaultMessage = `Expected ${JSON.stringify(this.actual)} to be ${JSON.stringify(
        expected
      )}`;
      const errorMessage = this.customMessage || defaultMessage;
      throw new Error(errorMessage);
    }
    return this;
  }
}

/**
 * Create a new assertion for the given value
 * @param {*} actual - The actual value to assert
 * @param {string} [message] - Optional custom error message
 * @returns {Assertion} Assertion instance with fluent interface
 */
export function assert(actual, message = null) {
  return new Assertion(actual, message);
}

// Default export for convenience
export default assert;
