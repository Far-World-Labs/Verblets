import { beforeEach, vi, expect } from 'vitest';
import timeline, { mapEnrichment } from './index.js';
import { Kind, ChainEvent, OpEvent } from '../../lib/progress/constants.js';
import { runTable } from '../../lib/examples-runner/index.js';

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

// ─── mapEnrichment ─────────────────────────────────────────────────────

runTable({
  describe: 'mapEnrichment',
  examples: [
    {
      name: 'low maps to extraction-only',
      inputs: { v: 'low', want: { llmDedup: false, knowledgeBase: false, enrichMap: false } },
    },
    {
      name: 'high maps to full pipeline',
      inputs: { v: 'high', want: { llmDedup: true, knowledgeBase: true, enrichMap: true } },
    },
  ],
  process: ({ v }) => mapEnrichment(v),
  expects: ({ result, inputs }) => expect(result).toEqual(inputs.want),
});

// ─── timeline ──────────────────────────────────────────────────────────

runTable({
  describe: 'timeline',
  examples: [
    {
      name: 'extracts timeline events from short text',
      inputs: {
        text: 'Founded in 2010. Funded in March 2012.',
        instructions: undefined,
        options: { enrichment: 'low' },
        mock: () =>
          llm.mockResolvedValueOnce({
            events: [
              { timestamp: '2010', name: 'Company founded' },
              { timestamp: '2012-03', name: 'First funding' },
            ],
          }),
        want: [
          { timestamp: '2010', name: 'Company founded' },
          { timestamp: '2012-03', name: 'First funding' },
        ],
      },
    },
    {
      name: 'passes systemPrompt to llm',
      inputs: {
        text: 'some text',
        mock: () => llm.mockResolvedValueOnce({ events: [] }),
        wantLlmCalledWith: ['some text', 'Extract timeline events'],
      },
    },
    {
      name: 'incorporates string instructions into extraction systemPrompt',
      inputs: {
        text: 'some text',
        instructions: 'Focus on political events',
        mock: () => llm.mockResolvedValueOnce({ events: [] }),
        wantSystemPromptContains: ['Focus on political events', 'Extract timeline events'],
      },
    },
    {
      name: 'wires instruction bundle context into extraction prompt',
      inputs: {
        text: 'some text',
        instructions: { text: 'Focus on politics', domain: 'US history' },
        mock: () => llm.mockResolvedValueOnce({ events: [] }),
        wantSystemPromptContains: [
          '<domain>',
          'US history',
          'Focus on politics',
          'Extract timeline events',
        ],
      },
    },
    {
      name: 'chunks text based on chunkSize parameter',
      inputs: {
        text: 'a'.repeat(5000),
        instructions: { chunkSize: 1500 },
        mock: () => {
          chunkSentences.mockReturnValueOnce(['chunk1', 'chunk2', 'chunk3']);
          llm.mockResolvedValue({ events: [] });
        },
        wantChunkSentencesCalledWith: { chunkSize: 1500 },
        wantLlmCalls: 3,
      },
    },
    {
      name: 'merges results from multiple chunks',
      inputs: {
        text: 'text',
        options: { chunkSize: 100, enrichment: 'low' },
        mock: () => {
          chunkSentences.mockReturnValueOnce(['chunk1', 'chunk2']);
          llm
            .mockResolvedValueOnce({ events: [{ timestamp: '2020', name: 'Event 1' }] })
            .mockResolvedValueOnce({ events: [{ timestamp: '2021', name: 'Event 2' }] });
        },
        wantLength: 2,
        wantContainsEqual: [
          { timestamp: '2020', name: 'Event 1' },
          { timestamp: '2021', name: 'Event 2' },
        ],
      },
    },
    {
      name: 'deduplicates events with same timestamp and name',
      inputs: {
        text: 'text',
        options: { enrichment: 'low' },
        mock: () => {
          chunkSentences.mockReturnValueOnce(['chunk1', 'chunk2']);
          llm
            .mockResolvedValueOnce({ events: [{ timestamp: '2020-01-01', name: 'Same Event' }] })
            .mockResolvedValueOnce({ events: [{ timestamp: '2020-01-01', name: 'same event' }] });
        },
        want: [{ timestamp: '2020-01-01', name: 'Same Event' }],
      },
    },
    {
      name: 'sorts ISO dates correctly',
      inputs: {
        text: 'text',
        options: { enrichment: 'low' },
        mock: () =>
          llm.mockResolvedValueOnce({
            events: [
              { timestamp: '2023-12-01', name: 'December' },
              { timestamp: '2023-01-15', name: 'January' },
              { timestamp: '2023-06-30', name: 'June' },
            ],
          }),
        wantNamesOrder: ['January', 'June', 'December'],
      },
    },
    {
      name: 'places parseable dates before non-parseable ones',
      inputs: {
        text: 'text',
        options: { enrichment: 'low' },
        mock: () =>
          llm.mockResolvedValueOnce({
            events: [
              { timestamp: 'sometime later', name: 'Vague' },
              { timestamp: '2023-01-01', name: 'Precise' },
              { timestamp: 'in the beginning', name: 'Story' },
            ],
          }),
        wantOrder: [
          { idx: 0, name: 'Precise' },
          { idx: 1, timestamp: 'sometime later' },
          { idx: 2, timestamp: 'in the beginning' },
        ],
      },
    },
    {
      name: 'handles parsing errors gracefully',
      inputs: {
        text: 'text',
        options: { enrichment: 'low' },
        mock: () => {
          chunkSentences.mockReturnValueOnce(['c1', 'c2', 'c3']);
          llm
            .mockResolvedValueOnce({ events: [{ timestamp: '2023', name: 'Good' }] })
            .mockResolvedValueOnce({ events: [] })
            .mockRejectedValueOnce(new Error('API error'));
        },
        want: [{ timestamp: '2023', name: 'Good' }],
      },
    },
    {
      name: 'returns empty array when no events found',
      inputs: { text: 'text', mock: () => llm.mockResolvedValueOnce({ events: [] }), want: [] },
    },
    {
      name: 'throws when all chunks fail extraction',
      inputs: {
        text: 'text',
        options: { enrichment: 'low' },
        mock: () => {
          chunkSentences.mockReturnValueOnce(['c1', 'c2']);
          llm
            .mockRejectedValueOnce(new Error('API error 1'))
            .mockRejectedValueOnce(new Error('API error 2'));
        },
        throws: /all 2 chunks failed/,
      },
    },
    {
      name: 'maintains relative order for non-date timestamps',
      inputs: {
        text: 'text',
        options: { enrichment: 'low' },
        mock: () =>
          llm.mockResolvedValueOnce({
            events: [
              { timestamp: 'first', name: 'A' },
              { timestamp: 'then', name: 'B' },
              { timestamp: 'finally', name: 'C' },
            ],
          }),
        wantNamesOrder: ['A', 'B', 'C'],
      },
    },
    {
      name: 'skips LLM dedup call when enrichment is low',
      inputs: {
        text: 'text',
        instructions: { enrichment: 'low' },
        mock: () =>
          llm.mockResolvedValueOnce({
            events: [
              { timestamp: '2023-01-01', name: 'Event A' },
              { timestamp: '2023-06-15', name: 'Event B' },
            ],
          }),
        wantLlmCalls: 1,
        wantLength: 2,
      },
    },
    {
      name: 'makes dedup LLM call with default enrichment',
      inputs: {
        text: 'text',
        mock: () => {
          const events = [
            { timestamp: '2023-01-01', name: 'Event A' },
            { timestamp: '2023-06-15', name: 'Event B' },
          ];
          llm.mockResolvedValueOnce({ events }).mockResolvedValueOnce({ events });
        },
        wantLlmCalls: 2,
        wantLength: 2,
      },
    },
    {
      name: 'controls parallelism with maxParallel',
      inputs: {
        text: 'text',
        options: { maxParallel: 2, enrichment: 'low' },
        tracker: { active: 0, max: 0 },
        mock(tracker) {
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
        wantTrackerMaxAtMost: 2,
      },
    },
  ],
  process: async ({ text, instructions, options, mock, tracker }) => {
    if (mock) mock(tracker);
    return timeline(text, instructions, options);
  },
  expects: ({ result, error, inputs }) => {
    if ('throws' in inputs) {
      expect(error?.message).toMatch(inputs.throws);
      return;
    }
    if (error) throw error;
    if ('want' in inputs) expect(result).toEqual(inputs.want);
    if ('wantLength' in inputs) expect(result).toHaveLength(inputs.wantLength);
    if (inputs.wantContainsEqual) {
      for (const item of inputs.wantContainsEqual) expect(result).toContainEqual(item);
    }
    if (inputs.wantNamesOrder) {
      expect(result.map((e) => e.name)).toEqual(inputs.wantNamesOrder);
    }
    if (inputs.wantOrder) {
      for (const spec of inputs.wantOrder) {
        const item = result[spec.idx];
        if (spec.name) expect(item.name).toBe(spec.name);
        if (spec.timestamp) expect(item.timestamp).toBe(spec.timestamp);
      }
    }
    if (inputs.wantLlmCalledWith) {
      expect(llm).toHaveBeenCalledWith(
        inputs.wantLlmCalledWith[0],
        expect.objectContaining({
          systemPrompt: expect.stringContaining(inputs.wantLlmCalledWith[1]),
        })
      );
    }
    if (inputs.wantSystemPromptContains) {
      const systemPrompt = llm.mock.calls[0][1].systemPrompt;
      for (const fragment of inputs.wantSystemPromptContains) {
        expect(systemPrompt).toContain(fragment);
      }
    }
    if (inputs.wantChunkSentencesCalledWith) {
      expect(chunkSentences).toHaveBeenCalledWith(
        inputs.text,
        inputs.wantChunkSentencesCalledWith.chunkSize,
        { overlap: 200 }
      );
    }
    if ('wantLlmCalls' in inputs) expect(llm).toHaveBeenCalledTimes(inputs.wantLlmCalls);
    if ('wantTrackerMaxAtMost' in inputs) {
      expect(inputs.tracker.max).toBeLessThanOrEqual(inputs.wantTrackerMaxAtMost);
    }
  },
});

// ─── progress callback ───────────────────────────────────────────────

runTable({
  describe: 'timeline — progress callback',
  examples: [{ name: 'calls progress callback at each stage', inputs: {} }],
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
  expects: ({ result }) => {
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
});
