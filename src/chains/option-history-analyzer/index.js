/**
 * Option History Analyzer - Collects decision traces and generates targeting rules.
 *
 * Traces are collected by observing telemetry events through the onProgress stream.
 * Pass `observe` as (or compose it into) your onProgress callback, and the analyzer
 * automatically captures `option:resolve` and `llm:model` events.
 *
 * - `observe(event)` — onProgress consumer; filters for trace-worthy events
 * - `write(trace)` — manual trace insertion (for decisions outside the option system)
 * - `analyze(instruction?)` — sends accumulated traces to an LLM, returns targeting rules
 * - `reader()` — ring buffer reader for custom consumers
 *
 * Consumers decide when to call analyze — on a schedule, after a batch,
 * or during an investigation.
 */

import RingBuffer from '../../lib/ring-buffer/index.js';
import callLlm from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { DomainEvent, ModelSource } from '../../lib/progress/constants.js';
import { nameStep } from '../../lib/context/option.js';

const name = 'option-history-analyzer';

const DEFAULT_BUFFER_SIZE = 1000;
const DEFAULT_LOOKBACK = 200;

const TRACE_EVENTS = new Set([DomainEvent.optionResolve, DomainEvent.llmModel]);

/**
 * Convert a telemetry event into the trace shape the analyzer stores.
 * Returns undefined for events that aren't trace-worthy.
 */
const eventToTrace = (event) => {
  if (event.event === DomainEvent.optionResolve) {
    return {
      option: event.step,
      operation: event.operation,
      source: event.source,
      value: event.value,
      policyReturned: event.policyReturned,
      error: event.error?.message,
    };
  }

  if (event.event === DomainEvent.llmModel) {
    return {
      option: 'llm',
      operation: event.operation,
      source: event.source === ModelSource.default ? 'fallback' : event.source,
      value: event.model,
      policyReturned: event.negotiation,
    };
  }

  return undefined;
};

const RULE_SCHEMA = {
  type: 'object',
  properties: {
    rules: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          clauses: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                attribute: {
                  type: 'string',
                  description: 'Context attribute to match (e.g. domain, tenant, plan)',
                },
                op: {
                  type: 'string',
                  enum: ['in', 'startsWith', 'endsWith', 'contains', 'lessThan', 'greaterThan'],
                  description: 'Match operator',
                },
                values: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Values to match against',
                },
              },
              required: ['attribute', 'op', 'values'],
              additionalProperties: false,
            },
            description: 'Conditions that must all be true for this rule to apply',
          },
          option: {
            type: 'string',
            description: 'The config option this rule targets',
          },
          value: {
            type: 'string',
            description: 'The value to use when the clauses match',
          },
          reasoning: {
            type: 'string',
            description: 'Why this rule is warranted based on observed traces',
          },
        },
        required: ['clauses', 'option', 'value', 'reasoning'],
        additionalProperties: false,
      },
    },
  },
  required: ['rules'],
  additionalProperties: false,
};

/**
 * Build the analysis prompt from accumulated traces.
 * @param {object[]} traces - Decision trace objects
 * @param {string} [instruction] - Additional instruction for the analysis
 * @returns {string}
 */
const buildAnalysisPrompt = (traces, instruction) => {
  const traceBlock = traces
    .map(
      (t, i) =>
        `${i + 1}. option="${t.option}" operation="${t.operation}" source="${t.source}" value="${t.value}"${t.policyReturned !== undefined ? ` policyReturned="${t.policyReturned}"` : ''}${t.error ? ` error="${t.error}"` : ''}`
    )
    .join('\n');

  return `Analyze the following decision traces from a configuration system. Each trace records how an option was resolved: via a policy function, direct config, or fallback default.

Look for patterns that suggest targeting rules:
- Options that consistently fall back to defaults (missing coverage)
- Clusters of similar contexts that should share a rule
- Anomalous decisions that differ from the majority pattern

Express each suggestion as a targeting rule with clauses. Each clause matches a context attribute using an operator (in, startsWith, endsWith, contains, lessThan, greaterThan). All clauses in a rule must match for the rule to apply. Each rule sets one option to one value.

DECISION TRACES (${traces.length} total):
${traceBlock}

Based on these patterns, suggest concrete targeting rules.${instruction ? `\n\nAdditional guidance: ${instruction}` : ''}`;
};

/**
 * Create an option history analyzer that collects decision traces and generates targeting rules.
 *
 * @param {object} [config={}] - Configuration
 * @param {number} [config.bufferSize=1000] - Ring buffer capacity
 * @param {number} [config.lookback=200] - Default number of traces to include in analysis
 * @param {function} [config.onRules] - Callback when analysis produces rules
 * @returns {{ observe: function, write: function, analyze: function, reader: function, stats: function, clear: function }}
 */
export default function createOptionHistoryAnalyzer(config = {}) {
  const {
    bufferSize = DEFAULT_BUFFER_SIZE,
    lookback = DEFAULT_LOOKBACK,
    onRules,
    ...chainConfig
  } = config;

  const buffer = new RingBuffer(bufferSize);
  let traceCount = 0;

  /**
   * Write a decision trace to the buffer.
   * @param {object} trace - Manual decision trace
   */
  const write = (trace) => {
    buffer.writeSync(trace, { force: true });
    traceCount++;
  };

  /**
   * Observe a telemetry event from the onProgress stream.
   * Filters for option:resolve and llm:model events, extracts the trace,
   * and writes it to the ring buffer.
   *
   * Use as an onProgress callback or compose with other consumers:
   *   config.onProgress = (event) => { analyzer.observe(event); otherConsumer(event); }
   *
   * @param {object} event - Telemetry event from onProgress
   */
  const observe = (event) => {
    if (!event || !TRACE_EVENTS.has(event.event)) return;
    const trace = eventToTrace(event);
    if (trace) write(trace);
  };

  /**
   * Analyze accumulated traces and generate targeting rules.
   * @param {string} [instruction] - Additional guidance for the analysis
   * @param {object} [analyzeConfig={}] - Override chain config for this analysis
   * @returns {Promise<object[]>} Array of rule objects with clauses, option, value, reasoning
   */
  const analyze = async (instruction, analyzeConfig = {}) => {
    const traceWindow = Math.min(lookback, traceCount);
    const traces = buffer.lookback(traceWindow);

    if (traces.length === 0) {
      return [];
    }

    const runConfig = nameStep(name, { ...chainConfig, ...analyzeConfig });
    const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
    emitter.start();

    const prompt = buildAnalysisPrompt(traces, instruction);

    const result = await retry(
      () =>
        callLlm(prompt, {
          ...runConfig,
          response_format: {
            type: 'json_schema',
            json_schema: { name: 'rule_suggestions', schema: RULE_SCHEMA },
          },
        }),
      { label: 'option-history-analyzer', config: runConfig }
    );

    const rules = result?.rules ?? result ?? [];

    if (onRules && rules.length > 0) {
      onRules(rules);
    }

    emitter.complete();

    return rules;
  };

  /**
   * Create a ring buffer reader for custom consumption patterns.
   * @param {number} [startOffset] - Optional starting offset
   * @returns {Reader}
   */
  const reader = (startOffset) => buffer.reader(startOffset);

  /**
   * Get statistics.
   * @returns {object}
   */
  const stats = () => ({
    traceCount,
    ...buffer.stats(),
  });

  /**
   * Clear all traces and reset the buffer.
   */
  const clear = () => {
    buffer.clear();
    traceCount = 0;
  };

  return { observe, write, analyze, reader, stats, clear };
}
