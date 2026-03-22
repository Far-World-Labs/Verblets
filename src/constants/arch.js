/**
 * Architecture test configuration
 *
 * These constants control logging and input shuffling during architecture tests.
 *
 * Usage:
 *   - Set VERBLETS_ARCH_LOG=debug environment variable to enable logging for all tests
 *   - Set VERBLETS_ARCH_SHUFFLE=true environment variable to shuffle inputs for better coverage
 *   - Override in tests using spies for fine-grained control
 */
import { get as configGet } from '../lib/config/index.js';

export const VERBLETS_ARCH_LOG = configGet('VERBLETS_ARCH_LOG') || false;
export const VERBLETS_ARCH_SHUFFLE = configGet('VERBLETS_ARCH_SHUFFLE') === true;
