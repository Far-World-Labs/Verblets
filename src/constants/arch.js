/**
 * Architecture test configuration
 *
 * These constants control logging and input shuffling during architecture tests.
 *
 * Usage:
 *   - Set ARCH_LOG=debug environment variable to enable logging for all tests
 *   - Set ARCH_SHUFFLE=true environment variable to shuffle inputs for better coverage
 *   - Override in tests using spies for fine-grained control
 */
export const ARCH_LOG = process.env.ARCH_LOG || false;
export const ARCH_SHUFFLE = process.env.ARCH_SHUFFLE === 'true';
