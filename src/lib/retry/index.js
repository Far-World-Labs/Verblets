import {
  defaultMaxAttempts,
  retryDelay as retryDelayDefault,
  defaultRetryMode,
} from '../../constants/common.js';
import { getOption } from '../context/option.js';
import createProgressEmitter from '../progress/index.js';
import { OpEvent, Metric, RetryOutcome, RetryMode, ErrorCategory } from '../progress/constants.js';
import { classifyError } from './error-classification.js';
import { resolvePreset } from './presets.js';

const abortError = (signal) => signal?.reason ?? new Error('The operation was aborted.');

const MAX_PROVIDER_RETRIES = 50;
const HEARTBEAT_INTERVAL = 30_000;

async function retry(fn, opts = {}) {
  const { label = '', config } = opts;
  const maxAttempts =
    opts.maxAttempts ??
    (config ? await getOption('maxAttempts', config, defaultMaxAttempts) : defaultMaxAttempts);
  const retryDelay =
    opts.retryDelay ??
    (config ? await getOption('retryDelay', config, retryDelayDefault) : retryDelayDefault);
  const retryOnAll =
    opts.retryOnAll ?? (config ? await getOption('retryOnAll', config, false) : false);
  const retryMode =
    opts.retryMode ??
    (config ? await getOption('retryMode', config, defaultRetryMode) : defaultRetryMode);
  const onProgress = opts.onProgress ?? config?.onProgress;
  const abortSignal = opts.abortSignal ?? config?.abortSignal;

  const modeConfig = {
    ...resolvePreset(retryMode),
    ...(opts.rateLimitCeiling !== undefined && { rateLimitCeiling: opts.rateLimitCeiling }),
    ...(opts.creditRetryInterval !== undefined && {
      creditRetryInterval: opts.creditRetryInterval,
    }),
    ...(opts.overloadBackoffCeiling !== undefined && {
      overloadBackoffCeiling: opts.overloadBackoffCeiling,
    }),
  };

  let attempt = 0;
  let providerRetries = 0;
  let lastError = new Error('Nothing to run');
  let errorToHandle;

  const stepName = label || 'retry';
  const emitter = createProgressEmitter(stepName, onProgress, config);

  if (onProgress) {
    emitter.progress({
      event: OpEvent.start,
      attemptNumber: 1,
      maxAttempts,
      retryOnAll,
      retryMode,
    });
  }

  const sleepMs = (ms) =>
    new Promise((resolve, reject) => {
      if (abortSignal?.aborted) {
        reject(abortError(abortSignal));
        return;
      }
      const timer = setTimeout(resolve, ms);
      abortSignal?.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);
          reject(abortError(abortSignal));
        },
        { once: true }
      );
    });

  const waitWithHeartbeat = async (durationMs, eventData) => {
    let remaining = durationMs;
    while (remaining > 0) {
      const chunk = Math.min(remaining, HEARTBEAT_INTERVAL);
      await sleepMs(chunk);
      remaining -= chunk;
      if (remaining > 0) {
        emitter.progress({ ...eventData, remaining, elapsed: durationMs - remaining });
      }
    }
  };

  // eslint-disable-next-line no-labels, no-unused-labels
  outer: while (attempt < maxAttempts) {
    if (abortSignal?.aborted) {
      throw abortError(abortSignal);
    }

    // Either handle a pending error (from credit-wait reclassification) or call fn
    if (!errorToHandle) {
      emitter.metrics({
        event: OpEvent.retryAttempt,
        attemptNumber: attempt + 1,
        maxAttempts,
        outcome: RetryOutcome.attempt,
      });

      try {
        const result = await fn();

        if (onProgress) {
          emitter.progress({
            event: OpEvent.complete,
            attemptNumber: attempt + 1,
            maxAttempts,
            success: true,
            totalAttempts: attempt + 1,
            providerRetries,
          });
        }

        return result;
      } catch (error) {
        errorToHandle = error;
      }
    }

    lastError = errorToHandle;
    const classification = classifyError(errorToHandle);
    errorToHandle = undefined;

    // ── Auth failure — always irrecoverable ──

    if (classification.category === ErrorCategory.authFailure) {
      emitter.progress({
        event: OpEvent.error,
        attemptNumber: attempt + 1,
        maxAttempts,
        error: lastError.message,
        category: ErrorCategory.authFailure,
        final: true,
      });
      throw lastError;
    }

    // ── Provider-level waits (patient/persistent mode) ──

    if (retryMode !== RetryMode.strict && providerRetries < MAX_PROVIDER_RETRIES) {
      // Rate limited — wait Retry-After duration or exponential backoff
      if (classification.category === ErrorCategory.rateLimited) {
        const waitMs =
          classification.retryAfterMs ||
          Math.min(modeConfig.rateLimitCeiling, retryDelay * Math.pow(2, providerRetries));

        if (waitMs <= modeConfig.rateLimitCeiling) {
          const eventData = {
            event: OpEvent.providerWait,
            category: ErrorCategory.rateLimited,
            provider: lastError.provider,
            delay: waitMs,
            attempt: providerRetries + 1,
            resumeAt: new Date(Date.now() + waitMs).toISOString(),
            error: { message: lastError.message, httpStatus: lastError.httpStatus },
          };

          emitter.progress(eventData);
          await waitWithHeartbeat(waitMs, eventData);
          providerRetries++;

          emitter.progress({
            event: OpEvent.providerRetry,
            category: ErrorCategory.rateLimited,
            provider: lastError.provider,
            attempt: providerRetries,
          });

          emitter.measure({
            metric: Metric.providerWait,
            value: waitMs,
            category: ErrorCategory.rateLimited,
            provider: lastError.provider,
          });

          continue outer; // eslint-disable-line no-labels
        }
      }

      // Credit exhaustion — retry at fixed interval indefinitely
      if (
        classification.category === ErrorCategory.creditExhausted &&
        modeConfig.creditRetryInterval > 0
      ) {
        let creditAttempt = 0;
        let creditElapsed = 0;

        while (true) {
          // eslint-disable-line no-constant-condition
          creditAttempt++;
          const interval = modeConfig.creditRetryInterval;

          const eventData = {
            event: OpEvent.providerWait,
            category: ErrorCategory.creditExhausted,
            provider: lastError.provider,
            delay: interval,
            attempt: creditAttempt,
            elapsed: creditElapsed,
            error: { message: lastError.message, httpStatus: lastError.httpStatus },
          };

          emitter.progress(eventData);
          await waitWithHeartbeat(interval, eventData);
          creditElapsed += interval;

          emitter.progress({
            event: OpEvent.providerRetry,
            category: ErrorCategory.creditExhausted,
            provider: lastError.provider,
            attempt: creditAttempt,
            elapsed: creditElapsed,
          });

          emitter.measure({
            metric: Metric.providerWait,
            value: interval,
            category: ErrorCategory.creditExhausted,
            provider: lastError.provider,
          });

          try {
            const result = await fn();
            emitter.progress({
              event: OpEvent.complete,
              attemptNumber: attempt + 1,
              maxAttempts,
              success: true,
              totalAttempts: attempt + 1,
              providerRetries: providerRetries + creditAttempt,
              creditWaitMs: creditElapsed,
            });
            return result;
          } catch (retryError) {
            const retryClass = classifyError(retryError);
            if (retryClass.category !== ErrorCategory.creditExhausted) {
              errorToHandle = retryError;
              providerRetries += creditAttempt;
              continue outer; // eslint-disable-line no-labels
            }
            lastError = retryError;
          }
        }
      }

      // Overloaded — exponential backoff up to ceiling
      if (classification.category === ErrorCategory.overloaded) {
        const waitMs = Math.min(
          modeConfig.overloadBackoffCeiling,
          retryDelay * Math.pow(2, providerRetries)
        );

        const eventData = {
          event: OpEvent.providerWait,
          category: ErrorCategory.overloaded,
          provider: lastError.provider,
          delay: waitMs,
          attempt: providerRetries + 1,
          resumeAt: new Date(Date.now() + waitMs).toISOString(),
          error: { message: lastError.message, httpStatus: lastError.httpStatus },
        };

        emitter.progress(eventData);
        await waitWithHeartbeat(waitMs, eventData);
        providerRetries++;

        emitter.progress({
          event: OpEvent.providerRetry,
          category: ErrorCategory.overloaded,
          provider: lastError.provider,
          attempt: providerRetries,
        });

        emitter.measure({
          metric: Metric.providerWait,
          value: waitMs,
          category: ErrorCategory.overloaded,
          provider: lastError.provider,
        });

        continue outer; // eslint-disable-line no-labels
      }

      // Server error — treat like overloaded with backoff
      if (classification.category === ErrorCategory.serverError) {
        const waitMs = Math.min(
          modeConfig.overloadBackoffCeiling,
          retryDelay * Math.pow(2, providerRetries)
        );

        const eventData = {
          event: OpEvent.providerWait,
          category: ErrorCategory.serverError,
          provider: lastError.provider,
          delay: waitMs,
          attempt: providerRetries + 1,
          error: { message: lastError.message, httpStatus: lastError.httpStatus },
        };

        emitter.progress(eventData);
        await waitWithHeartbeat(waitMs, eventData);
        providerRetries++;

        emitter.progress({
          event: OpEvent.providerRetry,
          category: ErrorCategory.serverError,
          provider: lastError.provider,
          attempt: providerRetries,
        });

        continue outer; // eslint-disable-line no-labels
      }
    }

    // ── Standard retry logic ──

    const status = lastError.httpStatus ?? lastError.response?.status;
    const isRetry = retryOnAll || status === 429 || (status >= 500 && status < 600);
    const isLastAttempt = !isRetry || attempt >= maxAttempts - 1;

    if (isRetry && attempt < maxAttempts - 1) {
      const delay = retryDelay * attempt;

      if (onProgress) {
        const progressData = {
          event: OpEvent.retry,
          attemptNumber: attempt + 1,
          maxAttempts,
          delay,
          error: lastError.message,
        };

        if (attempt + 1 < maxAttempts - 1) {
          progressData.nextAttempt = attempt + 2;
        }

        emitter.progress(progressData);
      }

      emitter.metrics({
        event: OpEvent.retryError,
        attemptNumber: attempt + 1,
        maxAttempts,
        outcome: RetryOutcome.error,
        error: {
          message: lastError.message,
          httpStatus: lastError.httpStatus,
          type: lastError.errorType,
        },
      });

      emitter.measure({
        metric: Metric.retryDelay,
        value: delay,
        attemptNumber: attempt + 1,
        maxAttempts,
      });

      await sleepMs(delay);
      attempt += 1;
    } else {
      attempt = maxAttempts;

      if (onProgress && isLastAttempt) {
        emitter.progress({
          event: OpEvent.error,
          attemptNumber: attempt + 1,
          maxAttempts,
          error: lastError.message,
          totalAttempts: attempt + 1,
          final: true,
        });
      }

      emitter.metrics({
        event: OpEvent.retryExhaust,
        attemptNumber: attempt,
        maxAttempts,
        outcome: RetryOutcome.exhaust,
        error: {
          message: lastError.message,
          httpStatus: lastError.httpStatus,
          type: lastError.errorType,
        },
      });
    }
  }

  throw lastError;
}

export default retry;
