import { describe, it, expect, vi, beforeEach } from 'vitest';

// Tests for env var reading in the Redis service.
// These protect the configuration paths that will be migrated to the config provider.

describe('redis config env vars', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv('NODE_ENV', 'test');
  });

  it('uses NullRedisClient in test mode by default', async () => {
    const { getClient } = await import('./index.node.js');
    const client = await getClient();

    // NullRedisClient has an in-memory store
    expect(client).toBeDefined();
    expect(typeof client.get).toBe('function');
    expect(typeof client.set).toBe('function');

    // Verify it behaves as in-memory (set then get round-trips)
    client.set('test-key', 'test-value');
    const result = client.get('test-key');
    expect(result).toBe('test-value');
  });

  it('getClient returns same instance on subsequent calls', async () => {
    const { getClient } = await import('./index.node.js');
    const client1 = await getClient();
    const client2 = await getClient();
    expect(client1).toBe(client2);
  });

  it('setClient overrides the active client', async () => {
    const { getClient, setClient } = await import('./index.node.js');
    const mockClient = { get: vi.fn(), set: vi.fn() };
    setClient(mockClient);
    const client = await getClient();
    expect(client).toBe(mockClient);
  });

  it('VERBLETS_DEBUG_REDIS enables debug logging path', async () => {
    // This test verifies the debug logging code path exists and fires
    vi.stubEnv('VERBLETS_DEBUG_REDIS', 'true');

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { getClient } = await import('./index.node.js');
    // First call creates client
    await getClient();
    // Second call reuses — should log reuse message
    await getClient();

    const debugCalls = errorSpy.mock.calls.filter(
      (args) => typeof args[0] === 'string' && args[0].includes('[REDIS]')
    );
    expect(debugCalls.length).toBeGreaterThan(0);

    errorSpy.mockRestore();
  });
});
