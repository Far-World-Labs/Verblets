import { beforeEach, describe, expect, it, vi } from 'vitest';
import understandingEvolution, { mapDepth } from './index.js';
import { Kind, ChainEvent, OpEvent, DomainEvent } from '../../lib/progress/constants.js';

vi.mock('../../lib/llm/index.js', async (importOriginal) => ({
  ...(await importOriginal()),
  default: vi.fn(),
}));
vi.mock('../../lib/chunk-sentences/index.js');
vi.mock('../../lib/retry/index.js');

import llm from '../../lib/llm/index.js';
import chunkSentences from '../../lib/chunk-sentences/index.js';
import retry from '../../lib/retry/index.js';

beforeEach(() => {
  vi.clearAllMocks();
  chunkSentences.mockImplementation((text) => [text]);
  retry.mockImplementation((fn) => fn());
});

describe('mapDepth', () => {
  it('maps low to explicit-only — no implicit detection, no consolidation', () => {
    expect(mapDepth('low')).toEqual({
      detectImplicit: false,
      consolidate: false,
    });
  });

  it('maps high to full pipeline — implicit detection + consolidation', () => {
    expect(mapDepth('high')).toEqual({
      detectImplicit: true,
      consolidate: true,
    });
  });

  it('maps med to default — implicit detection, no consolidation', () => {
    expect(mapDepth('med')).toEqual({
      detectImplicit: true,
      consolidate: false,
    });
  });

  it('returns default for undefined', () => {
    expect(mapDepth(undefined)).toEqual({
      detectImplicit: true,
      consolidate: false,
    });
  });

  it('passes through object values', () => {
    const custom = { detectImplicit: false, consolidate: true };
    expect(mapDepth(custom)).toBe(custom);
  });

  it('returns default for unrecognized string', () => {
    expect(mapDepth('unknown')).toEqual({
      detectImplicit: true,
      consolidate: false,
    });
  });
});

describe('understandingEvolution', () => {
  it('extracts understanding evolution events from short text', async () => {
    const mockResponse = {
      events: [
        {
          timestamp: '1543',
          name: 'Heliocentric model proposed',
          fromState: 'Earth-centered universe',
          toState: 'Sun-centered solar system',
          trigger: 'Copernicus publishes De revolutionibus',
        },
        {
          timestamp: '1687',
          name: 'Gravitational mechanics',
          fromState: 'Celestial motion unexplained',
          toState: 'Universal gravitation explains orbits',
          trigger: "Newton's Principia published",
        },
      ],
    };

    llm.mockResolvedValueOnce(mockResponse);

    const result = await understandingEvolution(
      'Copernicus proposed heliocentrism in 1543. Newton explained gravity in 1687.'
    );

    expect(result).toStrictEqual([
      {
        timestamp: '1543',
        name: 'Heliocentric model proposed',
        fromState: 'Earth-centered universe',
        toState: 'Sun-centered solar system',
        trigger: 'Copernicus publishes De revolutionibus',
      },
      {
        timestamp: '1687',
        name: 'Gravitational mechanics',
        fromState: 'Celestial motion unexplained',
        toState: 'Universal gravitation explains orbits',
        trigger: "Newton's Principia published",
      },
    ]);
  });

  it('passes systemPrompt with extraction instructions to LLM', async () => {
    llm.mockResolvedValueOnce({ events: [] });

    await understandingEvolution('some text');

    expect(llm).toHaveBeenCalledWith(
      'some text',
      expect.objectContaining({
        systemPrompt: expect.stringContaining('Extract moments where understanding'),
      })
    );
  });

  it('includes implicit detection addendum by default (depth=med)', async () => {
    llm.mockResolvedValueOnce({ events: [] });

    await understandingEvolution('some text');

    const callArgs = llm.mock.calls[0][1];
    expect(callArgs.systemPrompt).toContain('Implied understanding changes');
    expect(callArgs.systemPrompt).toContain('Subtle reframings');
  });

  it('omits implicit detection addendum when depth is low', async () => {
    llm.mockResolvedValueOnce({ events: [] });

    await understandingEvolution('some text', { depth: 'low' });

    const callArgs = llm.mock.calls[0][1];
    expect(callArgs.systemPrompt).toContain('Extract moments where understanding');
    expect(callArgs.systemPrompt).not.toContain('Implied understanding changes');
  });

  it('incorporates string instructions into systemPrompt', async () => {
    llm.mockResolvedValueOnce({ events: [] });

    await understandingEvolution('some text', 'Focus on scientific revolutions');

    const callArgs = llm.mock.calls[0][1];
    expect(callArgs.systemPrompt).toContain('Focus on scientific revolutions');
    expect(callArgs.systemPrompt).toContain('Extract moments where understanding');
  });

  it('wires instruction bundle context into extraction prompt', async () => {
    llm.mockResolvedValueOnce({ events: [] });

    await understandingEvolution('some text', {
      text: 'Focus on physics',
      era: 'Renaissance',
    });

    const callArgs = llm.mock.calls[0][1];
    expect(callArgs.systemPrompt).toContain('<era>');
    expect(callArgs.systemPrompt).toContain('Renaissance');
    expect(callArgs.systemPrompt).toContain('Focus on physics');
  });

  it('chunks text based on chunkSize parameter', async () => {
    const mockText = 'a'.repeat(5000);
    chunkSentences.mockReturnValueOnce(['chunk1', 'chunk2', 'chunk3']);
    llm.mockResolvedValue({ events: [] });

    await understandingEvolution(mockText, { chunkSize: 1500 });

    expect(chunkSentences).toHaveBeenCalledWith(mockText, 1500, { overlap: 200 });
    expect(llm).toHaveBeenCalledTimes(3);
  });

  it('merges results from multiple chunks', async () => {
    chunkSentences.mockReturnValueOnce(['chunk1', 'chunk2']);
    llm
      .mockResolvedValueOnce({
        events: [
          {
            timestamp: '1905',
            name: 'Special relativity',
            fromState: 'Absolute space and time',
            toState: 'Spacetime is relative',
            trigger: 'Einstein publishes paper',
          },
        ],
      })
      .mockResolvedValueOnce({
        events: [
          {
            timestamp: '1915',
            name: 'General relativity',
            fromState: 'Gravity as force',
            toState: 'Gravity as spacetime curvature',
            trigger: 'Einstein field equations',
          },
        ],
      });

    const result = await understandingEvolution('text', { chunkSize: 100 });

    expect(result).toHaveLength(2);
    expect(result).toContainEqual(
      expect.objectContaining({ timestamp: '1905', name: 'Special relativity' })
    );
    expect(result).toContainEqual(
      expect.objectContaining({ timestamp: '1915', name: 'General relativity' })
    );
  });

  it('deduplicates events with same name and fromState', async () => {
    chunkSentences.mockReturnValueOnce(['chunk1', 'chunk2']);
    const event = {
      timestamp: '1905',
      name: 'Special Relativity',
      fromState: 'Absolute space and time',
      toState: 'Spacetime is relative',
      trigger: 'Einstein paper',
    };
    llm.mockResolvedValueOnce({ events: [event] }).mockResolvedValueOnce({
      events: [{ ...event, name: 'special relativity', fromState: 'absolute space and time' }],
    });

    const result = await understandingEvolution('text');

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Special Relativity');
  });

  it('sorts events by timestamp with ISO dates', async () => {
    llm.mockResolvedValueOnce({
      events: [
        {
          timestamp: '2023-12-01',
          name: 'Late shift',
          fromState: 'A',
          toState: 'B',
          trigger: 'X',
        },
        {
          timestamp: '2023-01-15',
          name: 'Early shift',
          fromState: 'C',
          toState: 'D',
          trigger: 'Y',
        },
        {
          timestamp: '2023-06-30',
          name: 'Mid shift',
          fromState: 'E',
          toState: 'F',
          trigger: 'Z',
        },
      ],
    });

    const result = await understandingEvolution('text');

    expect(result[0].name).toBe('Early shift');
    expect(result[1].name).toBe('Mid shift');
    expect(result[2].name).toBe('Late shift');
  });

  it('places parseable dates before non-parseable ones', async () => {
    llm.mockResolvedValueOnce({
      events: [
        {
          timestamp: 'sometime later',
          name: 'Vague',
          fromState: 'A',
          toState: 'B',
          trigger: 'X',
        },
        {
          timestamp: '2023-01-01',
          name: 'Precise',
          fromState: 'C',
          toState: 'D',
          trigger: 'Y',
        },
      ],
    });

    const result = await understandingEvolution('text');

    expect(result[0].name).toBe('Precise');
    expect(result[1].name).toBe('Vague');
  });

  it('calls progress callback with correct event sequence', async () => {
    const progressCallback = vi.fn();
    chunkSentences.mockReturnValueOnce(['c1', 'c2']);
    llm.mockResolvedValue({ events: [] });

    await understandingEvolution('text', {
      chunkSize: 10,
      onProgress: progressCallback,
    });

    expect(progressCallback).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        kind: Kind.telemetry,
        event: ChainEvent.start,
      })
    );

    const calls = progressCallback.mock.calls;
    const batchCompleteCall = calls.find(
      ([arg]) => arg?.kind === Kind.operation && arg?.event === OpEvent.batchComplete
    );
    expect(batchCompleteCall).toBeDefined();

    const outputCall = calls.find(
      ([arg]) => arg?.kind === Kind.event && arg?.event === DomainEvent.output
    );
    expect(outputCall).toBeDefined();

    const lastCall = calls[calls.length - 1][0];
    expect(lastCall).toMatchObject({
      kind: Kind.telemetry,
      event: ChainEvent.complete,
    });
  });

  it('returns empty array when no events found', async () => {
    llm.mockResolvedValueOnce({ events: [] });

    const result = await understandingEvolution('text');

    expect(result).toEqual([]);
  });

  it('handles chunk errors gracefully in resilient mode', async () => {
    chunkSentences.mockReturnValueOnce(['c1', 'c2', 'c3']);
    llm
      .mockResolvedValueOnce({
        events: [
          {
            timestamp: '2023',
            name: 'Good event',
            fromState: 'A',
            toState: 'B',
            trigger: 'T',
          },
        ],
      })
      .mockResolvedValueOnce({ events: [] })
      .mockRejectedValueOnce(new Error('API error'));

    const result = await understandingEvolution('text');

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Good event');
  });

  it('reports partial outcome when some chunks fail', async () => {
    const progressCallback = vi.fn();
    chunkSentences.mockReturnValueOnce(['c1', 'c2']);
    llm
      .mockResolvedValueOnce({
        events: [
          {
            timestamp: '2023',
            name: 'Event',
            fromState: 'A',
            toState: 'B',
            trigger: 'T',
          },
        ],
      })
      .mockRejectedValueOnce(new Error('API error'));

    await understandingEvolution('text', { onProgress: progressCallback });

    const completeCall = progressCallback.mock.calls.find(
      ([arg]) => arg?.event === ChainEvent.complete
    );
    expect(completeCall[0].outcome).toBe('partial');
  });

  it('runs consolidation phase when depth is high', async () => {
    const extractedEvents = [
      {
        timestamp: '1905',
        name: 'Relativity shift',
        fromState: 'Newtonian physics',
        toState: 'Relativistic physics',
        trigger: 'Einstein paper',
      },
    ];
    const consolidatedEvents = [
      {
        timestamp: '1905',
        name: 'Physics revolution',
        fromState: 'Classical mechanics',
        toState: 'Modern physics',
        trigger: 'Einstein publications',
      },
    ];
    llm
      .mockResolvedValueOnce({ events: extractedEvents })
      .mockResolvedValueOnce({ events: consolidatedEvents });

    const result = await understandingEvolution('text', { depth: 'high' });

    expect(llm).toHaveBeenCalledTimes(2);
    expect(llm).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('Consolidate'),
      expect.objectContaining({
        systemPrompt: expect.stringContaining('consolidation engine'),
      })
    );
    expect(result).toStrictEqual(consolidatedEvents);
  });

  it('skips consolidation when depth is low', async () => {
    llm.mockResolvedValueOnce({
      events: [
        {
          timestamp: '1905',
          name: 'Shift',
          fromState: 'A',
          toState: 'B',
          trigger: 'T',
        },
      ],
    });

    await understandingEvolution('text', { depth: 'low' });

    expect(llm).toHaveBeenCalledTimes(1);
  });

  it('skips consolidation with default depth', async () => {
    llm.mockResolvedValueOnce({
      events: [
        {
          timestamp: '1905',
          name: 'Shift',
          fromState: 'A',
          toState: 'B',
          trigger: 'T',
        },
      ],
    });

    await understandingEvolution('text');

    expect(llm).toHaveBeenCalledTimes(1);
  });

  it('emits DomainEvent.output with extracted events', async () => {
    const progressCallback = vi.fn();
    const events = [
      {
        timestamp: '1905',
        name: 'Shift',
        fromState: 'A',
        toState: 'B',
        trigger: 'T',
      },
    ];
    llm.mockResolvedValueOnce({ events });

    await understandingEvolution('text', { onProgress: progressCallback });

    const outputCall = progressCallback.mock.calls.find(
      ([arg]) => arg?.event === DomainEvent.output
    );
    expect(outputCall[0].value).toStrictEqual(events);
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
          resolve({ events: [] });
        }, 10);
      });
    });

    await understandingEvolution('text', { maxParallel: 2 });

    expect(maxActiveRequests).toBeLessThanOrEqual(2);
  });

  describe('usage examples', () => {
    it('demonstrates scientific revolution timeline extraction with output shape', async () => {
      llm.mockResolvedValueOnce({
        events: [
          {
            timestamp: '1543',
            name: 'Heliocentric revolution',
            fromState: 'Geocentric model: Earth at center of universe',
            toState: 'Heliocentric model: Earth orbits the Sun',
            trigger: 'Copernicus publishes De revolutionibus orbium coelestium',
          },
          {
            timestamp: '1687',
            name: 'Newtonian mechanics',
            fromState: 'Separate terrestrial and celestial physics',
            toState: 'Unified mechanics via universal gravitation',
            trigger: "Publication of Newton's Principia Mathematica",
          },
          {
            timestamp: '1905',
            name: 'Relativity paradigm',
            fromState: 'Absolute space and time, ether as medium for light',
            toState: 'Spacetime is relative, speed of light is constant',
            trigger: "Einstein's special relativity paper",
          },
        ],
      });

      const inputText = `The Copernican Revolution of 1543 overturned the geocentric model.
        Newton unified terrestrial and celestial mechanics in 1687.
        Einstein's 1905 paper on special relativity challenged absolute space and time.`;

      const result = await understandingEvolution(inputText, 'Focus on physics paradigm shifts');

      expect(result).toHaveLength(3);
      for (const event of result) {
        expect(event).toEqual(
          expect.objectContaining({
            timestamp: expect.any(String),
            name: expect.any(String),
            fromState: expect.any(String),
            toState: expect.any(String),
            trigger: expect.any(String),
          })
        );
      }
      expect(result[0].timestamp).toBe('1543');
      expect(result[2].timestamp).toBe('1905');
    });

    it('demonstrates progress event emission during multi-chunk processing', async () => {
      const events = [];
      const onProgress = (event) => events.push(event);

      chunkSentences.mockReturnValueOnce(['chunk1', 'chunk2']);
      llm
        .mockResolvedValueOnce({
          events: [
            {
              timestamp: '1800',
              name: 'Shift A',
              fromState: 'Old A',
              toState: 'New A',
              trigger: 'Cause A',
            },
          ],
        })
        .mockResolvedValueOnce({
          events: [
            {
              timestamp: '1900',
              name: 'Shift B',
              fromState: 'Old B',
              toState: 'New B',
              trigger: 'Cause B',
            },
          ],
        });

      const result = await understandingEvolution('long text about understanding changes', {
        chunkSize: 100,
        onProgress,
      });

      expect(result).toHaveLength(2);

      const structuredEvents = events.filter((e) => e?.kind);
      const telemetryEvents = structuredEvents.filter((e) => e.kind === Kind.telemetry);
      const operationEvents = structuredEvents.filter((e) => e.kind === Kind.operation);
      const domainEvents = structuredEvents.filter((e) => e.kind === Kind.event);

      expect(telemetryEvents.some((e) => e.event === ChainEvent.start)).toBe(true);
      expect(telemetryEvents.some((e) => e.event === ChainEvent.complete)).toBe(true);
      expect(operationEvents.some((e) => e.event === OpEvent.batchComplete)).toBe(true);
      expect(domainEvents.some((e) => e.event === DomainEvent.output)).toBe(true);
    });
  });
});
