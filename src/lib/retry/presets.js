import { RetryMode } from '../progress/constants.js';

/**
 * Retry mode presets — provider-level wait configuration per mode.
 *
 * These control how the retry module handles rate limits, credit exhaustion,
 * and overloaded providers. Standard retry (maxAttempts, retryDelay) is
 * independent of these presets.
 *
 * rateLimitCeiling:      Max ms to wait for a single rate-limit reset.
 * creditRetryInterval:   Ms between credit-exhaustion retries (0 = throw immediately).
 * overloadBackoffCeiling: Max ms for exponential backoff on overloaded responses.
 */
export const RETRY_PRESETS = Object.freeze({
  [RetryMode.strict]: Object.freeze({
    rateLimitCeiling: 60_000,
    creditRetryInterval: 0,
    overloadBackoffCeiling: 30_000,
  }),
  [RetryMode.patient]: Object.freeze({
    rateLimitCeiling: 3_600_000,
    creditRetryInterval: 120_000,
    overloadBackoffCeiling: 120_000,
  }),
  [RetryMode.persistent]: Object.freeze({
    rateLimitCeiling: 14_400_000,
    creditRetryInterval: 120_000,
    overloadBackoffCeiling: 300_000,
  }),
});

export function resolvePreset(mode) {
  return RETRY_PRESETS[mode] || RETRY_PRESETS[RetryMode.patient];
}
