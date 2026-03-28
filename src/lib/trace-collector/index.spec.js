import { describe, it, expect } from 'vitest';
import createTraceCollector, { eventToTrace } from './index.js';
import {
  Kind,
  TelemetryEvent,
  ChainEvent,
  ModelSource,
  OptionSource,
} from '../progress/constants.js';

const makeTrace = (overrides = {}) => ({
  option: 'strictness',
  operation: 'filter',
  source: OptionSource.policy,
  value: 'high',
  policyReturned: 'high',
  ...overrides,
});

describe('trace-collector', () => {
  describe('eventToTrace', () => {
    it('converts option:resolve event', () => {
      const trace = eventToTrace({
        event: TelemetryEvent.optionResolve,
        step: 'strictness',
        operation: 'filter',
        source: OptionSource.policy,
        value: 'high',
        policyReturned: 'high',
      });
      expect(trace).toEqual({
        option: 'strictness',
        operation: 'filter',
        source: OptionSource.policy,
        value: 'high',
        policyReturned: 'high',
        error: undefined,
      });
    });

    it('converts llm:model event with source normalization', () => {
      const trace = eventToTrace({
        event: TelemetryEvent.llmModel,
        operation: 'filter',
        model: 'gpt-4o-mini',
        source: ModelSource.default,
        negotiation: { fast: true },
      });
      expect(trace).toEqual({
        option: 'llm',
        operation: 'filter',
        source: OptionSource.fallback,
        value: 'gpt-4o-mini',
        policyReturned: { fast: true },
      });
    });

    it('preserves non-default source on llm:model', () => {
      const trace = eventToTrace({
        event: TelemetryEvent.llmModel,
        operation: 'filter',
        model: 'gpt-4o',
        source: ModelSource.negotiated,
      });
      expect(trace.source).toBe('negotiated');
    });

    it('captures error message from option:resolve', () => {
      const trace = eventToTrace({
        event: TelemetryEvent.optionResolve,
        step: 'strictness',
        operation: 'filter',
        source: OptionSource.fallback,
        value: 'med',
        error: { message: 'provider down' },
      });
      expect(trace.error).toBe('provider down');
    });

    it('returns undefined for non-trace events', () => {
      expect(eventToTrace({ event: ChainEvent.complete })).toBeUndefined();
      expect(eventToTrace({ event: TelemetryEvent.llmCall })).toBeUndefined();
    });
  });

  describe('createTraceCollector', () => {
    it('creates collector with expected methods', () => {
      const collector = createTraceCollector();
      expect(typeof collector.observe).toBe('function');
      expect(typeof collector.write).toBe('function');
      expect(typeof collector.lookback).toBe('function');
      expect(typeof collector.reader).toBe('function');
      expect(typeof collector.stats).toBe('function');
      expect(typeof collector.clear).toBe('function');
    });

    it('write accumulates traces reflected in stats', () => {
      const collector = createTraceCollector();
      collector.write(makeTrace());
      collector.write(makeTrace({ option: 'thoroughness' }));
      expect(collector.stats().traceCount).toBe(2);
    });

    it('observe captures option:resolve events', () => {
      const collector = createTraceCollector();
      collector.observe({
        kind: Kind.telemetry,
        event: TelemetryEvent.optionResolve,
        step: 'strictness',
        operation: 'filter',
        source: OptionSource.policy,
        value: 'high',
        policyReturned: 'high',
      });
      expect(collector.stats().traceCount).toBe(1);
    });

    it('observe captures llm:model events', () => {
      const collector = createTraceCollector();
      collector.observe({
        kind: Kind.telemetry,
        event: TelemetryEvent.llmModel,
        operation: 'filter',
        model: 'gpt-4o',
        source: ModelSource.negotiated,
      });
      expect(collector.stats().traceCount).toBe(1);
    });

    it('observe ignores non-trace events', () => {
      const collector = createTraceCollector();
      collector.observe({ event: ChainEvent.complete });
      collector.observe({ event: TelemetryEvent.llmCall });
      expect(collector.stats().traceCount).toBe(0);
    });

    it('observe handles undefined and null', () => {
      const collector = createTraceCollector();
      expect(() => collector.observe(undefined)).not.toThrow();
      expect(() => collector.observe(null)).not.toThrow();
      expect(() => collector.observe({})).not.toThrow();
      expect(collector.stats().traceCount).toBe(0);
    });

    it('lookback returns most recent traces', () => {
      const collector = createTraceCollector();
      for (let i = 0; i < 5; i++) {
        collector.write(makeTrace({ value: `v${i}` }));
      }
      const traces = collector.lookback(3);
      expect(traces).toHaveLength(3);
      expect(traces[0].value).toBe('v2');
      expect(traces[2].value).toBe('v4');
    });

    it('lookback clamps to available traces', () => {
      const collector = createTraceCollector();
      collector.write(makeTrace());
      const traces = collector.lookback(100);
      expect(traces).toHaveLength(1);
    });

    it('reader returns a ring buffer reader', async () => {
      const collector = createTraceCollector();
      const r = collector.reader();
      collector.write(makeTrace({ value: 'low' }));
      collector.write(makeTrace({ value: 'high' }));
      const batch = await r.take(2);
      expect(batch).toHaveLength(2);
      expect(batch[0].value).toBe('low');
      expect(batch[1].value).toBe('high');
      r.close();
    });

    it('clear resets traces and stats', () => {
      const collector = createTraceCollector();
      collector.write(makeTrace());
      collector.write(makeTrace());
      collector.clear();
      expect(collector.stats().traceCount).toBe(0);
      expect(collector.stats().sequence).toBe(0);
    });

    it('respects custom bufferSize', () => {
      const collector = createTraceCollector({ bufferSize: 5 });
      for (let i = 0; i < 10; i++) {
        collector.write(makeTrace({ value: `v${i}` }));
      }
      expect(collector.stats().traceCount).toBe(10);
      expect(collector.stats().maxSize).toBe(5);
      // Only last 5 are accessible
      const traces = collector.lookback(10);
      expect(traces).toHaveLength(5);
      expect(traces[0].value).toBe('v5');
    });
  });
});
