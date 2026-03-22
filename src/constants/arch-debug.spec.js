import { describe, it, expect, vi, beforeEach } from 'vitest';

// arch-debug.js reads process.env at module scope, so we must use dynamic
// import with vi.stubEnv to test different configurations.

describe('arch-debug config', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  describe('VERBLETS_ARCH_DEBUG', () => {
    it('defaults to an object with enabled = false', async () => {
      delete process.env.VERBLETS_ARCH_DEBUG;
      const { VERBLETS_ARCH_DEBUG } = await import('./arch-debug.js');
      expect(VERBLETS_ARCH_DEBUG).toEqual({ enabled: false });
    });

    it('enabled is true when VERBLETS_ARCH_DEBUG is "true"', async () => {
      vi.stubEnv('VERBLETS_ARCH_DEBUG', 'true');
      const { VERBLETS_ARCH_DEBUG } = await import('./arch-debug.js');
      expect(VERBLETS_ARCH_DEBUG.enabled).toBe(true);
    });

    it('accepts truthy aliases like "yes"', async () => {
      vi.stubEnv('VERBLETS_ARCH_DEBUG', 'yes');
      const { VERBLETS_ARCH_DEBUG } = await import('./arch-debug.js');
      expect(VERBLETS_ARCH_DEBUG.enabled).toBe(true);
    });

    it('enabled is false for unrecognized strings', async () => {
      vi.stubEnv('VERBLETS_ARCH_DEBUG', 'maybe');
      const { VERBLETS_ARCH_DEBUG } = await import('./arch-debug.js');
      expect(VERBLETS_ARCH_DEBUG.enabled).toBe(false);
    });

    it('enabled property is mutable (for test spying)', async () => {
      const { VERBLETS_ARCH_DEBUG } = await import('./arch-debug.js');
      VERBLETS_ARCH_DEBUG.enabled = true;
      expect(VERBLETS_ARCH_DEBUG.enabled).toBe(true);
      VERBLETS_ARCH_DEBUG.enabled = false;
      expect(VERBLETS_ARCH_DEBUG.enabled).toBe(false);
    });
  });
});
