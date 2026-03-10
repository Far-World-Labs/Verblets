import { describe, it, expect, vi, beforeEach } from 'vitest';

// arch.js reads process.env at module scope, so we must use dynamic import
// with vi.stubEnv to test different configurations.

describe('arch config', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  describe('ARCH_LOG', () => {
    it('defaults to false when ARCH_LOG is unset', async () => {
      delete process.env.ARCH_LOG;
      const { ARCH_LOG } = await import('./arch.js');
      expect(ARCH_LOG).toBe(false);
    });

    it('reads ARCH_LOG string value from env', async () => {
      vi.stubEnv('ARCH_LOG', 'debug');
      const { ARCH_LOG } = await import('./arch.js');
      expect(ARCH_LOG).toBe('debug');
    });
  });

  describe('ARCH_SHUFFLE', () => {
    it('defaults to false when ARCH_SHUFFLE is unset', async () => {
      delete process.env.ARCH_SHUFFLE;
      const { ARCH_SHUFFLE } = await import('./arch.js');
      expect(ARCH_SHUFFLE).toBe(false);
    });

    it('is true when ARCH_SHUFFLE is "true"', async () => {
      vi.stubEnv('ARCH_SHUFFLE', 'true');
      const { ARCH_SHUFFLE } = await import('./arch.js');
      expect(ARCH_SHUFFLE).toBe(true);
    });

    it('accepts truthy aliases like "yes"', async () => {
      vi.stubEnv('ARCH_SHUFFLE', 'yes');
      const { ARCH_SHUFFLE } = await import('./arch.js');
      expect(ARCH_SHUFFLE).toBe(true);
    });

    it('is false for unrecognized strings', async () => {
      vi.stubEnv('ARCH_SHUFFLE', 'maybe');
      const { ARCH_SHUFFLE } = await import('./arch.js');
      expect(ARCH_SHUFFLE).toBe(false);
    });
  });
});
