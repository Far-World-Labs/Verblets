/**
 * Architecture test debugging configuration
 *
 * This constant controls whether batch debugging output is shown during architecture tests.
 * It can be overridden in tests using spies for fine-grained control.
 *
 * Usage:
 *   - Set ARCH_DEBUG=true environment variable to enable for all tests
 *   - Override in tests using: vi.spyOn(ARCH_DEBUG, 'enabled').mockReturnValue(true)
 */
export const ARCH_DEBUG = {
  enabled: process.env.ARCH_DEBUG === 'true',
};
