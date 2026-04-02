/** Event kind — describes structural shape, not audience.
 *  telemetry = measurements (dashboard-shaped)
 *  operation = execution mechanics (progress-bar-shaped)
 *  event = decisions and meaning (audit-log-shaped)
 */
export const Kind = Object.freeze({
  /** Domain moments: decisions, phase transitions, meaningful outcomes. */
  event: 'event',
  /** Execution progress: start, complete, batch bookkeeping, retries. */
  operation: 'operation',
  /** Infrastructure metrics: LLM calls, model selection, option resolution. */
  telemetry: 'telemetry',
});

/** Level — orthogonal to kind, used for log-like severity. */
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
  retry: 'retry',
  retryAttempt: 'retry:attempt',
  retryError: 'retry:error',
  retryExhaust: 'retry:exhaust',
  error: 'error',
});

/** Domain event names — emitted by emit(). */
export const DomainEvent = Object.freeze({
  phase: 'phase',
  step: 'step',
  tick: 'chain:tick',
  input: 'input',
  output: 'output',
});

/** Telemetry event names — emitted by metrics(). */
export const TelemetryEvent = Object.freeze({
  llmModel: 'llm:model',
  llmCall: 'llm:call',
  optionResolve: 'option:resolve',
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
