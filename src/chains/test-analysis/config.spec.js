import { describe, it, expect, vi, beforeEach } from 'vitest';

// config.js reads process.env at call time (inside getConfig()), so we can
// stub env vars before each call without needing dynamic imports.

describe('test-analysis config', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  // Helper: import fresh module after env stubs are set
  const importConfig = () => import('./config.js');

  describe('CONSTANTS', () => {
    it('exports expected constant values', async () => {
      const { CONSTANTS } = await importConfig();
      expect(CONSTANTS).toEqual({
        REDIS_KEY_PREFIX: 'test:',
        POLL_INTERVAL_MS: 100,
        WAIT_STATUS_INTERVAL_MS: 10000,
        RING_BUFFER_DEFAULT_SIZE: 5000,
        BATCH_SIZE: 50,
        DRAIN_BATCH_SIZE: 100,
        LOOKBACK_SIZE: 5000,
      });
    });
  });

  describe('getConfig() defaults', () => {
    it('returns all flags disabled by default', async () => {
      const { getConfig } = await importConfig();
      const config = getConfig();

      expect(config.aiMode).toBeFalsy();
      expect(config.aiModeDebug).toBeFalsy();
      expect(config.aiModeAnalysis).toBeFalsy();
      expect(config.debug.suites).toBeFalsy();
    });

    it('returns default buffer size', async () => {
      const { getConfig } = await importConfig();
      const config = getConfig();
      expect(config.ringBufferSize).toBe(5000);
    });

    it('returns default polling config', async () => {
      const { getConfig } = await importConfig();
      const config = getConfig();
      expect(config.polling.interval).toBe(100);
      expect(config.polling.statusInterval).toBe(10000);
    });

    it('returns default batch config', async () => {
      const { getConfig } = await importConfig();
      const config = getConfig();
      expect(config.batch.size).toBe(50);
      expect(config.batch.drainSize).toBe(100);
      expect(config.batch.lookbackSize).toBe(5000);
    });

    it('returns default AI config', async () => {
      const { getConfig } = await importConfig();
      const config = getConfig();
      expect(config.ai.enabled).toBeFalsy();
      expect(config.ai.timeout).toBe(120000);
    });
  });

  describe('getConfig() AI mode flags', () => {
    it('aiMode is true when VERBLETS_AI_LOGS_ONLY is truthy', async () => {
      vi.stubEnv('VERBLETS_AI_LOGS_ONLY', 'true');
      const { getConfig } = await importConfig();
      const config = getConfig();
      expect(config.aiMode).toBe(true);
      expect(config.aiModeDebug).toBe(true);
    });

    it('aiMode is true when VERBLETS_AI_PER_SUITE is truthy', async () => {
      vi.stubEnv('VERBLETS_AI_PER_SUITE', '1');
      const { getConfig } = await importConfig();
      const config = getConfig();
      expect(config.aiMode).toBe(true);
      expect(config.aiModeAnalysis).toBe(true);
    });

    it('aiMode is true when VERBLETS_AI_DETAIL is truthy', async () => {
      vi.stubEnv('VERBLETS_AI_DETAIL', 'yes');
      const { getConfig } = await importConfig();
      const config = getConfig();
      expect(config.aiMode).toBe(true);
      expect(config.aiModeAnalysis).toBe(true);
    });

    it('aiModeAnalysis is false in logs-only mode even with aiPerSuite', async () => {
      vi.stubEnv('VERBLETS_AI_LOGS_ONLY', 'true');
      vi.stubEnv('VERBLETS_AI_PER_SUITE', 'true');
      const { getConfig } = await importConfig();
      const config = getConfig();
      expect(config.aiMode).toBe(true);
      expect(config.aiModeAnalysis).toBe(false);
    });

    it('aiModeDebug is true when VERBLETS_DEBUG is truthy', async () => {
      vi.stubEnv('VERBLETS_DEBUG', '1');
      const { getConfig } = await importConfig();
      const config = getConfig();
      expect(config.aiModeDebug).toBe(true);
    });
  });

  describe('getConfig() debug flags', () => {
    it('debug.suites is true when VERBLETS_DEBUG_SUITES is truthy', async () => {
      vi.stubEnv('VERBLETS_DEBUG_SUITES', 'true');
      const { getConfig } = await importConfig();
      const config = getConfig();
      expect(config.debug.suites).toBe(true);
    });

    it('debug.suites inherits from VERBLETS_DEBUG', async () => {
      vi.stubEnv('VERBLETS_DEBUG', 'true');
      const { getConfig } = await importConfig();
      const config = getConfig();
      expect(config.debug.suites).toBe(true);
    });
  });

  describe('getConfig() numeric overrides', () => {
    it('reads VERBLETS_RING_BUFFER_SIZE', async () => {
      vi.stubEnv('VERBLETS_RING_BUFFER_SIZE', '10000');
      const { getConfig } = await importConfig();
      const config = getConfig();
      expect(config.ringBufferSize).toBe(10000);
    });

    it('reads VERBLETS_POLL_INTERVAL', async () => {
      vi.stubEnv('VERBLETS_POLL_INTERVAL', '500');
      const { getConfig } = await importConfig();
      const config = getConfig();
      expect(config.polling.interval).toBe(500);
    });

    it('reads VERBLETS_STATUS_INTERVAL', async () => {
      vi.stubEnv('VERBLETS_STATUS_INTERVAL', '30000');
      const { getConfig } = await importConfig();
      const config = getConfig();
      expect(config.polling.statusInterval).toBe(30000);
    });

    it('reads VERBLETS_BATCH_SIZE', async () => {
      vi.stubEnv('VERBLETS_BATCH_SIZE', '25');
      const { getConfig } = await importConfig();
      const config = getConfig();
      expect(config.batch.size).toBe(25);
    });

    it('reads VERBLETS_DRAIN_SIZE', async () => {
      vi.stubEnv('VERBLETS_DRAIN_SIZE', '200');
      const { getConfig } = await importConfig();
      const config = getConfig();
      expect(config.batch.drainSize).toBe(200);
    });

    it('reads VERBLETS_LOOKBACK_SIZE', async () => {
      vi.stubEnv('VERBLETS_LOOKBACK_SIZE', '2000');
      const { getConfig } = await importConfig();
      const config = getConfig();
      expect(config.batch.lookbackSize).toBe(2000);
    });

    it('reads VERBLETS_AI_TIMEOUT', async () => {
      vi.stubEnv('VERBLETS_AI_TIMEOUT', '60000');
      const { getConfig } = await importConfig();
      const config = getConfig();
      expect(config.ai.timeout).toBe(60000);
    });

    it('falls back to defaults for non-numeric strings', async () => {
      vi.stubEnv('VERBLETS_RING_BUFFER_SIZE', 'abc');
      const { getConfig } = await importConfig();
      const config = getConfig();
      expect(config.ringBufferSize).toBe(5000);
    });
  });
});
