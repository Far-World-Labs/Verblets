import { describe, it, expect, vi, beforeEach } from 'vitest';

// arch.js reads process.env at module scope, so we must use dynamic import
// with vi.stubEnv to test different configurations.

describe('arch config', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  describe('VERBLETS_ARCH_LOG', () => {
    it('defaults to false when VERBLETS_ARCH_LOG is unset', async () => {
      delete process.env.VERBLETS_ARCH_LOG;
      const { VERBLETS_ARCH_LOG } = await import('./arch.js');
      expect(VERBLETS_ARCH_LOG).toBe(false);
    });

    it('reads VERBLETS_ARCH_LOG string value from env', async () => {
      vi.stubEnv('VERBLETS_ARCH_LOG', 'debug');
      const { VERBLETS_ARCH_LOG } = await import('./arch.js');
      expect(VERBLETS_ARCH_LOG).toBe('debug');
    });
  });

  describe('VERBLETS_ARCH_SHUFFLE', () => {
    it('defaults to false when VERBLETS_ARCH_SHUFFLE is unset', async () => {
      delete process.env.VERBLETS_ARCH_SHUFFLE;
      const { VERBLETS_ARCH_SHUFFLE } = await import('./arch.js');
      expect(VERBLETS_ARCH_SHUFFLE).toBe(false);
    });

    it('is true when VERBLETS_ARCH_SHUFFLE is "true"', async () => {
      vi.stubEnv('VERBLETS_ARCH_SHUFFLE', 'true');
      const { VERBLETS_ARCH_SHUFFLE } = await import('./arch.js');
      expect(VERBLETS_ARCH_SHUFFLE).toBe(true);
    });

    it('accepts truthy aliases like "yes"', async () => {
      vi.stubEnv('VERBLETS_ARCH_SHUFFLE', 'yes');
      const { VERBLETS_ARCH_SHUFFLE } = await import('./arch.js');
      expect(VERBLETS_ARCH_SHUFFLE).toBe(true);
    });

    it('is false for unrecognized strings', async () => {
      vi.stubEnv('VERBLETS_ARCH_SHUFFLE', 'maybe');
      const { VERBLETS_ARCH_SHUFFLE } = await import('./arch.js');
      expect(VERBLETS_ARCH_SHUFFLE).toBe(false);
    });
  });
});
