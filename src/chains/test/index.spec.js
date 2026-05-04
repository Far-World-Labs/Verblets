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

// ─── test chain (result-shape vocabulary) ────────────────────────────────

runTable({
  describe: 'test chain',
  examples: [
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
        want: ['This function could use JSDoc comments.', 'Consider adding error handling.'],
        wantJsonSchema: true,
      },
    },
    {
      name: 'returns empty array when no issues found',
      inputs: {
        content: 'function example() { return "hello"; }',
        mock: () => llm.mockResolvedValueOnce({ hasIssues: false, issues: [] }),
        instructions: 'provide feedback',
        want: [],
      },
    },
    {
      name: 'handles errors',
      inputs: {
        content: 'bad code',
        mock: () => llm.mockRejectedValueOnce(new Error('Analysis failed')),
        instructions: 'provide feedback',
        throws: 'Analysis failed',
      },
    },
  ],
  process: async ({ content, mock, instructions }) => {
    await writeFile(tempFile, content);
    mock();
    return test(tempFile, instructions);
  },
  expects: ({ result, error, inputs }) => {
    if ('throws' in inputs) {
      expect(error?.message).toBe(inputs.throws);
      return;
    }
    if (error) throw error;
    if ('want' in inputs) expect(result).toEqual(inputs.want);
    if (inputs.wantJsonSchema) {
      expect(llm).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          responseFormat: expect.objectContaining({ type: 'json_schema' }),
        })
      );
    }
  },
});

// ─── test chain — progress emission (events vocabulary) ──────────────────

runTable({
  describe: 'test chain — progress emission',
  examples: [
    {
      name: 'emits chain:start and chain:complete on success',
      inputs: {
        content: 'const x = 1;',
        mock: () => llm.mockResolvedValueOnce({ hasIssues: false, issues: [] }),
        wantStartShape: { step: 'test' },
        wantCompleteShape: { step: 'test', outcome: Outcome.success },
      },
    },
    {
      name: 'emits file-read phase after reading the file',
      inputs: {
        content: 'const x = 1;',
        mock: () => llm.mockResolvedValueOnce({ hasIssues: false, issues: [] }),
        wantPhase: { name: 'file-read', shape: { kind: 'event' } },
        wantPathOnFileRead: true,
      },
    },
    {
      name: 'emits analyzing phase before LLM call',
      inputs: {
        content: 'const x = 1;',
        mock: () => llm.mockResolvedValueOnce({ hasIssues: true, issues: ['unused variable'] }),
        wantPhase: { name: 'analyzing', shape: { kind: 'event' } },
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
        wantPhase: { name: 'analysis-complete' },
        wantIssueCount: 2,
      },
    },
    {
      name: 'emits analysis-complete with zero issue count when no issues found',
      inputs: {
        content: 'const x = 1;',
        mock: () => llm.mockResolvedValueOnce({ hasIssues: false, issues: [] }),
        wantPhase: { name: 'analysis-complete' },
        wantIssueCount: 0,
      },
    },
    {
      name: 'emits events in correct order: start → file-read → analyzing → analysis-complete → complete',
      inputs: {
        content: 'const x = 1;',
        mock: () => llm.mockResolvedValueOnce({ hasIssues: false, issues: [] }),
        wantOrderedEvents: true,
      },
    },
    {
      name: 'emits chain:error instead of chain:complete on failure',
      inputs: {
        content: 'const x = 1;',
        mock: () => llm.mockRejectedValueOnce(new Error('LLM timeout')),
        tolerant: true,
        wantErrorEvent: { step: 'test', errorMessage: 'LLM timeout' },
        wantNoCompleteEvent: true,
      },
    },
    {
      name: 'emits file-read and analyzing phases before error when LLM fails',
      inputs: {
        content: 'const x = 1;',
        mock: () => llm.mockRejectedValueOnce(new Error('LLM timeout')),
        tolerant: true,
        wantPhasesPresent: ['file-read', 'analyzing'],
        wantPhasesAbsent: ['analysis-complete'],
      },
    },
    {
      name: 'includes trace context on all emitted events',
      inputs: {
        content: 'const x = 1;',
        mock: () => llm.mockResolvedValueOnce({ hasIssues: false, issues: [] }),
        wantTraceContext: true,
      },
    },
  ],
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
  expects: ({ result, inputs }) => {
    if (inputs.wantStartShape) {
      const start = result.events.find((e) => e.event === ChainEvent.start);
      expect(start).toMatchObject(inputs.wantStartShape);
      expect(start.operation).toBeDefined();
      expect(start.timestamp).toBeDefined();
    }
    if (inputs.wantCompleteShape) {
      const complete = result.events.find((e) => e.event === ChainEvent.complete);
      expect(complete).toMatchObject(inputs.wantCompleteShape);
      expect(complete.durationMs).toBeTypeOf('number');
    }
    if (inputs.wantPhase) {
      const ev = result.events.find(
        (e) => e.event === DomainEvent.phase && e.phase === inputs.wantPhase.name
      );
      expect(ev).toBeDefined();
      if (inputs.wantPhase.shape) expect(ev).toMatchObject(inputs.wantPhase.shape);
    }
    if (inputs.wantPathOnFileRead) {
      const ev = result.events.find(
        (e) => e.event === DomainEvent.phase && e.phase === 'file-read'
      );
      expect(ev.path).toBe(tempFile);
    }
    if ('wantIssueCount' in inputs) {
      const ev = result.events.find(
        (e) => e.event === DomainEvent.phase && e.phase === 'analysis-complete'
      );
      expect(ev.issueCount).toBe(inputs.wantIssueCount);
    }
    if (inputs.wantOrderedEvents) {
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
    if (inputs.wantErrorEvent) {
      const error = result.events.find((e) => e.event === ChainEvent.error);
      expect(error).toMatchObject({ step: inputs.wantErrorEvent.step });
      expect(error.error.message).toBe(inputs.wantErrorEvent.errorMessage);
      expect(error.durationMs).toBeTypeOf('number');
    }
    if (inputs.wantNoCompleteEvent) {
      expect(result.events.find((e) => e.event === ChainEvent.complete)).toBeUndefined();
    }
    if (inputs.wantPhasesPresent) {
      for (const phase of inputs.wantPhasesPresent) {
        expect(
          result.events.find((e) => e.event === DomainEvent.phase && e.phase === phase)
        ).toBeDefined();
      }
    }
    if (inputs.wantPhasesAbsent) {
      for (const phase of inputs.wantPhasesAbsent) {
        expect(
          result.events.find((e) => e.event === DomainEvent.phase && e.phase === phase)
        ).toBeUndefined();
      }
    }
    if (inputs.wantTraceContext) {
      for (const ev of result.events) {
        expect(ev.traceId).toBeTypeOf('string');
        expect(ev.spanId).toBeTypeOf('string');
        expect(ev.operation).toMatch(/test/);
      }
    }
  },
});
