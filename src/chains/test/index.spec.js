import { vi, beforeEach, afterEach, expect } from 'vitest';
import { writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from './index.js';
import { ChainEvent, DomainEvent, Outcome } from '../../lib/progress/constants.js';
import { runTable } from '../../lib/examples-runner/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
}));

vi.mock('../../lib/retry/index.js', () => ({ default: vi.fn(async (fn) => fn()) }));

import llm from '../../lib/llm/index.js';

let tempFile;

beforeEach(() => {
  vi.clearAllMocks();
  tempFile = join(tmpdir(), `test-${Date.now()}-${Math.random().toString(36).slice(2)}.js`);
});

afterEach(async () => {
  try {
    await unlink(tempFile);
  } catch {
    // ignore
  }
});

// Each row supplies file content + a mock setup. The processor writes the
// file, applies the mock, runs `test()` while capturing progress events, and
// returns `{ result, events }`. Rows that expect a throw set `expectThrow`
// so the processor surfaces the error through the runner's `error` channel.

const baseExamples = [
  {
    name: 'analyzes code and returns feedback when issues found',
    inputs: {
      content: 'function example() { return "hello"; }',
      mock: () =>
        llm.mockResolvedValueOnce({
          hasIssues: true,
          issues: ['This function could use JSDoc comments.', 'Consider adding error handling.'],
        }),
      instructions: 'provide feedback',
    },
    check: ({ result }) => {
      expect(result.value).toEqual([
        'This function could use JSDoc comments.',
        'Consider adding error handling.',
      ]);
      expect(llm).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          responseFormat: expect.objectContaining({ type: 'json_schema' }),
        })
      );
    },
  },
  {
    name: 'returns empty array when no issues found',
    inputs: {
      content: 'function example() { return "hello"; }',
      mock: () => llm.mockResolvedValueOnce({ hasIssues: false, issues: [] }),
      instructions: 'provide feedback',
    },
    check: ({ result }) => expect(result.value).toEqual([]),
  },
  {
    name: 'handles errors',
    inputs: {
      content: 'bad code',
      mock: () => llm.mockRejectedValueOnce(new Error('Analysis failed')),
      instructions: 'provide feedback',
      expectThrow: true,
    },
    check: ({ error }) => expect(error.message).toBe('Analysis failed'),
  },
];

runTable({
  describe: 'test chain',
  examples: baseExamples,
  process: async ({ content, mock, instructions, expectThrow }) => {
    await writeFile(tempFile, content);
    mock();
    const events = [];
    let value;
    try {
      value = await test(tempFile, instructions, { onProgress: (e) => events.push(e) });
    } catch (e) {
      if (expectThrow) throw e;
      throw e;
    }
    return { value, events };
  },
});

// ─── progress emission ────────────────────────────────────────────────────

const progressExamples = [
  {
    name: 'emits chain:start and chain:complete on success',
    inputs: {
      content: 'const x = 1;',
      mock: () => llm.mockResolvedValueOnce({ hasIssues: false, issues: [] }),
    },
    check: ({ result }) => {
      const start = result.events.find((e) => e.event === ChainEvent.start);
      expect(start).toMatchObject({ step: 'test' });
      expect(start.operation).toBeDefined();
      expect(start.timestamp).toBeDefined();

      const complete = result.events.find((e) => e.event === ChainEvent.complete);
      expect(complete).toMatchObject({ step: 'test', outcome: Outcome.success });
      expect(complete.durationMs).toBeTypeOf('number');
    },
  },
  {
    name: 'emits file-read phase after reading the file',
    inputs: {
      content: 'const x = 1;',
      mock: () => llm.mockResolvedValueOnce({ hasIssues: false, issues: [] }),
    },
    check: ({ result }) => {
      const fileRead = result.events.find(
        (e) => e.event === DomainEvent.phase && e.phase === 'file-read'
      );
      expect(fileRead).toMatchObject({ kind: 'event', path: tempFile });
    },
  },
  {
    name: 'emits analyzing phase before LLM call',
    inputs: {
      content: 'const x = 1;',
      mock: () => llm.mockResolvedValueOnce({ hasIssues: true, issues: ['unused variable'] }),
    },
    check: ({ result }) => {
      const analyzing = result.events.find(
        (e) => e.event === DomainEvent.phase && e.phase === 'analyzing'
      );
      expect(analyzing).toMatchObject({ kind: 'event' });
    },
  },
  {
    name: 'emits analysis-complete phase with issue count after LLM call',
    inputs: {
      content: 'const x = 1;',
      mock: () =>
        llm.mockResolvedValueOnce({
          hasIssues: true,
          issues: ['unused variable', 'missing semicolon'],
        }),
    },
    check: ({ result }) => {
      const ev = result.events.find(
        (e) => e.event === DomainEvent.phase && e.phase === 'analysis-complete'
      );
      expect(ev.issueCount).toBe(2);
    },
  },
  {
    name: 'emits analysis-complete with zero issue count when no issues found',
    inputs: {
      content: 'const x = 1;',
      mock: () => llm.mockResolvedValueOnce({ hasIssues: false, issues: [] }),
    },
    check: ({ result }) => {
      const ev = result.events.find(
        (e) => e.event === DomainEvent.phase && e.phase === 'analysis-complete'
      );
      expect(ev.issueCount).toBe(0);
    },
  },
  {
    name: 'emits events in correct order: start → file-read → analyzing → analysis-complete → complete',
    inputs: {
      content: 'const x = 1;',
      mock: () => llm.mockResolvedValueOnce({ hasIssues: false, issues: [] }),
    },
    check: ({ result }) => {
      const seq = result.events.map((e) => e.event);
      const startIdx = seq.indexOf(ChainEvent.start);
      const fileReadIdx = seq.indexOf(DomainEvent.phase);
      const analyzingIdx = seq.indexOf(DomainEvent.phase, fileReadIdx + 1);
      const analysisCompleteIdx = seq.indexOf(DomainEvent.phase, analyzingIdx + 1);
      const completeIdx = seq.indexOf(ChainEvent.complete);

      expect(startIdx).toBeLessThan(fileReadIdx);
      expect(fileReadIdx).toBeLessThan(analyzingIdx);
      expect(analyzingIdx).toBeLessThan(analysisCompleteIdx);
      expect(analysisCompleteIdx).toBeLessThan(completeIdx);
    },
  },
  {
    name: 'emits chain:error instead of chain:complete on failure',
    inputs: {
      content: 'const x = 1;',
      mock: () => llm.mockRejectedValueOnce(new Error('LLM timeout')),
      tolerant: true,
    },
    check: ({ result }) => {
      const error = result.events.find((e) => e.event === ChainEvent.error);
      expect(error).toMatchObject({ step: 'test' });
      expect(error.error.message).toBe('LLM timeout');
      expect(error.durationMs).toBeTypeOf('number');
      expect(result.events.find((e) => e.event === ChainEvent.complete)).toBeUndefined();
    },
  },
  {
    name: 'emits file-read and analyzing phases before error when LLM fails',
    inputs: {
      content: 'const x = 1;',
      mock: () => llm.mockRejectedValueOnce(new Error('LLM timeout')),
      tolerant: true,
    },
    check: ({ result }) => {
      const fileRead = result.events.find(
        (e) => e.event === DomainEvent.phase && e.phase === 'file-read'
      );
      const analyzing = result.events.find(
        (e) => e.event === DomainEvent.phase && e.phase === 'analyzing'
      );
      expect(fileRead).toBeDefined();
      expect(analyzing).toBeDefined();
      expect(
        result.events.find((e) => e.event === DomainEvent.phase && e.phase === 'analysis-complete')
      ).toBeUndefined();
    },
  },
  {
    name: 'includes trace context on all emitted events',
    inputs: {
      content: 'const x = 1;',
      mock: () => llm.mockResolvedValueOnce({ hasIssues: false, issues: [] }),
    },
    check: ({ result }) => {
      for (const ev of result.events) {
        expect(ev.traceId).toBeTypeOf('string');
        expect(ev.spanId).toBeTypeOf('string');
        expect(ev.operation).toMatch(/test/);
      }
    },
  },
];

runTable({
  describe: 'test chain — progress emission',
  examples: progressExamples,
  process: async ({ content, mock, tolerant }) => {
    await writeFile(tempFile, content);
    mock();
    const events = [];
    try {
      await test(tempFile, 'check quality', { onProgress: (e) => events.push(e) });
    } catch (e) {
      if (!tolerant) throw e;
    }
    return { events };
  },
});
