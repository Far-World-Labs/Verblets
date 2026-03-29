/** Event kind — discriminates the three progress event categories. */
export const Kind = Object.freeze({
  /** Meaningful moments: lifecycle, decisions, phases, traces. */
  event: 'event',
  /** Mechanical execution progress: batch tracking, retry mechanics. */
  operation: 'operation',
  /** Dimensional metrics: token counts, durations, delays. */
  telemetry: 'telemetry',
});

/** Log level — severity hint for log-like events. */
export const Level = Object.freeze({
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
});

/** Status code — normalized outcome on lifecycle events. */
export const StatusCode = Object.freeze({
  ok: 'ok',
  error: 'error',
});

/** Chain lifecycle event names — emitted by start(), complete(), error(). */
export const ChainEvent = Object.freeze({
  start: 'chain:start',
  complete: 'chain:complete',
  error: 'chain:error',
});

/** Operation event names — emitted by progress() and batch(). */
export const OpEvent = Object.freeze({
  start: 'start',
  complete: 'complete',
  batchComplete: 'batch:complete',
  retryAttempt: 'retry:attempt',
  retryError: 'retry:error',
  retryExhaust: 'retry:exhaust',
});

/** Domain event names — emitted by emit(). */
export const DomainEvent = Object.freeze({
  phase: 'phase',
  step: 'step',
  tick: 'tick',
  llmModel: 'llm:model',
  optionResolve: 'option:resolve',
  promptTrace: 'prompt:trace',
});

/** Telemetry event names — emitted by metrics(). */
export const TelemetryEvent = Object.freeze({
  llmCall: 'llm:call',
});

/** LLM call status values. */
export const LlmStatus = Object.freeze({
  success: 'success',
  error: 'error',
});

/** Model source — how the model was selected. */
export const ModelSource = Object.freeze({
  config: 'config',
  default: 'default',
  negotiated: 'negotiated',
});

/** Option source — how a config option was resolved. */
export const OptionSource = Object.freeze({
  config: 'config',
  policy: 'policy',
  fallback: 'fallback',
});

/**
 * Metric names — OTel-style dimensional metrics.
 * Each metric is a single instrument name; attributes (e.g. tokenType)
 * distinguish variants so they chart together naturally.
 *
 * Naming follows OTel semantic conventions where they exist,
 * verblets.* where they don't.
 */
export const Metric = Object.freeze({
  tokenUsage: 'gen_ai.client.token.usage',
  llmDuration: 'gen_ai.client.operation.duration',
  retryDelay: 'verblets.retry.delay',
  tickDuration: 'verblets.tick.duration',
});

/** Token type attribute — discriminates input vs output on token.usage metric. */
export const TokenType = Object.freeze({
  input: 'input',
  output: 'output',
});

/** Retry outcome attribute — discriminates attempt results. */
export const RetryOutcome = Object.freeze({
  attempt: 'attempt',
  error: 'error',
  exhaust: 'exhaust',
});
