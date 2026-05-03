import { beforeEach, vi, expect } from 'vitest';
import timeline, { mapEnrichment } from './index.js';
import { Kind, ChainEvent, OpEvent } from '../../lib/progress/constants.js';
import { runTable, equals, throws } from '../../lib/examples-runner/index.js';

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
  stripResponse.mockImplementation((str) => str);
  chunkSentences.mockImplementation((text) => [text]);
  retry.mockImplementation((fn) => fn());
  reduce.mockImplementation(async (events) => {
    const seen = new Set();
    const deduped = [];
    for (const event of events) {
      const [timestamp, ...rest] = event.split(': ');
      const name = rest.join(': ');
      const key = `${timestamp}|${name.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push({ timestamp, name });
      }
    }
    return JSON.stringify({ events: deduped });
  });
});

// ─── mapEnrichment ────────────────────────────────────────────────────────

runTable({
  describe: 'mapEnrichment',
  examples: [
    {
      name: 'low maps to extraction-only',
      inputs: { v: 'low' },
      check: equals({ llmDedup: false, knowledgeBase: false, enrichMap: false }),
    },
    {
      name: 'high maps to full pipeline',
      inputs: { v: 'high' },
      check: equals({ llmDedup: true, knowledgeBase: true, enrichMap: true }),
    },
  ],
  process: ({ v }) => mapEnrichment(v),
});

// ─── timeline ─────────────────────────────────────────────────────────────

const examples = [
  {
    name: 'extracts timeline events from short text',
    inputs: {
      text: 'Founded in 2010. Funded in March 2012.',
      instructions: undefined,
      options: { enrichment: 'low' },
      preMock: () =>
        llm.mockResolvedValueOnce({
          events: [
            { timestamp: '2010', name: 'Company founded' },
            { timestamp: '2012-03', name: 'First funding' },
          ],
        }),
    },
    check: equals([
      { timestamp: '2010', name: 'Company founded' },
      { timestamp: '2012-03', name: 'First funding' },
    ]),
  },
  {
    name: 'passes systemPrompt to llm',
    inputs: {
      text: 'some text',
      preMock: () => llm.mockResolvedValueOnce({ events: [] }),
    },
    check: () =>
      expect(llm).toHaveBeenCalledWith(
        'some text',
        expect.objectContaining({
          systemPrompt: expect.stringContaining('Extract timeline events'),
        })
      ),
  },
  {
    name: 'incorporates string instructions into extraction systemPrompt',
    inputs: {
      text: 'some text',
      instructions: 'Focus on political events',
      preMock: () => llm.mockResolvedValueOnce({ events: [] }),
    },
    check: () => {
      const callArgs = llm.mock.calls[0][1];
      expect(callArgs.systemPrompt).toContain('Focus on political events');
      expect(callArgs.systemPrompt).toContain('Extract timeline events');
    },
  },
  {
    name: 'wires instruction bundle context into extraction prompt',
    inputs: {
      text: 'some text',
      instructions: { text: 'Focus on politics', domain: 'US history' },
      preMock: () => llm.mockResolvedValueOnce({ events: [] }),
    },
    check: () => {
      const callArgs = llm.mock.calls[0][1];
      expect(callArgs.systemPrompt).toContain('<domain>');
      expect(callArgs.systemPrompt).toContain('US history');
      expect(callArgs.systemPrompt).toContain('Focus on politics');
      expect(callArgs.systemPrompt).toContain('Extract timeline events');
    },
  },
  {
    name: 'chunks text based on chunkSize parameter',
    inputs: {
      text: 'a'.repeat(5000),
      instructions: { chunkSize: 1500 },
      preMock: () => {
        chunkSentences.mockReturnValueOnce(['chunk1', 'chunk2', 'chunk3']);
        llm.mockResolvedValue({ events: [] });
      },
    },
    check: ({ inputs }) => {
      expect(chunkSentences).toHaveBeenCalledWith(inputs.text, 1500, { overlap: 200 });
      expect(llm).toHaveBeenCalledTimes(3);
    },
  },
  {
    name: 'merges results from multiple chunks',
    inputs: {
      text: 'text',
      options: { chunkSize: 100, enrichment: 'low' },
      preMock: () => {
        chunkSentences.mockReturnValueOnce(['chunk1', 'chunk2']);
        llm
          .mockResolvedValueOnce({ events: [{ timestamp: '2020', name: 'Event 1' }] })
          .mockResolvedValueOnce({ events: [{ timestamp: '2021', name: 'Event 2' }] });
      },
    },
    check: ({ result }) => {
      expect(result).toHaveLength(2);
      expect(result).toContainEqual({ timestamp: '2020', name: 'Event 1' });
      expect(result).toContainEqual({ timestamp: '2021', name: 'Event 2' });
    },
  },
  {
    name: 'deduplicates events with same timestamp and name',
    inputs: {
      text: 'text',
      options: { enrichment: 'low' },
      preMock: () => {
        chunkSentences.mockReturnValueOnce(['chunk1', 'chunk2']);
        llm
          .mockResolvedValueOnce({ events: [{ timestamp: '2020-01-01', name: 'Same Event' }] })
          .mockResolvedValueOnce({ events: [{ timestamp: '2020-01-01', name: 'same event' }] });
      },
    },
    check: equals([{ timestamp: '2020-01-01', name: 'Same Event' }]),
  },
  {
    name: 'sorts ISO dates correctly',
    inputs: {
      text: 'text',
      options: { enrichment: 'low' },
      preMock: () =>
        llm.mockResolvedValueOnce({
          events: [
            { timestamp: '2023-12-01', name: 'December' },
            { timestamp: '2023-01-15', name: 'January' },
            { timestamp: '2023-06-30', name: 'June' },
          ],
        }),
    },
    check: ({ result }) =>
      expect(result.map((e) => e.name)).toEqual(['January', 'June', 'December']),
  },
  {
    name: 'places parseable dates before non-parseable ones',
    inputs: {
      text: 'text',
      options: { enrichment: 'low' },
      preMock: () =>
        llm.mockResolvedValueOnce({
          events: [
            { timestamp: 'sometime later', name: 'Vague' },
            { timestamp: '2023-01-01', name: 'Precise' },
            { timestamp: 'in the beginning', name: 'Story' },
          ],
        }),
    },
    check: ({ result }) => {
      expect(result[0].name).toBe('Precise');
      expect(result[1].timestamp).toBe('sometime later');
      expect(result[2].timestamp).toBe('in the beginning');
    },
  },
  {
    name: 'handles parsing errors gracefully',
    inputs: {
      text: 'text',
      options: { enrichment: 'low' },
      preMock: () => {
        chunkSentences.mockReturnValueOnce(['c1', 'c2', 'c3']);
        llm
          .mockResolvedValueOnce({ events: [{ timestamp: '2023', name: 'Good' }] })
          .mockResolvedValueOnce({ events: [] })
          .mockRejectedValueOnce(new Error('API error'));
      },
    },
    check: equals([{ timestamp: '2023', name: 'Good' }]),
  },
  {
    name: 'returns empty array when no events found',
    inputs: { text: 'text', preMock: () => llm.mockResolvedValueOnce({ events: [] }) },
    check: equals([]),
  },
  {
    name: 'throws when all chunks fail extraction',
    inputs: {
      text: 'text',
      options: { enrichment: 'low' },
      preMock: () => {
        chunkSentences.mockReturnValueOnce(['c1', 'c2']);
        llm
          .mockRejectedValueOnce(new Error('API error 1'))
          .mockRejectedValueOnce(new Error('API error 2'));
      },
    },
    check: throws(/all 2 chunks failed/),
  },
  {
    name: 'maintains relative order for non-date timestamps',
    inputs: {
      text: 'text',
      options: { enrichment: 'low' },
      preMock: () =>
        llm.mockResolvedValueOnce({
          events: [
            { timestamp: 'first', name: 'A' },
            { timestamp: 'then', name: 'B' },
            { timestamp: 'finally', name: 'C' },
          ],
        }),
    },
    check: ({ result }) => expect(result.map((e) => e.name)).toEqual(['A', 'B', 'C']),
  },
  {
    name: 'skips LLM dedup call when enrichment is low',
    inputs: {
      text: 'text',
      instructions: { enrichment: 'low' },
      preMock: () =>
        llm.mockResolvedValueOnce({
          events: [
            { timestamp: '2023-01-01', name: 'Event A' },
            { timestamp: '2023-06-15', name: 'Event B' },
          ],
        }),
    },
    check: ({ result }) => {
      expect(llm).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(2);
    },
  },
  {
    name: 'makes dedup LLM call with default enrichment',
    inputs: {
      text: 'text',
      preMock: () => {
        const events = [
          { timestamp: '2023-01-01', name: 'Event A' },
          { timestamp: '2023-06-15', name: 'Event B' },
        ];
        llm.mockResolvedValueOnce({ events }).mockResolvedValueOnce({ events });
      },
    },
    check: ({ result }) => {
      expect(llm).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
    },
  },
  {
    name: 'controls parallelism with maxParallel',
    inputs: {
      text: 'text',
      options: { maxParallel: 2, enrichment: 'low' },
      tracker: { active: 0, max: 0 },
      preMock(tracker) {
        chunkSentences.mockReturnValueOnce(['c1', 'c2', 'c3', 'c4', 'c5']);
        llm.mockImplementation(() => {
          tracker.active += 1;
          tracker.max = Math.max(tracker.max, tracker.active);
          return new Promise((resolve) =>
            setTimeout(() => {
              tracker.active -= 1;
              resolve({ events: [] });
            }, 10)
          );
        });
      },
    },
    check: ({ inputs }) => expect(inputs.tracker.max).toBeLessThanOrEqual(2),
  },
];

runTable({
  describe: 'timeline',
  examples,
  process: async ({ text, instructions, options, preMock, tracker }) => {
    if (preMock) preMock(tracker);
    return timeline(text, instructions, options);
  },
});

// ─── progress callback ───────────────────────────────────────────────────

runTable({
  describe: 'timeline — progress callback',
  examples: [
    {
      name: 'calls progress callback at each stage',
      inputs: {},
      check: ({ result }) => {
        expect(result.progressCallback).toHaveBeenCalledTimes(8);
        expect(result.progressCallback).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({ kind: Kind.telemetry, event: ChainEvent.start })
        );
        expect(result.progressCallback).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({
            kind: Kind.operation,
            event: OpEvent.start,
            step: 'options',
          })
        );
        expect(result.progressCallback).toHaveBeenNthCalledWith(
          3,
          expect.objectContaining({
            kind: Kind.operation,
            event: OpEvent.complete,
            step: 'options',
          })
        );
        expect(result.progressCallback).toHaveBeenNthCalledWith(4, 1, 3);
        expect(result.progressCallback).toHaveBeenNthCalledWith(5, 2, 3);
        expect(result.progressCallback).toHaveBeenNthCalledWith(6, 3, 3);
        expect(result.progressCallback).toHaveBeenNthCalledWith(
          7,
          expect.objectContaining({ kind: Kind.operation, event: OpEvent.batchComplete })
        );
        expect(result.progressCallback).toHaveBeenNthCalledWith(
          8,
          expect.objectContaining({ kind: Kind.telemetry, event: ChainEvent.complete })
        );
      },
    },
  ],
  process: async () => {
    const progressCallback = vi.fn();
    chunkSentences.mockReturnValueOnce(['c1', 'c2', 'c3']);
    llm.mockResolvedValue({ events: [] });
    await timeline('Text requiring 3 chunks', undefined, {
      chunkSize: 10,
      enrichment: 'low',
      onProgress: progressCallback,
    });
    return { progressCallback };
  },
});
