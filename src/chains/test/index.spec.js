import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from './index.js';
import { ChainEvent, DomainEvent, Outcome } from '../../lib/progress/constants.js';

// Mock llm
vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
}));

// Mock retry to just call the function
vi.mock('../../lib/retry/index.js', () => ({
  default: vi.fn(async (fn) => fn()),
}));

import llm from '../../lib/llm/index.js';

let tempFile;

beforeEach(() => {
  vi.clearAllMocks();
  tempFile = join(tmpdir(), `test-${Date.now()}.js`);
});

afterEach(async () => {
  try {
    await unlink(tempFile);
  } catch {
    // Ignore if file doesn't exist
  }
});

describe('test chain', () => {
  it('analyzes code and returns feedback when issues found', async () => {
    const mockCode = 'function example() { return "hello"; }';
    await writeFile(tempFile, mockCode);

    llm.mockResolvedValueOnce({
      hasIssues: true,
      issues: ['This function could use JSDoc comments.', 'Consider adding error handling.'],
    });

    const result = await test(tempFile, 'provide feedback');

    expect(result).toEqual([
      'This function could use JSDoc comments.',
      'Consider adding error handling.',
    ]);

    expect(llm).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        responseFormat: expect.objectContaining({
          type: 'json_schema',
        }),
      })
    );
  });

  it('returns empty array when no issues found', async () => {
    const mockCode = 'function example() { return "hello"; }';
    await writeFile(tempFile, mockCode);

    llm.mockResolvedValueOnce({
      hasIssues: false,
      issues: [],
    });

    const result = await test(tempFile, 'provide feedback');

    expect(result).toEqual([]);
  });

  it('handles errors', async () => {
    llm.mockRejectedValueOnce(new Error('Analysis failed'));
    await writeFile(tempFile, 'bad code');

    await expect(test(tempFile, 'provide feedback')).rejects.toThrow('Analysis failed');
  });

  describe('progress emission', () => {
    it('emits chain:start and chain:complete on success', async () => {
      await writeFile(tempFile, 'const x = 1;');
      llm.mockResolvedValueOnce({ hasIssues: false, issues: [] });

      const events = [];
      await test(tempFile, 'check quality', { onProgress: (e) => events.push(e) });

      const startEvent = events.find((e) => e.event === ChainEvent.start);
      expect(startEvent).toBeDefined();
      expect(startEvent.step).toBe('test');
      expect(startEvent.operation).toBeDefined();
      expect(startEvent.timestamp).toBeDefined();

      const completeEvent = events.find((e) => e.event === ChainEvent.complete);
      expect(completeEvent).toBeDefined();
      expect(completeEvent.step).toBe('test');
      expect(completeEvent.outcome).toBe(Outcome.success);
      expect(completeEvent.durationMs).toBeTypeOf('number');
    });

    it('emits file-read phase after reading the file', async () => {
      await writeFile(tempFile, 'const x = 1;');
      llm.mockResolvedValueOnce({ hasIssues: false, issues: [] });

      const events = [];
      await test(tempFile, 'check quality', { onProgress: (e) => events.push(e) });

      const fileReadEvent = events.find(
        (e) => e.event === DomainEvent.phase && e.phase === 'file-read'
      );
      expect(fileReadEvent).toBeDefined();
      expect(fileReadEvent.path).toBe(tempFile);
      expect(fileReadEvent.kind).toBe('event');
    });

    it('emits analyzing phase before LLM call', async () => {
      await writeFile(tempFile, 'const x = 1;');
      llm.mockResolvedValueOnce({ hasIssues: true, issues: ['unused variable'] });

      const events = [];
      await test(tempFile, 'check quality', { onProgress: (e) => events.push(e) });

      const analyzingEvent = events.find(
        (e) => e.event === DomainEvent.phase && e.phase === 'analyzing'
      );
      expect(analyzingEvent).toBeDefined();
      expect(analyzingEvent.kind).toBe('event');
    });

    it('emits analysis-complete phase with issue count after LLM call', async () => {
      await writeFile(tempFile, 'const x = 1;');
      llm.mockResolvedValueOnce({
        hasIssues: true,
        issues: ['unused variable', 'missing semicolon'],
      });

      const events = [];
      await test(tempFile, 'check quality', { onProgress: (e) => events.push(e) });

      const analysisCompleteEvent = events.find(
        (e) => e.event === DomainEvent.phase && e.phase === 'analysis-complete'
      );
      expect(analysisCompleteEvent).toBeDefined();
      expect(analysisCompleteEvent.issueCount).toBe(2);
    });

    it('emits analysis-complete with zero issue count when no issues found', async () => {
      await writeFile(tempFile, 'const x = 1;');
      llm.mockResolvedValueOnce({ hasIssues: false, issues: [] });

      const events = [];
      await test(tempFile, 'check quality', { onProgress: (e) => events.push(e) });

      const analysisCompleteEvent = events.find(
        (e) => e.event === DomainEvent.phase && e.phase === 'analysis-complete'
      );
      expect(analysisCompleteEvent.issueCount).toBe(0);
    });

    it('emits events in correct order: start → file-read → analyzing → analysis-complete → complete', async () => {
      await writeFile(tempFile, 'const x = 1;');
      llm.mockResolvedValueOnce({ hasIssues: false, issues: [] });

      const events = [];
      await test(tempFile, 'check quality', { onProgress: (e) => events.push(e) });

      const eventSequence = events.map((e) => e.event);
      const startIdx = eventSequence.indexOf(ChainEvent.start);
      const fileReadIdx = eventSequence.indexOf(DomainEvent.phase);
      const analyzingIdx = eventSequence.indexOf(DomainEvent.phase, fileReadIdx + 1);
      const analysisCompleteIdx = eventSequence.indexOf(DomainEvent.phase, analyzingIdx + 1);
      const completeIdx = eventSequence.indexOf(ChainEvent.complete);

      expect(startIdx).toBeLessThan(fileReadIdx);
      expect(fileReadIdx).toBeLessThan(analyzingIdx);
      expect(analyzingIdx).toBeLessThan(analysisCompleteIdx);
      expect(analysisCompleteIdx).toBeLessThan(completeIdx);
    });

    it('emits chain:error instead of chain:complete on failure', async () => {
      await writeFile(tempFile, 'const x = 1;');
      llm.mockRejectedValueOnce(new Error('LLM timeout'));

      const events = [];
      await test(tempFile, 'check quality', { onProgress: (e) => events.push(e) }).catch(() => {});

      const errorEvent = events.find((e) => e.event === ChainEvent.error);
      expect(errorEvent).toBeDefined();
      expect(errorEvent.step).toBe('test');
      expect(errorEvent.error.message).toBe('LLM timeout');
      expect(errorEvent.durationMs).toBeTypeOf('number');

      const completeEvent = events.find((e) => e.event === ChainEvent.complete);
      expect(completeEvent).toBeUndefined();
    });

    it('emits file-read and analyzing phases before error when LLM fails', async () => {
      await writeFile(tempFile, 'const x = 1;');
      llm.mockRejectedValueOnce(new Error('LLM timeout'));

      const events = [];
      await test(tempFile, 'check quality', { onProgress: (e) => events.push(e) }).catch(() => {});

      const fileReadEvent = events.find(
        (e) => e.event === DomainEvent.phase && e.phase === 'file-read'
      );
      const analyzingEvent = events.find(
        (e) => e.event === DomainEvent.phase && e.phase === 'analyzing'
      );
      expect(fileReadEvent).toBeDefined();
      expect(analyzingEvent).toBeDefined();

      const analysisCompleteEvent = events.find(
        (e) => e.event === DomainEvent.phase && e.phase === 'analysis-complete'
      );
      expect(analysisCompleteEvent).toBeUndefined();
    });

    it('includes trace context on all emitted events', async () => {
      await writeFile(tempFile, 'const x = 1;');
      llm.mockResolvedValueOnce({ hasIssues: false, issues: [] });

      const events = [];
      await test(tempFile, 'check quality', { onProgress: (e) => events.push(e) });

      for (const event of events) {
        expect(event.traceId).toBeTypeOf('string');
        expect(event.spanId).toBeTypeOf('string');
        expect(event.operation).toMatch(/test/);
      }
    });
  });
});
