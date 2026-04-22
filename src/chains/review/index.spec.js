import { beforeEach, describe, expect, it, vi } from 'vitest';
import review from './index.js';
import score from '../score/index.js';
import filter from '../filter/index.js';
import reduce from '../reduce/index.js';
import { ChainEvent, DomainEvent } from '../../lib/progress/constants.js';

vi.mock('../score/index.js', () => ({
  default: vi.fn(),
}));

vi.mock('../filter/index.js', () => ({
  default: vi.fn(),
}));

vi.mock('../reduce/index.js', () => ({
  default: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('review chain', () => {
  describe('iterative loop execution', () => {
    it('runs score → filter → score → reduce when first scores are below threshold', async () => {
      score.mockResolvedValueOnce([3, 4, 5]);
      filter.mockResolvedValueOnce(['item2', 'item3']);
      score.mockResolvedValueOnce([8, 9]);
      reduce.mockResolvedValueOnce('synthesized result');

      const result = await review(['item1', 'item2', 'item3'], 'evaluate quality', {
        threshold: 7,
        maxIterations: 3,
      });

      expect(score).toHaveBeenCalledTimes(2);
      expect(filter).toHaveBeenCalledTimes(1);
      expect(reduce).toHaveBeenCalledTimes(1);
      expect(result).toBe('synthesized result');
    });

    it('passes filtered items to next scoring round', async () => {
      score.mockResolvedValueOnce([2, 3, 8, 9, 1]);
      filter.mockResolvedValueOnce(['c', 'd']);
      score.mockResolvedValueOnce([8, 9]);
      reduce.mockResolvedValueOnce('final');

      await review(['a', 'b', 'c', 'd', 'e'], 'evaluate', {
        threshold: 7,
        maxIterations: 5,
      });

      expect(score.mock.calls[1][0]).toEqual(['c', 'd']);
    });

    it('performs multiple filtering iterations before threshold is met', async () => {
      score.mockResolvedValueOnce([2, 3, 4, 5, 1]);
      filter.mockResolvedValueOnce(['c', 'd', 'e']);
      score.mockResolvedValueOnce([4, 6, 5]);
      filter.mockResolvedValueOnce(['d', 'e']);
      score.mockResolvedValueOnce([8, 8]);
      reduce.mockResolvedValueOnce('final');

      const result = await review(['a', 'b', 'c', 'd', 'e'], 'evaluate', {
        threshold: 7,
        maxIterations: 5,
      });

      expect(score).toHaveBeenCalledTimes(3);
      expect(filter).toHaveBeenCalledTimes(2);
      expect(result).toBe('final');
    });
  });

  describe('threshold stopping condition', () => {
    it('stops on first iteration when scores already meet threshold', async () => {
      score.mockResolvedValueOnce([8, 9, 7]);
      reduce.mockResolvedValueOnce('all good');

      const result = await review(['a', 'b', 'c'], 'evaluate', { threshold: 7 });

      expect(score).toHaveBeenCalledOnce();
      expect(filter).not.toHaveBeenCalled();
      expect(result).toBe('all good');
    });

    it('uses default threshold of 7', async () => {
      score.mockResolvedValueOnce([7, 8]);
      reduce.mockResolvedValueOnce('default threshold');

      const result = await review(['a', 'b'], 'evaluate');

      expect(filter).not.toHaveBeenCalled();
      expect(result).toBe('default threshold');
    });

    it('handles exact threshold match', async () => {
      score.mockResolvedValueOnce([7, 7]);
      reduce.mockResolvedValueOnce('exact match');

      const result = await review(['a', 'b'], 'evaluate', { threshold: 7 });

      expect(filter).not.toHaveBeenCalled();
      expect(result).toBe('exact match');
    });

    it('handles undefined scores by excluding them from average', async () => {
      score.mockResolvedValueOnce([undefined, 8, undefined]);
      reduce.mockResolvedValueOnce('partial scores ok');

      const result = await review(['a', 'b', 'c'], 'evaluate', { threshold: 7 });

      expect(filter).not.toHaveBeenCalled();
      expect(result).toBe('partial scores ok');
    });

    it('treats all-undefined scores as average 0', async () => {
      score.mockResolvedValueOnce([undefined, undefined]);
      filter.mockResolvedValueOnce(['a']);
      score.mockResolvedValueOnce([8]);
      reduce.mockResolvedValueOnce('recovered');

      const result = await review(['a', 'b'], 'evaluate', { threshold: 7, maxIterations: 3 });

      expect(filter).toHaveBeenCalledOnce();
      expect(result).toBe('recovered');
    });
  });

  describe('max iterations limit', () => {
    it('stops at maxIterations even when threshold not met', async () => {
      score.mockResolvedValueOnce([2, 3]);
      filter.mockResolvedValueOnce(['b']);
      score.mockResolvedValueOnce([4]);
      reduce.mockResolvedValueOnce('best effort');

      const result = await review(['a', 'b'], 'evaluate', {
        threshold: 7,
        maxIterations: 2,
      });

      expect(score).toHaveBeenCalledTimes(2);
      expect(filter).toHaveBeenCalledOnce();
      expect(result).toBe('best effort');
    });

    it('uses default maxIterations of 3', async () => {
      score.mockResolvedValueOnce([1, 2, 3, 4]);
      filter.mockResolvedValueOnce(['c', 'd']);
      score.mockResolvedValueOnce([3, 4]);
      filter.mockResolvedValueOnce(['d']);
      score.mockResolvedValueOnce([5]);
      reduce.mockResolvedValueOnce('after 3 iterations');

      const result = await review(['a', 'b', 'c', 'd'], 'evaluate', { threshold: 7 });

      expect(score).toHaveBeenCalledTimes(3);
      expect(reduce).toHaveBeenCalledOnce();
      expect(result).toBe('after 3 iterations');
    });

    it('maxIterations=1 scores once and skips filtering entirely', async () => {
      score.mockResolvedValueOnce([3, 4]);
      reduce.mockResolvedValueOnce('one shot');

      const result = await review(['a', 'b'], 'evaluate', {
        threshold: 7,
        maxIterations: 1,
      });

      expect(score).toHaveBeenCalledOnce();
      expect(filter).not.toHaveBeenCalled();
      expect(result).toBe('one shot');
    });
  });

  describe('filter convergence', () => {
    it('stops when filter returns all items unchanged', async () => {
      score.mockResolvedValueOnce([5, 5]);
      filter.mockResolvedValueOnce(['a', 'b']);
      reduce.mockResolvedValueOnce('stable');

      const result = await review(['a', 'b'], 'evaluate', {
        threshold: 7,
        maxIterations: 5,
      });

      expect(score).toHaveBeenCalledOnce();
      expect(filter).toHaveBeenCalledOnce();
      expect(result).toBe('stable');
    });

    it('stops when filter returns empty list and reduces original items', async () => {
      score.mockResolvedValueOnce([1, 2]);
      filter.mockResolvedValueOnce([]);
      reduce.mockResolvedValueOnce('nothing survived');

      const result = await review(['a', 'b'], 'evaluate', {
        threshold: 7,
        maxIterations: 5,
      });

      expect(reduce).toHaveBeenCalledWith(['a', 'b'], expect.any(String), expect.any(Object));
      expect(result).toBe('nothing survived');
    });
  });

  describe('sub-chain integration', () => {
    it('passes scoring instructions derived from text', async () => {
      score.mockResolvedValueOnce([8]);
      reduce.mockResolvedValueOnce('done');

      await review(['item'], 'evaluate writing quality');

      expect(score).toHaveBeenCalledWith(
        ['item'],
        'evaluate writing quality',
        expect.objectContaining({ operation: 'review' })
      );
    });

    it('passes custom filtering instructions to filter chain', async () => {
      score.mockResolvedValueOnce([3]);
      filter.mockResolvedValueOnce([]);
      reduce.mockResolvedValueOnce('done');

      await review(
        ['item'],
        { text: 'evaluate quality', filtering: 'remove poorly written items' },
        { threshold: 7, maxIterations: 2 }
      );

      expect(filter).toHaveBeenCalledWith(
        ['item'],
        'remove poorly written items',
        expect.objectContaining({ operation: 'review' })
      );
    });

    it('passes custom reducing instructions to reduce chain', async () => {
      score.mockResolvedValueOnce([8]);
      reduce.mockResolvedValueOnce('synthesized');

      await review(['item'], {
        text: 'evaluate quality',
        reducing: 'combine into a summary',
      });

      expect(reduce).toHaveBeenCalledWith(
        ['item'],
        'combine into a summary',
        expect.objectContaining({ operation: 'review' })
      );
    });

    it('uses default filter instruction containing the evaluation text', async () => {
      score.mockResolvedValueOnce([3]);
      filter.mockResolvedValueOnce([]);
      reduce.mockResolvedValueOnce('done');

      await review(['item'], 'evaluate quality', { threshold: 7, maxIterations: 2 });

      expect(filter).toHaveBeenCalledWith(
        ['item'],
        expect.stringContaining('evaluate quality'),
        expect.any(Object)
      );
    });

    it('reduces the filtered items, not the original list', async () => {
      score.mockResolvedValueOnce([3, 8, 2]);
      filter.mockResolvedValueOnce(['b']);
      score.mockResolvedValueOnce([8]);
      reduce.mockResolvedValueOnce('b only');

      await review(['a', 'b', 'c'], 'evaluate', { threshold: 7, maxIterations: 3 });

      expect(reduce).toHaveBeenCalledWith(['b'], expect.any(String), expect.any(Object));
    });

    it('scopes sub-chain progress events by phase', async () => {
      score.mockResolvedValueOnce([8]);
      reduce.mockResolvedValueOnce('result');

      const events = [];
      await review(['a'], 'evaluate', {
        threshold: 7,
        onProgress: (e) => events.push(e),
      });

      const scoreConfig = score.mock.calls[0][2];
      expect(scoreConfig.onProgress).toBeDefined();
      expect(typeof scoreConfig.onProgress).toBe('function');

      const reduceConfig = reduce.mock.calls[0][2];
      expect(reduceConfig.onProgress).toBeDefined();
      expect(typeof reduceConfig.onProgress).toBe('function');
    });
  });

  describe('progress events', () => {
    it('emits full lifecycle: start → input → ticks → phases → output → complete', async () => {
      score.mockResolvedValueOnce([3, 4]);
      filter.mockResolvedValueOnce(['b']);
      score.mockResolvedValueOnce([8]);
      reduce.mockResolvedValueOnce('result');

      const events = [];
      await review(['a', 'b'], 'evaluate', {
        threshold: 7,
        maxIterations: 3,
        onProgress: (e) => events.push(e),
      });

      const reviewEvents = events.filter((e) => e.step === 'review');

      const chainStart = reviewEvents.find((e) => e.event === ChainEvent.start);
      expect(chainStart).toBeDefined();
      expect(chainStart.kind).toBe('telemetry');

      const inputEvent = reviewEvents.find((e) => e.event === DomainEvent.input);
      expect(inputEvent).toBeDefined();
      expect(inputEvent.value).toEqual(['a', 'b']);

      const scoringTicks = reviewEvents.filter(
        (e) => e.event === DomainEvent.tick && e.phase === 'scoring'
      );
      expect(scoringTicks).toHaveLength(2);
      expect(scoringTicks[0].iteration).toBe(0);
      expect(scoringTicks[1].iteration).toBe(1);

      const scoredTicks = reviewEvents.filter(
        (e) => e.event === DomainEvent.tick && e.phase === 'scored'
      );
      expect(scoredTicks).toHaveLength(2);
      expect(scoredTicks[0].averageScore).toBe(3.5);
      expect(scoredTicks[1].averageScore).toBe(8);

      const filteringTick = reviewEvents.find(
        (e) => e.event === DomainEvent.tick && e.phase === 'filtering'
      );
      expect(filteringTick).toBeDefined();

      const filteredTick = reviewEvents.find(
        (e) => e.event === DomainEvent.tick && e.phase === 'filtered'
      );
      expect(filteredTick).toBeDefined();
      expect(filteredTick.inputCount).toBe(2);
      expect(filteredTick.outputCount).toBe(1);

      const thresholdPhase = reviewEvents.find(
        (e) => e.event === DomainEvent.phase && e.phase === 'threshold-met'
      );
      expect(thresholdPhase).toBeDefined();
      expect(thresholdPhase.averageScore).toBe(8);

      const reducingPhase = reviewEvents.find(
        (e) => e.event === DomainEvent.phase && e.phase === 'reducing'
      );
      expect(reducingPhase).toBeDefined();

      const outputEvent = reviewEvents.find((e) => e.event === DomainEvent.output);
      expect(outputEvent).toBeDefined();
      expect(outputEvent.value).toBe('result');

      const chainComplete = reviewEvents.find((e) => e.event === ChainEvent.complete);
      expect(chainComplete).toBeDefined();
      expect(chainComplete.totalItems).toBe(2);
      expect(chainComplete.survivingItems).toBe(1);
      expect(chainComplete.totalIterations).toBe(2);
      expect(chainComplete.outcome).toBe('success');
    });

    it('emits events in correct lifecycle order', async () => {
      score.mockResolvedValueOnce([8]);
      reduce.mockResolvedValueOnce('result');

      const events = [];
      await review(['a'], 'evaluate', {
        threshold: 7,
        onProgress: (e) => events.push(e),
      });

      const reviewEvents = events.filter((e) => e.step === 'review');
      const eventNames = reviewEvents.map((e) => e.event);

      const startIdx = eventNames.indexOf(ChainEvent.start);
      const inputIdx = eventNames.indexOf(DomainEvent.input);
      const outputIdx = eventNames.indexOf(DomainEvent.output);
      const completeIdx = eventNames.indexOf(ChainEvent.complete);

      expect(startIdx).toBeLessThan(inputIdx);
      expect(inputIdx).toBeLessThan(outputIdx);
      expect(outputIdx).toBeLessThan(completeIdx);
    });

    it('emits filter-stable phase when filter does not change items', async () => {
      score.mockResolvedValueOnce([5, 5]);
      filter.mockResolvedValueOnce(['a', 'b']);
      reduce.mockResolvedValueOnce('stable');

      const events = [];
      await review(['a', 'b'], 'evaluate', {
        threshold: 7,
        maxIterations: 3,
        onProgress: (e) => events.push(e),
      });

      const stablePhase = events.find(
        (e) => e.step === 'review' && e.event === DomainEvent.phase && e.phase === 'filter-stable'
      );
      expect(stablePhase).toBeDefined();
    });

    it('events carry operation path and timestamp', async () => {
      score.mockResolvedValueOnce([8]);
      reduce.mockResolvedValueOnce('result');

      const events = [];
      await review(['a'], 'evaluate', {
        threshold: 7,
        onProgress: (e) => events.push(e),
      });

      const chainStart = events.find((e) => e.step === 'review' && e.event === ChainEvent.start);
      expect(chainStart.operation).toBeDefined();
      expect(chainStart.timestamp).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('propagates errors from score chain', async () => {
      score.mockRejectedValueOnce(new Error('scoring failed'));

      await expect(review(['a'], 'evaluate', { threshold: 7 })).rejects.toThrow('scoring failed');
    });

    it('propagates errors from filter chain', async () => {
      score.mockResolvedValueOnce([3]);
      filter.mockRejectedValueOnce(new Error('filtering failed'));

      await expect(review(['a'], 'evaluate', { threshold: 7, maxIterations: 2 })).rejects.toThrow(
        'filtering failed'
      );
    });

    it('propagates errors from reduce chain', async () => {
      score.mockResolvedValueOnce([8]);
      reduce.mockRejectedValueOnce(new Error('reducing failed'));

      await expect(review(['a'], 'evaluate', { threshold: 7 })).rejects.toThrow('reducing failed');
    });

    it('emits error event before propagating', async () => {
      score.mockRejectedValueOnce(new Error('boom'));

      const events = [];
      await review(['a'], 'evaluate', {
        threshold: 7,
        onProgress: (e) => events.push(e),
      }).catch(() => {});

      const errorEvent = events.find((e) => e.step === 'review' && e.event === ChainEvent.error);
      expect(errorEvent).toBeDefined();
      expect(errorEvent.kind).toBe('telemetry');
    });
  });

  describe('metadata', () => {
    it('declares knownTexts for filtering and reducing', () => {
      expect(review.knownTexts).toEqual(['filtering', 'reducing']);
    });
  });
});
