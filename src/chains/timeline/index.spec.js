import { beforeEach, describe, expect, it, vi } from 'vitest';
import timeline from './index.js';

// Mock all dependencies
vi.mock('../../lib/chatgpt/index.js');
vi.mock('../../lib/strip-response/index.js');
vi.mock('../../lib/chunk-sentences/index.js');
vi.mock('../../lib/retry/index.js');
vi.mock('../reduce/index.js');

import chatGPT from '../../lib/chatgpt/index.js';
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

describe('timeline', () => {
  it('extracts timeline events from short text', async () => {
    const mockResponse = {
      events: [
        { timestamp: '2010', name: 'Company founded' },
        { timestamp: '2012-03', name: 'First funding' },
      ],
    };

    chatGPT.mockResolvedValueOnce(mockResponse);

    const result = await timeline('Founded in 2010. Funded in March 2012.');

    expect(result).toStrictEqual([
      { timestamp: '2010', name: 'Company founded' },
      { timestamp: '2012-03', name: 'First funding' },
    ]);
  });

  it('passes correct schema to chatGPT', async () => {
    chatGPT.mockResolvedValueOnce({ events: [] });

    await timeline('some text');

    expect(chatGPT).toHaveBeenCalledWith(
      'some text',
      expect.objectContaining({
        modelOptions: expect.objectContaining({
          systemPrompt: expect.stringContaining('Extract timeline events'),
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'timeline_events',
              schema: expect.objectContaining({
                type: 'object',
                properties: expect.objectContaining({
                  events: expect.objectContaining({
                    type: 'array',
                  }),
                }),
              }),
              strict: true,
            },
          },
        }),
      })
    );
  });

  it('chunks text based on chunkSize parameter', async () => {
    const mockText = 'a'.repeat(5000);
    chunkSentences.mockReturnValueOnce(['chunk1', 'chunk2', 'chunk3']);
    chatGPT.mockResolvedValue({ events: [] });

    await timeline(mockText, { chunkSize: 1500 });

    expect(chunkSentences).toHaveBeenCalledWith(mockText, 1500, { overlap: 200 });
    expect(chatGPT).toHaveBeenCalledTimes(3);
  });

  it('merges results from multiple chunks', async () => {
    chunkSentences.mockReturnValueOnce(['chunk1', 'chunk2']);
    chatGPT
      .mockResolvedValueOnce({ events: [{ timestamp: '2020', name: 'Event 1' }] })
      .mockResolvedValueOnce({ events: [{ timestamp: '2021', name: 'Event 2' }] });

    const result = await timeline('text', { chunkSize: 100 });

    expect(result).toHaveLength(2);
    expect(result).toContainEqual({ timestamp: '2020', name: 'Event 1' });
    expect(result).toContainEqual({ timestamp: '2021', name: 'Event 2' });
  });

  it('deduplicates events with same timestamp and name', async () => {
    chunkSentences.mockReturnValueOnce(['chunk1', 'chunk2']);
    chatGPT
      .mockResolvedValueOnce({ events: [{ timestamp: '2020-01-01', name: 'Same Event' }] })
      .mockResolvedValueOnce({ events: [{ timestamp: '2020-01-01', name: 'same event' }] });

    const result = await timeline('text');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ timestamp: '2020-01-01', name: 'Same Event' });
  });

  it('sorts ISO dates correctly', async () => {
    chatGPT.mockResolvedValueOnce({
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
    chatGPT.mockResolvedValueOnce({
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
    chatGPT
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
    chatGPT.mockResolvedValue('{"events":[]}');

    await timeline('Text requiring 3 chunks', {
      chunkSize: 10,
      onProgress: progressCallback,
    });

    expect(progressCallback).toHaveBeenCalledTimes(3);
    expect(progressCallback).toHaveBeenNthCalledWith(1, 1, 3);
    expect(progressCallback).toHaveBeenNthCalledWith(2, 2, 3);
    expect(progressCallback).toHaveBeenNthCalledWith(3, 3, 3);
  });

  it('passes through custom options to chatGPT', async () => {
    chatGPT.mockResolvedValueOnce({ events: [] });

    await timeline('text', {
      chunkSize: 3000,
      maxParallel: 10,
      customOption: 'value',
      llm: { temperature: 0.5 },
    });

    expect(chatGPT).toHaveBeenCalledWith(
      'text',
      expect.objectContaining({
        modelOptions: expect.objectContaining({
          temperature: 0.5,
        }),
        customOption: 'value',
      })
    );
  });

  it('returns empty array when no events found', async () => {
    chatGPT.mockResolvedValueOnce({ events: [] });

    const result = await timeline('text');

    expect(result).toEqual([]);
  });

  it('handles all chunks returning errors', async () => {
    chunkSentences.mockReturnValueOnce(['c1', 'c2']);
    chatGPT
      .mockRejectedValueOnce(new Error('API error 1'))
      .mockRejectedValueOnce(new Error('API error 2'));

    const result = await timeline('text');

    expect(result).toEqual([]);
  });

  it('strips response wrapper from results', async () => {
    // No longer needed since chatGPT handles JSON parsing
    chatGPT.mockResolvedValueOnce({
      events: [{ timestamp: '2023', name: 'Event' }],
    });

    const result = await timeline('text');

    expect(result).toEqual([{ timestamp: '2023', name: 'Event' }]);
  });

  it('maintains relative order for non-date timestamps', async () => {
    chatGPT.mockResolvedValueOnce({
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

  it('controls parallelism with maxParallel', async () => {
    chunkSentences.mockReturnValueOnce(['c1', 'c2', 'c3', 'c4', 'c5']);

    let activeRequests = 0;
    let maxActiveRequests = 0;

    chatGPT.mockImplementation(() => {
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
