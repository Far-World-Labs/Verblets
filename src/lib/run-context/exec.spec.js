import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Mock the automation registry
vi.mock('../automation-registry/index.js', () => {
  const paths = {};
  return {
    resolve: vi.fn((name) => paths[name]),
    _setPaths: (p) => Object.assign(paths, p),
    _clear: () => {
      for (const k of Object.keys(paths)) delete paths[k];
    },
  };
});

const registry = await import('../automation-registry/index.js');
const { default: createExec } = await import('./exec.js');

describe('createExec', () => {
  let tempDir;
  let exec;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'exec-test-'));

    const automationDir = join(tempDir, 'mock-auto');
    await mkdir(automationDir, { recursive: true });
    await writeFile(
      join(automationDir, 'index.js'),
      `
      export const meta = { name: 'mock-auto', version: '0.0.1' };
      export async function run(ctx, params) {
        return { received: params, hasCtx: !!ctx };
      }
    `
    );

    registry._setPaths({ 'mock-auto': automationDir });

    exec = createExec({
      emit: { emit: vi.fn() },
      buildChildContext: (_name) => ({
        lib: { emit: { emit: vi.fn() }, verblets: {}, scripts: {} },
        localStorage: {},
        automationStorage: {},
        domainStorage: {},
      }),
    });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
    registry._clear();
  });

  it('invokes a child automation by name', async () => {
    const result = await exec.automation('mock-auto', { key: 'value' });
    expect(result.received).toEqual({ key: 'value' });
    expect(result.hasCtx).toBe(true);
  });

  it('throws for unregistered automation', async () => {
    await expect(exec.automation('nonexistent')).rejects.toThrow('not registered');
  });
});
