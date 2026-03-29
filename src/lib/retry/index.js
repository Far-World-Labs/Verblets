import { defaultMaxAttempts, retryDelay as retryDelayDefault } from '../../constants/common.js';
import { getOption } from '../context/option.js';
import createProgressEmitter from '../progress/index.js';
import { OpEvent, Level, Metric, RetryOutcome } from '../progress/constants.js';

const abortError = (signal) => signal?.reason ?? new Error('The operation was aborted.');

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
  const onProgress = opts.onProgress ?? config?.onProgress;
  const abortSignal = opts.abortSignal ?? config?.abortSignal;

  let attempt = 0;
  let lastError = new Error('Nothing to run');

  const sleep = (ms) =>
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

  const stepName = label || 'retry';
  const emitter = createProgressEmitter(stepName, onProgress, config);

  if (onProgress) {
    emitter.progress({
      event: OpEvent.start,
      attemptNumber: 1,
      maxAttempts,
      retryOnAll,
    });
  }

  while (attempt < maxAttempts) {
    if (abortSignal?.aborted) {
      throw abortError(abortSignal);
    }

    emitter.progress({
      event: OpEvent.retryAttempt,
      attemptNumber: attempt + 1,
      maxAttempts,
      outcome: RetryOutcome.attempt,
    });

    try {
      // eslint-disable-next-line no-await-in-loop
      const result = await fn();

      if (onProgress) {
        emitter.progress({
          event: OpEvent.complete,
          attemptNumber: attempt + 1,
          maxAttempts,
          success: true,
          totalAttempts: attempt + 1,
        });
      }

      return result;
    } catch (error) {
      lastError = error;

      const status = error.response?.status;
      const isRetry = retryOnAll || status === 429 || (status >= 500 && status < 600);

      if (isRetry && attempt < maxAttempts - 1) {
        const delay = retryDelay * attempt;

        // Unified retry error event — log-like with narrative value
        emitter.progress({
          event: OpEvent.retryError,
          level: Level.warn,
          message: `Retry ${attempt + 1}/${maxAttempts}: ${error.message}`,
          attemptNumber: attempt + 1,
          maxAttempts,
          delay,
          outcome: RetryOutcome.error,
          error: {
            message: error.message,
            ...(error.httpStatus !== undefined && { httpStatus: error.httpStatus }),
            ...(error.errorType !== undefined && { type: error.errorType }),
          },
        });

        emitter.measure({
          metric: Metric.retryDelay,
          value: delay,
          attemptNumber: attempt + 1,
          maxAttempts,
        });

        // eslint-disable-next-line no-await-in-loop
        await sleep(delay);
        attempt += 1;
      } else {
        attempt = maxAttempts;

        // Unified exhaustion event — log-like with narrative value
        emitter.progress({
          event: OpEvent.retryExhaust,
          level: Level.error,
          message: `Exhausted ${maxAttempts} attempts: ${error.message}`,
          attemptNumber: attempt,
          maxAttempts,
          outcome: RetryOutcome.exhaust,
          error: {
            message: error.message,
            ...(error.httpStatus !== undefined && { httpStatus: error.httpStatus }),
            ...(error.errorType !== undefined && { type: error.errorType }),
          },
          final: true,
          totalAttempts: attempt,
        });
      }
    }
  }

  throw lastError;
}

export default retry;
