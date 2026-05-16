import { describe, it, expect, vi, beforeEach } from 'vitest';

import * as claudeBackend from './backends/claude.js';
import { mapAllowedTools, DEFAULT_TOOLS, TOOL_CATEGORIES } from './tools.js';

// ── tools.js ──

describe('mapAllowedTools', () => {
  it('returns DEFAULT_TOOLS for undefined', () => {
    expect(mapAllowedTools(undefined)).toEqual(DEFAULT_TOOLS);
  });

  it('returns all categories for "all"', () => {
    expect(mapAllowedTools('all')).toEqual(TOOL_CATEGORIES);
  });

  it('returns read-only set for "readonly"', () => {
    expect(mapAllowedTools('readonly')).toEqual(['read', 'search', 'glob']);
  });

  it('returns safe defaults for "safe"', () => {
    expect(mapAllowedTools('safe')).toEqual(DEFAULT_TOOLS);
  });

  it('passes through valid array values unchanged', () => {
    const custom = ['read', 'bash'];
    expect(mapAllowedTools(custom)).toBe(custom);
  });

  it('throws on empty array', () => {
    expect(() => mapAllowedTools([])).toThrow(/empty array is not supported/);
  });

  it('throws on unknown category', () => {
    expect(() => mapAllowedTools(['read', 'mystery'])).toThrow(/unknown category: mystery/);
  });

  it('throws on non-array, non-string input', () => {
    expect(() => mapAllowedTools(42)).toThrow(/expected an array/);
  });

  it('throws on unknown string preset', () => {
    expect(() => mapAllowedTools('bogus')).toThrow(/expected an array/);
  });
});

// ── claude backend ──

describe('claude backend', () => {
  describe('buildCliArgs', () => {
    it('produces minimal args with defaults', () => {
      const args = claudeBackend.buildCliArgs({ allowedTools: ['read'] }, 'do something');
      expect(args[0]).toContain('claude');
      expect(args).toContain('--print');
      expect(args).toContain('--output-format');
      expect(args).toContain('stream-json');
      expect(args).toContain('--verbose');
      expect(args.slice(-2)).toEqual(['-p', 'do something']);
    });

    it('includes --max-turns when set', () => {
      const args = claudeBackend.buildCliArgs({ maxTurns: 25, allowedTools: ['read'] }, 'task');
      const idx = args.indexOf('--max-turns');
      expect(idx).toBeGreaterThan(-1);
      expect(args[idx + 1]).toBe('25');
    });

    it('includes --system-prompt when set', () => {
      const args = claudeBackend.buildCliArgs(
        { systemPrompt: 'be concise', allowedTools: ['read'] },
        'task'
      );
      const idx = args.indexOf('--system-prompt');
      expect(idx).toBeGreaterThan(-1);
      expect(args[idx + 1]).toBe('be concise');
    });

    it('maps allowedTools through TOOL_MAP to --tools flag', () => {
      const args = claudeBackend.buildCliArgs({ allowedTools: ['read', 'write', 'bash'] }, 'task');
      const idx = args.indexOf('--tools');
      expect(idx).toBeGreaterThan(-1);
      expect(args[idx + 1]).toContain('Read');
      expect(args[idx + 1]).toContain('Write');
      expect(args[idx + 1]).toContain('Bash');
    });

    it('includes --model when set', () => {
      const args = claudeBackend.buildCliArgs(
        { model: 'claude-sonnet-4-5-20250514', allowedTools: ['read'] },
        'task'
      );
      const idx = args.indexOf('--model');
      expect(idx).toBeGreaterThan(-1);
      expect(args[idx + 1]).toBe('claude-sonnet-4-5-20250514');
    });

    it('includes --effort when set', () => {
      const args = claudeBackend.buildCliArgs({ effort: 'high', allowedTools: ['read'] }, 'task');
      const idx = args.indexOf('--effort');
      expect(idx).toBeGreaterThan(-1);
      expect(args[idx + 1]).toBe('high');
    });

    it('omits --effort when not set', () => {
      const args = claudeBackend.buildCliArgs({ allowedTools: ['read'] }, 'task');
      expect(args).not.toContain('--effort');
    });

    it('includes --dangerously-skip-permissions when skipPermissions is true', () => {
      const args = claudeBackend.buildCliArgs(
        { skipPermissions: true, allowedTools: ['read'] },
        'task'
      );
      expect(args).toContain('--dangerously-skip-permissions');
    });

    it('omits --dangerously-skip-permissions when skipPermissions is false', () => {
      const args = claudeBackend.buildCliArgs(
        { skipPermissions: false, allowedTools: ['read'] },
        'task'
      );
      expect(args).not.toContain('--dangerously-skip-permissions');
    });

    it('does not include --bare', () => {
      const args = claudeBackend.buildCliArgs({ allowedTools: ['read'] }, 'task');
      expect(args).not.toContain('--bare');
    });
  });

  describe('parseOutput', () => {
    it('extracts summary from result message', () => {
      const raw = [
        JSON.stringify({
          type: 'assistant',
          message: { content: [{ type: 'text', text: 'I made the changes.' }] },
        }),
        JSON.stringify({ type: 'result', result: 'I made the changes.', is_error: false }),
      ].join('\n');

      const result = claudeBackend.parseOutput(raw);
      expect(result.summary).toBe('I made the changes.');
      expect(result.filesModified).toEqual([]);
      expect(result.filesCreated).toEqual([]);
    });

    it('extracts files from tool_use blocks in assistant messages', () => {
      const raw = [
        JSON.stringify({
          type: 'assistant',
          message: {
            content: [
              { type: 'tool_use', name: 'Edit', input: { file_path: '/src/lib/foo.js' } },
              { type: 'tool_use', name: 'Write', input: { file_path: '/src/lib/bar.js' } },
            ],
          },
        }),
        JSON.stringify({
          type: 'assistant',
          message: { content: [{ type: 'text', text: 'Done.' }] },
        }),
        JSON.stringify({ type: 'result', result: 'Done.', is_error: false }),
      ].join('\n');

      const result = claudeBackend.parseOutput(raw);
      expect(result.filesModified).toContain('/src/lib/foo.js');
      expect(result.filesModified).toContain('/src/lib/bar.js');
      expect(result.filesCreated).toEqual(['/src/lib/bar.js']);
    });

    it('extracts files from Write tool_use across multiple assistant messages', () => {
      const raw = [
        JSON.stringify({
          type: 'assistant',
          message: {
            content: [{ type: 'tool_use', name: 'Write', input: { file_path: '/new.js' } }],
          },
        }),
        JSON.stringify({
          type: 'assistant',
          message: { content: [{ type: 'text', text: 'Created file.' }] },
        }),
        JSON.stringify({ type: 'result', result: 'Created file.', is_error: false }),
      ].join('\n');

      const result = claudeBackend.parseOutput(raw);
      expect(result.filesModified).toEqual(['/new.js']);
      expect(result.filesCreated).toEqual(['/new.js']);
    });

    it('deduplicates files', () => {
      const raw = [
        JSON.stringify({
          type: 'assistant',
          message: {
            content: [{ type: 'tool_use', name: 'Edit', input: { file_path: '/f.js' } }],
          },
        }),
        JSON.stringify({
          type: 'assistant',
          message: {
            content: [{ type: 'tool_use', name: 'Edit', input: { file_path: '/f.js' } }],
          },
        }),
        JSON.stringify({ type: 'result', result: 'Done.', is_error: false }),
      ].join('\n');

      const result = claudeBackend.parseOutput(raw);
      expect(result.filesModified).toEqual(['/f.js']);
    });

    it('handles content as array of blocks in assistant message', () => {
      const raw = JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: 'First part.' },
            { type: 'text', text: 'Second part.' },
          ],
        },
      });

      const result = claudeBackend.parseOutput(raw);
      expect(result.summary).toBe('First part.\nSecond part.');
    });

    it('handles empty output', () => {
      const result = claudeBackend.parseOutput('');
      expect(result.summary).toBe('');
      expect(result.filesModified).toEqual([]);
      expect(result.filesCreated).toEqual([]);
    });

    it('skips non-JSON lines', () => {
      const raw = `Some debug output\n${JSON.stringify({ type: 'assistant', content: 'ok' })}\nMore noise`;
      const result = claudeBackend.parseOutput(raw);
      expect(result.summary).toBe('ok');
    });

    it('truncates rawOutput to 200k chars', () => {
      const long = 'x'.repeat(300_000);
      const result = claudeBackend.parseOutput(long);
      expect(result.rawOutput.length).toBe(200_000);
    });
  });
});

// ── callAgent lifecycle ──

describe('callAgent', () => {
  let callAgent;
  let mockSpawn;

  beforeEach(async () => {
    vi.resetModules();

    mockSpawn = vi.fn();
    vi.doMock('node:child_process', () => ({ spawn: mockSpawn }));

    const mod = await import('./index.js');
    callAgent = mod.default;
  });

  function createMockChild() {
    const stdout = { on: vi.fn(), listeners: {} };
    const stderr = { on: vi.fn(), listeners: {} };

    stdout.on.mockImplementation((event, fn) => {
      stdout.listeners[event] = fn;
    });
    stderr.on.mockImplementation((event, fn) => {
      stderr.listeners[event] = fn;
    });

    const child = {
      stdout,
      stderr,
      on: vi.fn(),
      kill: vi.fn(),
      _listeners: {},
    };

    child.on.mockImplementation((event, fn) => {
      child._listeners[event] = fn;
    });

    return child;
  }

  function simulateSuccess(stdout = '') {
    mockSpawn.mockImplementation(() => {
      const child = createMockChild();
      process.nextTick(() => {
        if (stdout) child.stdout.listeners.data?.(Buffer.from(stdout));
        child._listeners.close?.(0);
      });
      return child;
    });
  }

  function simulateError(code = 1, stderr = 'failed') {
    mockSpawn.mockImplementation(() => {
      const child = createMockChild();
      process.nextTick(() => {
        if (stderr) child.stderr.listeners.data?.(Buffer.from(stderr));
        child._listeners.close?.(code);
      });
      return child;
    });
  }

  it('calls CLI and returns parsed result', async () => {
    const stdout = [JSON.stringify({ type: 'assistant', content: 'Task complete.' })].join('\n');
    simulateSuccess(stdout);

    const result = await callAgent('implement feature X');

    expect(mockSpawn).toHaveBeenCalledOnce();
    const [cmd] = mockSpawn.mock.calls[0];
    expect(cmd).toContain('claude');
    expect(result.summary).toBe('Task complete.');
  });

  it('passes maxTurns and cwd through config', async () => {
    simulateSuccess(JSON.stringify({ type: 'assistant', content: 'ok' }));

    await callAgent('task', { maxTurns: 30, cwd: '/tmp/test' });

    const [, args, opts] = mockSpawn.mock.calls[0];
    expect(args).toContain('--max-turns');
    expect(args).toContain('30');
    expect(opts.cwd).toBe('/tmp/test');
  });

  it('throws on CLI error with stderr message', async () => {
    simulateError(1, 'authentication failed');

    await expect(callAgent('task')).rejects.toThrow('authentication failed');
  });

  it('throws on timeout', async () => {
    mockSpawn.mockImplementation(() => {
      const child = createMockChild();
      // Never emit close — let timeout kill it
      return child;
    });

    await expect(callAgent('task', { requestTimeout: 100 })).rejects.toThrow('timed out');
  }, 5000);

  it('throws for unknown backend', async () => {
    await expect(callAgent('task', { backend: 'nonexistent' })).rejects.toThrow(
      'Unknown agent backend: nonexistent'
    );
  });

  it('emits progress events through lifecycle', async () => {
    simulateSuccess(JSON.stringify({ type: 'assistant', content: 'done' }));

    const events = [];
    await callAgent('task', { onProgress: (e) => events.push(e) });

    const kinds = events.map((e) => e.kind);
    expect(kinds).toContain('telemetry');
    expect(kinds).toContain('event');

    const startEvent = events.find((e) => e.event === 'chain:start');
    expect(startEvent).toBeDefined();

    const execEvent = events.find((e) => e.event === 'agent:exec');
    expect(execEvent).toBeDefined();
    expect(execEvent.backend).toBe('claude');

    const completeEvent = events.find((e) => e.event === 'chain:complete');
    expect(completeEvent).toBeDefined();
    expect(completeEvent.filesModified).toBe(0);
  });

  it('respects abort signal', async () => {
    const ac = new AbortController();
    ac.abort(new Error('cancelled'));

    mockSpawn.mockImplementation(() => {
      const child = createMockChild();
      return child;
    });

    await expect(callAgent('task', { abortSignal: ac.signal })).rejects.toThrow('aborted');
  });
});
