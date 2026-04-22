import { ErrorCategory } from '../progress/constants.js';

/**
 * Classify an LLM error into a provider-aware category.
 *
 * Uses httpStatus, errorType, errorCode, provider, and message patterns
 * to determine whether an error is retryable and what wait strategy applies.
 *
 * @param {Error} error — error from callLlm with httpStatus, errorType, errorCode, provider, retryAfterMs
 * @returns {{ category: string, retryAfterMs?: number }}
 */
export function classifyError(error) {
  const { httpStatus, provider } = error;

  if (httpStatus === 401 || httpStatus === 403) {
    return { category: ErrorCategory.authFailure };
  }

  switch (provider) {
    case 'anthropic':
      return classifyAnthropic(error);
    case 'openai':
    case 'openai-responses':
      return classifyOpenAI(error);
    case 'openwebui':
      return classifyOpenWebUI(error);
    default:
      return classifyGeneric(error);
  }
}

// ── Anthropic ──
// 429 + rate_limit_error → rate limited (retry-after header always present)
// 529 + overloaded_error → overloaded
// 400 + "credit balance is too low" → credit exhaustion
function classifyAnthropic(error) {
  const { httpStatus, errorType, retryAfterMs, message = '' } = error;

  if (httpStatus === 529 || errorType === 'overloaded_error') {
    return { category: ErrorCategory.overloaded, retryAfterMs };
  }

  if (httpStatus === 429 || errorType === 'rate_limit_error') {
    return { category: ErrorCategory.rateLimited, retryAfterMs };
  }

  if (isCreditPattern(message)) {
    return { category: ErrorCategory.creditExhausted };
  }

  if (httpStatus >= 500 && httpStatus < 600) {
    return { category: ErrorCategory.serverError, retryAfterMs };
  }

  return { category: ErrorCategory.transient };
}

// ── OpenAI ──
// 429 + insufficient_quota → credit exhaustion (NOT rate limit)
// 429 + rate_limit_exceeded → rate limited
// 503 → overloaded
// 500/502 → server error
function classifyOpenAI(error) {
  const { httpStatus, errorType, errorCode, retryAfterMs, message = '' } = error;

  if (httpStatus === 429) {
    if (errorCode === 'insufficient_quota' || errorType === 'insufficient_quota') {
      return { category: ErrorCategory.creditExhausted };
    }
    return { category: ErrorCategory.rateLimited, retryAfterMs };
  }

  if (isCreditPattern(message)) {
    return { category: ErrorCategory.creditExhausted };
  }

  if (httpStatus === 503) {
    return { category: ErrorCategory.overloaded, retryAfterMs };
  }

  if (httpStatus >= 500 && httpStatus < 600) {
    return { category: ErrorCategory.serverError, retryAfterMs };
  }

  return { category: ErrorCategory.transient };
}

// ── OpenWebUI ──
// Proxies backends (Ollama, OpenAI-compatible). Error shapes vary.
// Falls back to generic patterns with OpenAI code detection.
function classifyOpenWebUI(error) {
  const { httpStatus, errorCode, retryAfterMs, message = '' } = error;

  if (httpStatus === 429) {
    if (errorCode === 'insufficient_quota' || isCreditPattern(message)) {
      return { category: ErrorCategory.creditExhausted };
    }
    return { category: ErrorCategory.rateLimited, retryAfterMs };
  }

  if (httpStatus === 503 || /overloaded|capacity/i.test(message)) {
    return { category: ErrorCategory.overloaded, retryAfterMs };
  }

  if (httpStatus >= 500 && httpStatus < 600) {
    return { category: ErrorCategory.serverError, retryAfterMs };
  }

  return { category: ErrorCategory.transient };
}

// ── Generic fallback ──
function classifyGeneric(error) {
  const { httpStatus, retryAfterMs, message = '' } = error;

  if (httpStatus === 429) {
    if (isCreditPattern(message)) {
      return { category: ErrorCategory.creditExhausted };
    }
    return { category: ErrorCategory.rateLimited, retryAfterMs };
  }

  if (httpStatus === 529 || httpStatus === 503) {
    return { category: ErrorCategory.overloaded, retryAfterMs };
  }

  if (httpStatus >= 500 && httpStatus < 600) {
    return { category: ErrorCategory.serverError, retryAfterMs };
  }

  return { category: ErrorCategory.transient };
}

function isCreditPattern(message) {
  return /credit balance is too low|insufficient.?quota|quota.*exceeded|billing/i.test(message);
}
