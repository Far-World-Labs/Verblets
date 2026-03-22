import { describe, it, expect, vi, beforeEach } from 'vitest';

// arch-debug.js reads process.env at module scope, so we must use dynamic
// import with vi.stubEnv to test different configurations.

describe('arch-debug config', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  describe('ARCH_DEBUG', () => {
    it('defaults to an object with enabled = false', async () => {
      delete process.env.ARCH_DEBUG;
      const { ARCH_DEBUG } = await import('./arch-debug.js');
      expect(ARCH_DEBUG).toEqual({ enabled: false });
    });

    it('enabled is true when ARCH_DEBUG is "true"', async () => {
      vi.stubEnv('ARCH_DEBUG', 'true');
      const { ARCH_DEBUG } = await import('./arch-debug.js');
      expect(ARCH_DEBUG.enabled).toBe(true);
    });

    it('accepts truthy aliases like "yes"', async () => {
      vi.stubEnv('ARCH_DEBUG', 'yes');
      const { ARCH_DEBUG } = await import('./arch-debug.js');
      expect(ARCH_DEBUG.enabled).toBe(true);
    });

    it('enabled is false for unrecognized strings', async () => {
      vi.stubEnv('ARCH_DEBUG', 'maybe');
      const { ARCH_DEBUG } = await import('./arch-debug.js');
      expect(ARCH_DEBUG.enabled).toBe(false);
    });

    it('enabled property is mutable (for test spying)', async () => {
      const { ARCH_DEBUG } = await import('./arch-debug.js');
      ARCH_DEBUG.enabled = true;
      expect(ARCH_DEBUG.enabled).toBe(true);
      ARCH_DEBUG.enabled = false;
      expect(ARCH_DEBUG.enabled).toBe(false);
    });
  });
});
