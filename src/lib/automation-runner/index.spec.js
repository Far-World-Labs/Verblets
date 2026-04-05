import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Mock the registry to avoid touching real XDG config
vi.mock('../automation-registry/index.js', () => {
  let entries = [];
  return {
    list: vi.fn(() => entries),
    resolve: vi.fn((name) => entries.find((e) => e.name === name)?.path),
    updateStats: vi.fn(),
    _setEntries: (e) => {
      entries = e;
    },
  };
});

// Mock init to avoid config issues
vi.mock('../../init.js', () => ({ default: vi.fn() }));

const registry = await import('../automation-registry/index.js');
const { discoverAutomations } = await import('./index.js');

describe('discoverAutomations', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'runner-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
    registry._setEntries([]);
  });

  it('discovers automations with a valid run export', async () => {
    const autoDir = join(tempDir, 'valid-auto');
    await mkdir(autoDir);
    await writeFile(
      join(autoDir, 'index.js'),
      `export async function run(ctx, params) { return { ok: true }; }`
    );

    registry._setEntries([
      { name: 'valid-auto', path: autoDir, registeredAt: new Date().toISOString() },
    ]);

    const automations = await discoverAutomations();
    expect(automations.length).toBe(1);
    expect(automations[0].name).toBe('valid-auto');
  });

  it('skips entries whose index.js has no run function', async () => {
    const autoDir = join(tempDir, 'no-run');
    await mkdir(autoDir);
    await writeFile(join(autoDir, 'index.js'), `export const meta = { name: 'no-run' };`);

    registry._setEntries([
      { name: 'no-run', path: autoDir, registeredAt: new Date().toISOString() },
    ]);

    const automations = await discoverAutomations();
    expect(automations.length).toBe(0);
  });

  it('returns empty when registry is empty', async () => {
    registry._setEntries([]);
    const automations = await discoverAutomations();
    expect(automations).toEqual([]);
  });
});
