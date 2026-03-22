/**
 * Architecture test debugging configuration
 *
 * This constant controls whether batch debugging output is shown during architecture tests.
 * It can be overridden in tests using spies for fine-grained control.
 *
 * Usage:
 *   - Set VERBLETS_ARCH_DEBUG=true environment variable to enable for all tests
 *   - Override in tests using: vi.spyOn(VERBLETS_ARCH_DEBUG, 'enabled').mockReturnValue(true)
 */
import { get as configGet } from '../lib/config/index.js';

export const VERBLETS_ARCH_DEBUG = {
  enabled: configGet('VERBLETS_ARCH_DEBUG') === true,
};
