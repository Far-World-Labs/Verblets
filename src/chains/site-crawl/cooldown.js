/**
 * Cooldown — exponential backoff with heartbeat for blocked page visits.
 *
 * When a page visit is detected as blocked (bot detection, rate limiting),
 * waits with exponential backoff before retrying. Emits events throughout
 * so consumers always know what's happening.
 */

/** Domain events specific to cooldown retry logic. */
const CooldownEvent = Object.freeze({
  tick: 'cooldown:tick',
  visitError: 'cooldown:visitError',
  blockCheckError: 'cooldown:blockCheckError',
  exhausted: 'cooldown:exhausted',
  start: 'cooldown:start',
  retry: 'cooldown:retry',
  heartbeat: 'heartbeat',
});

const DEFAULT_COOLDOWN = {
  baseDelay: 5000, // 5s initial wait
  maxDelay: 300000, // 5 min ceiling
  backoffFactor: 2, // double each retry
  maxRetries: 6, // up to 6 retries (~5m20s total at 2x backoff from 5s)
  jitter: 0.2, // ±20% randomization to avoid thundering herd
};

/**
 * Default block detector — checks page content and URL for common patterns.
 * Returns a reason string if blocked, or falsy if not blocked.
 */
const defaultIsBlocked = async (page) => {
  const url = page.url();
  const bodyText = await page
    .evaluate(() => document.body?.innerText?.slice(0, 500)) // eslint-disable-line no-undef
    .catch(() => '');

  if (bodyText.includes('Access Denied')) return 'access-denied';
  if (bodyText.includes('Rate limit')) return 'rate-limit';
  if (bodyText.includes('Too many requests')) return 'rate-limit';
  if (bodyText.includes('Please verify you are a human')) return 'captcha';
  if (bodyText.includes('Checking your browser')) return 'challenge';
  if (url.includes('errors.edgesuite.net')) return 'akamai-block';

  return undefined;
};

/**
 * Apply jitter to a delay value.
 */
const withJitter = (delay, jitterFraction) => {
  const range = delay * jitterFraction;
  return delay + (Math.random() * 2 - 1) * range;
};

/**
 * Calculate the delay for a given retry attempt.
 */
const retryDelay = (attempt, cooldown) => {
  const raw = cooldown.baseDelay * Math.pow(cooldown.backoffFactor, attempt);
  const capped = Math.min(raw, cooldown.maxDelay);
  return Math.round(withJitter(capped, cooldown.jitter));
};

/**
 * Sleep with periodic heartbeat emissions.
 * Emits a cooldown:tick event every heartbeatInterval ms during the wait.
 */
const sleepWithHeartbeat = async (ms, emitter, heartbeatInterval, context) => {
  const startedAt = Date.now();
  const endsAt = startedAt + ms;
  let elapsed = 0;

  while (elapsed < ms) {
    const remaining = ms - elapsed;
    const chunk = Math.min(heartbeatInterval, remaining);
    await new Promise((resolve) => setTimeout(resolve, chunk));
    elapsed = Date.now() - startedAt;

    emitter.emit({
      event: CooldownEvent.tick,
      elapsedMs: elapsed,
      remainingMs: Math.max(0, endsAt - Date.now()),
      totalMs: ms,
      ...context,
    });
  }
};

/**
 * Visit a URL with cooldown retry logic.
 *
 * Wraps a visit function: if the visit results in a blocked page,
 * backs off exponentially and retries. Emits events throughout.
 *
 * @param {Function} visitFn - async (page, url) => pageData
 * @param {object} page - Playwright page
 * @param {string} url - URL to visit
 * @param {object} emitter - Progress emitter
 * @param {object} cooldownOpts - Cooldown configuration
 * @param {Function} isBlocked - async (page) => reason|falsy
 * @param {number} heartbeatInterval - ms between heartbeat ticks during cooldown
 * @returns {{ pageData, retries, totalCooldownMs }}
 */
const visitWithCooldown = async (
  visitFn,
  page,
  url,
  emitter,
  cooldownOpts,
  isBlocked,
  heartbeatInterval
) => {
  const cooldown = { ...DEFAULT_COOLDOWN, ...cooldownOpts };
  let totalCooldownMs = 0;

  for (let attempt = 0; attempt <= cooldown.maxRetries; attempt++) {
    let pageData;
    try {
      pageData = await visitFn(page, url);
    } catch (err) {
      emitter.emit({ event: CooldownEvent.visitError, url, attempt, error: err.message });
      throw err;
    }

    let blockReason;
    try {
      blockReason = await isBlocked(page);
    } catch (err) {
      emitter.emit({ event: CooldownEvent.blockCheckError, url, attempt, error: err.message });
      throw err;
    }
    if (!blockReason) {
      return { pageData, retries: attempt, totalCooldownMs };
    }

    // Blocked — decide whether to retry
    if (attempt >= cooldown.maxRetries) {
      emitter.emit({
        event: CooldownEvent.exhausted,
        url,
        reason: blockReason,
        attempts: attempt + 1,
        totalCooldownMs,
      });
      // Return the blocked page data anyway — let the caller decide
      return { pageData, retries: attempt, totalCooldownMs, blocked: blockReason };
    }

    const delay = retryDelay(attempt, cooldown);
    totalCooldownMs += delay;

    emitter.emit({
      event: CooldownEvent.start,
      url,
      reason: blockReason,
      attempt: attempt + 1,
      maxRetries: cooldown.maxRetries,
      delayMs: delay,
      totalCooldownMs,
    });

    await sleepWithHeartbeat(delay, emitter, heartbeatInterval, {
      url,
      reason: blockReason,
      attempt: attempt + 1,
    });

    emitter.emit({
      event: CooldownEvent.retry,
      url,
      attempt: attempt + 1,
    });
  }
};

/**
 * Create a heartbeat timer that emits periodic state snapshots.
 * Returns { stop } — call stop() when the crawl is done.
 */
const createHeartbeat = (emitter, intervalMs, getState) => {
  const timer = setInterval(() => {
    emitter.emit({
      event: CooldownEvent.heartbeat,
      ...getState(),
    });
  }, intervalMs);

  return {
    stop: () => clearInterval(timer),
  };
};

export {
  CooldownEvent,
  DEFAULT_COOLDOWN,
  defaultIsBlocked,
  retryDelay,
  sleepWithHeartbeat,
  visitWithCooldown,
  createHeartbeat,
};
