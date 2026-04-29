import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Mock init() to avoid config validation issues in test
vi.mock('../../init.js', () => ({ default: vi.fn() }));

// Mock heavy imports that require full verblets setup
vi.mock('../llm/index.js', () => ({
  default: vi.fn(),
  jsonSchema: vi.fn((name, schema) => ({ type: 'json_schema', json_schema: { name, schema } })),
}));
vi.mock('../retry/index.js', () => ({
  default: vi.fn(),
}));
vi.mock('../trace-collector/index.js', () => ({
  default: vi.fn(),
}));
vi.mock('../window-for/index.js', () => ({
  default: vi.fn(),
}));
vi.mock('../parallel-batch/index.js', () => ({
  default: vi.fn(),
}));
vi.mock('../text-batch/index.js', () => ({
  default: vi.fn(),
}));

const { RunContext } = await import('./index.js');

describe('RunContext', () => {
  let rootDir;
  let projectRoot;

  beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), 'runcontext-test-'));
    rootDir = join(projectRoot, 'automations', 'test-auto');
    const { mkdir } = await import('node:fs/promises');
    await mkdir(rootDir, { recursive: true });
    await mkdir(join(projectRoot, 'automations', 'data', 'domain'), { recursive: true });
  });

  afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true });
  });

  it('creates a ctx with all expected surfaces', () => {
    const ctx = new RunContext('test-auto', { rootDir, projectRoot });

    // Storage domains
    expect(ctx.localStorage).toBeDefined();
    expect(ctx.automationStorage).toBeDefined();
    expect(ctx.domainStorage).toBeDefined();
    expect(typeof ctx.localStorage.get).toBe('function');
    expect(typeof ctx.automationStorage.setJSON).toBe('function');
    expect(typeof ctx.domainStorage.list).toBe('function');

    // ctx.lib
    expect(ctx.lib).toBeDefined();
    expect(ctx.lib.verblets).toBeDefined();
    expect(ctx.lib.scripts).toBeDefined();
    expect(ctx.lib.emit).toBeDefined();

    // Scripts namespace
    expect(ctx.lib.scripts.files).toBeDefined();
    expect(ctx.lib.scripts.exec).toBeDefined();
    expect(ctx.lib.scripts.mediaEncoding).toBeDefined();
    expect(ctx.lib.scripts.process).toBeDefined();
  });

  it('ctx.lib.verblets contains the shared.js library surface', () => {
    const ctx = new RunContext('test-auto', { rootDir, projectRoot });
    const v = ctx.lib.verblets;

    expect(typeof v.nameStep).toBe('function');
    expect(typeof v.getOption).toBe('function');
    expect(typeof v.getOptions).toBe('function');
    expect(typeof v.withPolicy).toBe('function');
    expect(typeof v.createProgressEmitter).toBe('function');
    expect(typeof v.scopePhase).toBe('function');
  });

  it('ctx.lib.emit is a plain progress emitter', () => {
    const ctx = new RunContext('test-auto', { rootDir, projectRoot });
    const e = ctx.lib.emit;

    expect(typeof e.start).toBe('function');
    expect(typeof e.emit).toBe('function');
    expect(typeof e.complete).toBe('function');
    expect(typeof e.error).toBe('function');
    expect(typeof e.batch).toBe('function');
  });

  it('ctx.lib.scripts.files has file operations', () => {
    const ctx = new RunContext('test-auto', { rootDir, projectRoot });
    const f = ctx.lib.scripts.files;

    expect(typeof f.read).toBe('function');
    expect(typeof f.write).toBe('function');
    expect(typeof f.exists).toBe('function');
    expect(typeof f.stat).toBe('function');
    expect(typeof f.mkdir).toBe('function');
    expect(typeof f.readdir).toBe('function');
    expect(typeof f.glob).toBe('function');
    expect(typeof f.remove).toBe('function');
    expect(typeof f.copy).toBe('function');
    expect(typeof f.move).toBe('function');
  });

  it('ctx.lib.scripts.process has exit', () => {
    const ctx = new RunContext('test-auto', { rootDir, projectRoot });
    expect(typeof ctx.lib.scripts.process.exit).toBe('function');
  });

  it('populates localStorage with ENV and self', async () => {
    const ctx = new RunContext('test-auto', {
      rootDir,
      projectRoot,
      params: { modules: 'filter' },
    });

    // Wait for async population
    await new Promise((r) => setTimeout(r, 50));

    const self = await ctx.localStorage.getJSON('self');
    expect(self.name).toBe('test-auto');
    expect(self.params).toEqual({ modules: 'filter' });
    expect(self.startedAt).toBeDefined();

    const env = await ctx.localStorage.getJSON('ENV');
    expect(env).toBeDefined();
  });

  it('storage domains are isolated from each other', async () => {
    const ctx = new RunContext('test-auto', { rootDir, projectRoot });

    await ctx.localStorage.set('key', 'local');
    await ctx.automationStorage.set('key', 'automation');
    await ctx.domainStorage.set('key', 'domain');

    expect(await ctx.localStorage.get('key')).toBe('local');
    expect(await ctx.automationStorage.get('key')).toBe('automation');
    expect(await ctx.domainStorage.get('key')).toBe('domain');
  });
});
