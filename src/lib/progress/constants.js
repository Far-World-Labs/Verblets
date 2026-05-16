/**
 * Event kind — structural shape of the event, not its audience.
 * Any consumer can subscribe to any event regardless of kind.
 */
export const Kind = Object.freeze({
  /** Decisions, phases, meaningful outcomes. Audit-log-shaped. */
  event: 'event',
  /** Execution mechanics: lifecycle, batch progress, retries. Progress-bar-shaped. */
  operation: 'operation',
  /** Measurements: counts, durations, rates. Dashboard-shaped. */
  telemetry: 'telemetry',
});

/** Log level — severity hint for log-like events, orthogonal to kind. */
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
  providerWait: 'provider:wait',
  providerRetry: 'provider:retry',
  error: 'error',
});

/** Domain event names — emitted by emit(). */
export const DomainEvent = Object.freeze({
  phase: 'phase',
  step: 'step',
  tick: 'chain:tick',
  input: 'input',
  output: 'output',
  partial: 'partial',
  uncertainty: 'uncertainty',
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
  providerWait: 'verblets.provider.wait',
  tickDuration: 'verblets.tick.duration',
});

/** Token type attribute — discriminates input vs output on token.usage metric. */
export const TokenType = Object.freeze({
  input: 'input',
  output: 'output',
});

/** Chain outcome — normalized result status on complete events. */
export const Outcome = Object.freeze({
  success: 'success',
  partial: 'partial',
  degraded: 'degraded',
});

/** Error posture — how a batch or parallel operation handles failures. */
export const ErrorPosture = Object.freeze({
  strict: 'strict',
  resilient: 'resilient',
});

/** Retry outcome attribute — discriminates attempt results. */
export const RetryOutcome = Object.freeze({
  attempt: 'attempt',
  error: 'error',
  exhaust: 'exhaust',
});

/** Provider error category — drives retry strategy selection. */
export const ErrorCategory = Object.freeze({
  rateLimited: 'rate-limited',
  creditExhausted: 'credit-exhausted',
  overloaded: 'overloaded',
  serverError: 'server-error',
  authFailure: 'auth-failure',
  transient: 'transient',
});

/**
 * Retry mode — controls how the retry module handles provider-level errors.
 *
 * Aligned with ErrorPosture (strict/resilient) — describes posture toward provider throttling.
 *
 * strict:     Fast failure on rate limits and credit exhaustion. No provider-level waits.
 * patient:    Waits for rate limits (up to 1h), retries credit exhaustion every 2min indefinitely.
 * persistent: Like patient with higher rate limit ceiling (4h) and longer overload backoff.
 */
export const RetryMode = Object.freeze({
  strict: 'strict',
  patient: 'patient',
  persistent: 'persistent',
});
