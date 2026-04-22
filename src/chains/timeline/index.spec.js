import { beforeEach, describe, expect, it, vi } from 'vitest';
import timeline, { mapEnrichment } from './index.js';
import { Kind, ChainEvent, OpEvent } from '../../lib/progress/constants.js';

// Mock all dependencies
vi.mock('../../lib/llm/index.js', async (importOriginal) => ({
  ...(await importOriginal()),
  default: vi.fn(),
}));
vi.mock('../../lib/strip-response/index.js');
vi.mock('../../lib/chunk-sentences/index.js');
vi.mock('../../lib/retry/index.js');
vi.mock('../reduce/index.js');

import llm from '../../lib/llm/index.js';
import stripResponse from '../../lib/strip-response/index.js';
import chunkSentences from '../../lib/chunk-sentences/index.js';
import retry from '../../lib/retry/index.js';
import reduce from '../reduce/index.js';

beforeEach(() => {
  vi.clearAllMocks();

  // Default mock implementations
  stripResponse.mockImplementation((str) => str);
  chunkSentences.mockImplementation((text) => [text]); // Single chunk by default
  retry.mockImplementation((fn) => fn()); // Just call the function
  // Mock reduce to return deduplicated events
  reduce.mockImplementation(async (events) => {
    // Simple deduplication for tests
    const seen = new Set();
    const deduped = [];
    for (const event of events) {
      const [timestamp, ...nameParts] = event.split(': ');
      const name = nameParts.join(': ');
      const key = `${timestamp}|${name.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push({ timestamp, name });
      }
    }
    return JSON.stringify({ events: deduped });
  });
});

describe('mapEnrichment', () => {
  it('maps low to extraction-only — no LLM dedup, no knowledge, no enrichment', () => {
    expect(mapEnrichment('low')).toEqual({
      llmDedup: false,
      knowledgeBase: false,
      enrichMap: false,
    });
  });

  it('maps high to full pipeline — all phases enabled', () => {
    expect(mapEnrichment('high')).toEqual({ llmDedup: true, knowledgeBase: true, enrichMap: true });
  });
});

describe('timeline', () => {
  it('extracts timeline events from short text', async () => {
    const mockResponse = {
      events: [
        { timestamp: '2010', name: 'Company founded' },
        { timestamp: '2012-03', name: 'First funding' },
      ],
    };

    llm.mockResolvedValueOnce(mockResponse);

    const result = await timeline('Founded in 2010. Funded in March 2012.');

    expect(result).toStrictEqual([
      { timestamp: '2010', name: 'Company founded' },
      { timestamp: '2012-03', name: 'First funding' },
    ]);
  });

  it('passes systemPrompt to llm', async () => {
    llm.mockResolvedValueOnce({ events: [] });

    await timeline('some text');

    expect(llm).toHaveBeenCalledWith(
      'some text',
      expect.objectContaining({
        systemPrompt: expect.stringContaining('Extract timeline events'),
      })
    );
  });

  it('incorporates string instructions into extraction systemPrompt', async () => {
    llm.mockResolvedValueOnce({ events: [] });

    await timeline('some text', 'Focus on political events');

    const callArgs = llm.mock.calls[0][1];
    expect(callArgs.systemPrompt).toContain('Focus on political events');
    expect(callArgs.systemPrompt).toContain('Extract timeline events');
  });

  it('wires instruction bundle context into extraction prompt', async () => {
    llm.mockResolvedValueOnce({ events: [] });

    await timeline('some text', { text: 'Focus on politics', domain: 'US history' });

    const callArgs = llm.mock.calls[0][1];
    expect(callArgs.systemPrompt).toContain('<domain>');
    expect(callArgs.systemPrompt).toContain('US history');
    expect(callArgs.systemPrompt).toContain('Focus on politics');
    expect(callArgs.systemPrompt).toContain('Extract timeline events');
  });

  it('chunks text based on chunkSize parameter', async () => {
    const mockText = 'a'.repeat(5000);
    chunkSentences.mockReturnValueOnce(['chunk1', 'chunk2', 'chunk3']);
    llm.mockResolvedValue({ events: [] });

    await timeline(mockText, { chunkSize: 1500 });

    expect(chunkSentences).toHaveBeenCalledWith(mockText, 1500, { overlap: 200 });
    expect(llm).toHaveBeenCalledTimes(3);
  });

  it('merges results from multiple chunks', async () => {
    chunkSentences.mockReturnValueOnce(['chunk1', 'chunk2']);
    llm
      .mockResolvedValueOnce({ events: [{ timestamp: '2020', name: 'Event 1' }] })
      .mockResolvedValueOnce({ events: [{ timestamp: '2021', name: 'Event 2' }] });

    const result = await timeline('text', { chunkSize: 100 });

    expect(result).toHaveLength(2);
    expect(result).toContainEqual({ timestamp: '2020', name: 'Event 1' });
    expect(result).toContainEqual({ timestamp: '2021', name: 'Event 2' });
  });

  it('deduplicates events with same timestamp and name', async () => {
    chunkSentences.mockReturnValueOnce(['chunk1', 'chunk2']);
    llm
      .mockResolvedValueOnce({ events: [{ timestamp: '2020-01-01', name: 'Same Event' }] })
      .mockResolvedValueOnce({ events: [{ timestamp: '2020-01-01', name: 'same event' }] });

    const result = await timeline('text');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ timestamp: '2020-01-01', name: 'Same Event' });
  });

  it('sorts ISO dates correctly', async () => {
    llm.mockResolvedValueOnce({
      events: [
        { timestamp: '2023-12-01', name: 'December' },
        { timestamp: '2023-01-15', name: 'January' },
        { timestamp: '2023-06-30', name: 'June' },
      ],
    });

    const result = await timeline('text');

    expect(result[0].name).toBe('January');
    expect(result[1].name).toBe('June');
    expect(result[2].name).toBe('December');
  });

  it('places parseable dates before non-parseable ones', async () => {
    llm.mockResolvedValueOnce({
      events: [
        { timestamp: 'sometime later', name: 'Vague' },
        { timestamp: '2023-01-01', name: 'Precise' },
        { timestamp: 'in the beginning', name: 'Story' },
      ],
    });

    const result = await timeline('text');

    expect(result[0].name).toBe('Precise');
    expect(result[1].timestamp).toBe('sometime later');
    expect(result[2].timestamp).toBe('in the beginning');
  });

  it('handles parsing errors gracefully', async () => {
    chunkSentences.mockReturnValueOnce(['c1', 'c2', 'c3']);
    llm
      .mockResolvedValueOnce({ events: [{ timestamp: '2023', name: 'Good' }] })
      .mockResolvedValueOnce({ events: [] })
      .mockRejectedValueOnce(new Error('API error'));

    const result = await timeline('text');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ timestamp: '2023', name: 'Good' });
  });

  it('calls progress callback', async () => {
    const progressCallback = vi.fn();
    chunkSentences.mockReturnValueOnce(['c1', 'c2', 'c3']);
    llm.mockResolvedValue('{"events":[]}');

    await timeline('Text requiring 3 chunks', {
      chunkSize: 10,
      onProgress: progressCallback,
    });

    expect(progressCallback).toHaveBeenCalledTimes(8);
    // First call is the chain:start telemetry event
    expect(progressCallback).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        kind: Kind.telemetry,
        event: ChainEvent.start,
      })
    );
    // getOptions emits its own start/complete lifecycle
    expect(progressCallback).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ kind: Kind.operation, event: OpEvent.start, step: 'options' })
    );
    expect(progressCallback).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ kind: Kind.operation, event: OpEvent.complete, step: 'options' })
    );
    // Per-chunk progress via onProgress
    expect(progressCallback).toHaveBeenNthCalledWith(4, 1, 3);
    expect(progressCallback).toHaveBeenNthCalledWith(5, 2, 3);
    expect(progressCallback).toHaveBeenNthCalledWith(6, 3, 3);
    // Phase batch progress after extraction completes
    expect(progressCallback).toHaveBeenNthCalledWith(
      7,
      expect.objectContaining({
        kind: Kind.operation,
        event: OpEvent.batchComplete,
      })
    );
    // Final chain:complete telemetry event
    expect(progressCallback).toHaveBeenNthCalledWith(
      8,
      expect.objectContaining({
        kind: Kind.telemetry,
        event: ChainEvent.complete,
      })
    );
  });

  it('returns empty array when no events found', async () => {
    llm.mockResolvedValueOnce({ events: [] });

    const result = await timeline('text');

    expect(result).toEqual([]);
  });

  it('handles all chunks returning errors', async () => {
    chunkSentences.mockReturnValueOnce(['c1', 'c2']);
    llm
      .mockRejectedValueOnce(new Error('API error 1'))
      .mockRejectedValueOnce(new Error('API error 2'));

    const result = await timeline('text');

    expect(result).toEqual([]);
  });

  it('maintains relative order for non-date timestamps', async () => {
    llm.mockResolvedValueOnce({
      events: [
        { timestamp: 'first', name: 'A' },
        { timestamp: 'then', name: 'B' },
        { timestamp: 'finally', name: 'C' },
      ],
    });

    const result = await timeline('text');

    // Non-parseable dates should maintain their original order
    expect(result.map((e) => e.name)).toEqual(['A', 'B', 'C']);
  });

  it('skips LLM dedup call when enrichment is low', async () => {
    llm.mockResolvedValueOnce({
      events: [
        { timestamp: '2023-01-01', name: 'Event A' },
        { timestamp: '2023-06-15', name: 'Event B' },
      ],
    });

    const result = await timeline('text', { enrichment: 'low' });

    // Only 1 LLM call (extraction), no dedup call
    expect(llm).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(2);
  });

  it('makes dedup LLM call with default enrichment', async () => {
    const extractedEvents = [
      { timestamp: '2023-01-01', name: 'Event A' },
      { timestamp: '2023-06-15', name: 'Event B' },
    ];
    llm
      .mockResolvedValueOnce({ events: extractedEvents }) // extraction
      .mockResolvedValueOnce({ events: extractedEvents }); // dedup

    const result = await timeline('text');

    // 2 LLM calls: extraction + dedup
    expect(llm).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
  });

  it('controls parallelism with maxParallel', async () => {
    chunkSentences.mockReturnValueOnce(['c1', 'c2', 'c3', 'c4', 'c5']);

    let activeRequests = 0;
    let maxActiveRequests = 0;

    llm.mockImplementation(() => {
      activeRequests++;
      maxActiveRequests = Math.max(maxActiveRequests, activeRequests);

      return new Promise((resolve) => {
        setTimeout(() => {
          activeRequests--;
          resolve('{"events":[]}');
        }, 10);
      });
    });

    await timeline('text', { maxParallel: 2 });

    expect(maxActiveRequests).toBeLessThanOrEqual(2);
  });
});
