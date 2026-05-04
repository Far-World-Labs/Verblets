import { vi, beforeEach, afterEach, expect } from 'vitest';
import { writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from './index.js';
import { ChainEvent, DomainEvent, Outcome } from '../../lib/progress/constants.js';
import { runTable, applyMocks } from '../../lib/examples-runner/index.js';

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

runTable({
  describe: 'test chain',
  examples: [
    {
      name: 'analyzes code and returns feedback when issues found',
      inputs: {
        content: 'function example() { return "hello"; }',
        instructions: 'provide feedback',
      },
      mocks: {
        llm: [
          {
            hasIssues: true,
            issues: ['This function could use JSDoc comments.', 'Consider adding error handling.'],
          },
        ],
      },
      want: {
        value: ['This function could use JSDoc comments.', 'Consider adding error handling.'],
        jsonSchema: true,
      },
    },
    {
      name: 'returns empty array when no issues found',
      inputs: {
        content: 'function example() { return "hello"; }',
        instructions: 'provide feedback',
      },
      mocks: { llm: [{ hasIssues: false, issues: [] }] },
      want: { value: [] },
    },
    {
      name: 'handles errors',
      inputs: { content: 'bad code', instructions: 'provide feedback' },
      mocks: { llm: [new Error('Analysis failed')] },
      want: { throws: 'Analysis failed' },
    },
  ],
  process: async ({ inputs, mocks }) => {
    await writeFile(tempFile, inputs.content);
    applyMocks(mocks, { llm });
    return test(tempFile, inputs.instructions);
  },
  expects: ({ result, error, want }) => {
    if (want.throws) {
      expect(error?.message).toBe(want.throws);
      return;
    }
    if (error) throw error;
    if ('value' in want) expect(result).toEqual(want.value);
    if (want.jsonSchema) {
      expect(llm).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          responseFormat: expect.objectContaining({ type: 'json_schema' }),
        })
      );
    }
  },
});

runTable({
  describe: 'test chain — progress emission',
  examples: [
    {
      name: 'emits chain:start and chain:complete on success',
      inputs: { content: 'const x = 1;' },
      mocks: { llm: [{ hasIssues: false, issues: [] }] },
      want: {
        startShape: { step: 'test' },
        completeShape: { step: 'test', outcome: Outcome.success },
      },
    },
    {
      name: 'emits file-read phase after reading the file',
      inputs: { content: 'const x = 1;' },
      mocks: { llm: [{ hasIssues: false, issues: [] }] },
      want: { phase: { name: 'file-read', shape: { kind: 'event' } }, pathOnFileRead: true },
    },
    {
      name: 'emits analyzing phase before LLM call',
      inputs: { content: 'const x = 1;' },
      mocks: { llm: [{ hasIssues: true, issues: ['unused variable'] }] },
      want: { phase: { name: 'analyzing', shape: { kind: 'event' } } },
    },
    {
      name: 'emits analysis-complete phase with issue count after LLM call',
      inputs: { content: 'const x = 1;' },
      mocks: { llm: [{ hasIssues: true, issues: ['unused variable', 'missing semicolon'] }] },
      want: { phase: { name: 'analysis-complete' }, issueCount: 2 },
    },
    {
      name: 'emits analysis-complete with zero issue count when no issues found',
      inputs: { content: 'const x = 1;' },
      mocks: { llm: [{ hasIssues: false, issues: [] }] },
      want: { phase: { name: 'analysis-complete' }, issueCount: 0 },
    },
    {
      name: 'emits events in correct order: start → file-read → analyzing → analysis-complete → complete',
      inputs: { content: 'const x = 1;' },
      mocks: { llm: [{ hasIssues: false, issues: [] }] },
      want: { orderedEvents: true },
    },
    {
      name: 'emits chain:error instead of chain:complete on failure',
      inputs: { content: 'const x = 1;', tolerant: true },
      mocks: { llm: [new Error('LLM timeout')] },
      want: {
        errorEvent: { step: 'test', errorMessage: 'LLM timeout' },
        noCompleteEvent: true,
      },
    },
    {
      name: 'emits file-read and analyzing phases before error when LLM fails',
      inputs: { content: 'const x = 1;', tolerant: true },
      mocks: { llm: [new Error('LLM timeout')] },
      want: { phasesPresent: ['file-read', 'analyzing'], phasesAbsent: ['analysis-complete'] },
    },
    {
      name: 'includes trace context on all emitted events',
      inputs: { content: 'const x = 1;' },
      mocks: { llm: [{ hasIssues: false, issues: [] }] },
      want: { traceContext: true },
    },
  ],
  process: async ({ inputs, mocks }) => {
    await writeFile(tempFile, inputs.content);
    applyMocks(mocks, { llm });
    const events = [];
    try {
      await test(tempFile, 'check quality', { onProgress: (e) => events.push(e) });
    } catch (e) {
      if (!inputs.tolerant) throw e;
    }
    return { events };
  },
  expects: ({ result, want }) => {
    if (want.startShape) {
      const start = result.events.find((e) => e.event === ChainEvent.start);
      expect(start).toMatchObject(want.startShape);
      expect(start.operation).toBeDefined();
      expect(start.timestamp).toBeDefined();
    }
    if (want.completeShape) {
      const complete = result.events.find((e) => e.event === ChainEvent.complete);
      expect(complete).toMatchObject(want.completeShape);
      expect(complete.durationMs).toBeTypeOf('number');
    }
    if (want.phase) {
      const ev = result.events.find(
        (e) => e.event === DomainEvent.phase && e.phase === want.phase.name
      );
      expect(ev).toBeDefined();
      if (want.phase.shape) expect(ev).toMatchObject(want.phase.shape);
    }
    if (want.pathOnFileRead) {
      const ev = result.events.find(
        (e) => e.event === DomainEvent.phase && e.phase === 'file-read'
      );
      expect(ev.path).toBe(tempFile);
    }
    if ('issueCount' in want) {
      const ev = result.events.find(
        (e) => e.event === DomainEvent.phase && e.phase === 'analysis-complete'
      );
      expect(ev.issueCount).toBe(want.issueCount);
    }
    if (want.orderedEvents) {
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
    }
    if (want.errorEvent) {
      const error = result.events.find((e) => e.event === ChainEvent.error);
      expect(error).toMatchObject({ step: want.errorEvent.step });
      expect(error.error.message).toBe(want.errorEvent.errorMessage);
      expect(error.durationMs).toBeTypeOf('number');
    }
    if (want.noCompleteEvent) {
      expect(result.events.find((e) => e.event === ChainEvent.complete)).toBeUndefined();
    }
    if (want.phasesPresent) {
      for (const phase of want.phasesPresent) {
        expect(
          result.events.find((e) => e.event === DomainEvent.phase && e.phase === phase)
        ).toBeDefined();
      }
    }
    if (want.phasesAbsent) {
      for (const phase of want.phasesAbsent) {
        expect(
          result.events.find((e) => e.event === DomainEvent.phase && e.phase === phase)
        ).toBeUndefined();
      }
    }
    if (want.traceContext) {
      for (const ev of result.events) {
        expect(ev.traceId).toBeTypeOf('string');
        expect(ev.spanId).toBeTypeOf('string');
        expect(ev.operation).toMatch(/test/);
      }
    }
  },
});
