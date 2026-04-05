import { defaultMaxAttempts, retryDelay as retryDelayDefault } from '../../constants/common.js';
import { getOption } from '../context/option.js';
import createProgressEmitter from '../progress/index.js';
import { OpEvent, Metric, RetryOutcome } from '../progress/constants.js';

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

    emitter.metrics({
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

      const isLastAttempt = !isRetry || attempt >= maxAttempts - 1;

      if (isRetry && attempt < maxAttempts - 1) {
        const delay = retryDelay * attempt;

        if (onProgress) {
          const progressData = {
            event: OpEvent.retry,
            attemptNumber: attempt + 1,
            maxAttempts,
            delay,
            error: error.message,
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
          error: { message: error.message, httpStatus: error.httpStatus, type: error.errorType },
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

        if (onProgress && isLastAttempt) {
          emitter.progress({
            event: OpEvent.error,
            attemptNumber: attempt + 1,
            maxAttempts,
            error: error.message,
            totalAttempts: attempt + 1,
            final: true,
          });
        }

        emitter.metrics({
          event: OpEvent.retryExhaust,
          attemptNumber: attempt,
          maxAttempts,
          outcome: RetryOutcome.exhaust,
          error: { message: error.message, httpStatus: error.httpStatus, type: error.errorType },
        });
      }
    }
  }

  throw lastError;
}

export default retry;
