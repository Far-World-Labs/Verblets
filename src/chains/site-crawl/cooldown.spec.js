import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_COOLDOWN,
  defaultIsBlocked,
  retryDelay,
  sleepWithHeartbeat,
  visitWithCooldown,
  createHeartbeat,
} from './cooldown.js';

describe('retryDelay', () => {
  it('returns baseDelay on attempt 0 (plus jitter)', () => {
    const cooldown = { ...DEFAULT_COOLDOWN, jitter: 0 };
    expect(retryDelay(0, cooldown)).toBe(5000);
  });

  it('doubles delay each attempt', () => {
    const cooldown = { ...DEFAULT_COOLDOWN, jitter: 0 };
    expect(retryDelay(1, cooldown)).toBe(10000);
    expect(retryDelay(2, cooldown)).toBe(20000);
    expect(retryDelay(3, cooldown)).toBe(40000);
  });

  it('caps at maxDelay', () => {
    const cooldown = { ...DEFAULT_COOLDOWN, jitter: 0, maxDelay: 15000 };
    expect(retryDelay(0, cooldown)).toBe(5000);
    expect(retryDelay(1, cooldown)).toBe(10000);
    expect(retryDelay(2, cooldown)).toBe(15000); // capped
    expect(retryDelay(3, cooldown)).toBe(15000); // still capped
  });

  it('applies jitter within expected range', () => {
    const cooldown = { ...DEFAULT_COOLDOWN, jitter: 0.2 };
    const results = Array.from({ length: 100 }, () => retryDelay(0, cooldown));
    const min = Math.min(...results);
    const max = Math.max(...results);
    // ±20% of 5000 → 4000–6000
    expect(min).toBeGreaterThanOrEqual(4000);
    expect(max).toBeLessThanOrEqual(6000);
  });
});

describe('defaultIsBlocked', () => {
  const mockPage = (bodyText, url = 'https://example.com') => ({
    url: () => url,
    evaluate: vi.fn(async () => bodyText),
  });

  it('returns undefined for normal pages', async () => {
    const page = mockPage('Welcome to our site');
    expect(await defaultIsBlocked(page)).toBeUndefined();
  });

  it('detects access denied', async () => {
    const page = mockPage('Access Denied - You do not have permission');
    expect(await defaultIsBlocked(page)).toBe('access-denied');
  });

  it('detects rate limiting', async () => {
    expect(await defaultIsBlocked(mockPage('Rate limit exceeded'))).toBe('rate-limit');
    expect(await defaultIsBlocked(mockPage('Too many requests'))).toBe('rate-limit');
  });

  it('detects captcha challenges', async () => {
    expect(await defaultIsBlocked(mockPage('Please verify you are a human'))).toBe('captcha');
  });

  it('detects browser challenges', async () => {
    expect(await defaultIsBlocked(mockPage('Checking your browser'))).toBe('challenge');
  });

  it('detects Akamai blocks by URL', async () => {
    const page = mockPage('Error', 'https://errors.edgesuite.net/blocked');
    expect(await defaultIsBlocked(page)).toBe('akamai-block');
  });

  it('handles evaluate errors gracefully', async () => {
    const page = {
      url: () => 'https://example.com',
      evaluate: vi.fn(async () => {
        throw new Error('Page crashed');
      }),
    };
    // Should not throw — evaluate failure means empty bodyText
    const result = await defaultIsBlocked(page);
    expect(result).toBeUndefined();
  });
});

describe('sleepWithHeartbeat', () => {
  it('emits tick events during the wait', async () => {
    const events = [];
    const emitter = { emit: (e) => events.push(e) };
    const context = { url: 'https://example.com', attempt: 1 };

    await sleepWithHeartbeat(250, emitter, 100, context);

    // Should have emitted multiple ticks (~2-3 in 250ms at 100ms intervals)
    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events[0].event).toBe('cooldown:tick');
    expect(events[0].url).toBe('https://example.com');
    expect(events[0].attempt).toBe(1);
    expect(events[0].totalMs).toBe(250);
    expect(typeof events[0].elapsedMs).toBe('number');
    expect(typeof events[0].remainingMs).toBe('number');
  });

  it('completes after the specified duration', async () => {
    const events = [];
    const emitter = { emit: (e) => events.push(e) };
    const start = Date.now();

    await sleepWithHeartbeat(200, emitter, 50, {});

    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(180); // allow 20ms slack
    expect(elapsed).toBeLessThan(400);
  });

  it('last tick has remainingMs near zero', async () => {
    const events = [];
    const emitter = { emit: (e) => events.push(e) };

    await sleepWithHeartbeat(150, emitter, 50, {});

    const lastTick = events[events.length - 1];
    expect(lastTick.remainingMs).toBeLessThanOrEqual(30);
  });
});

describe('visitWithCooldown', () => {
  it('returns immediately when page is not blocked', async () => {
    const visitFn = vi.fn(async () => ({ url: 'https://example.com', data: 'ok' }));
    const page = {};
    const emitter = { emit: vi.fn() };
    const isBlocked = vi.fn(async () => undefined);

    const result = await visitWithCooldown(
      visitFn,
      page,
      'https://example.com',
      emitter,
      {},
      isBlocked,
      100
    );

    expect(result.pageData).toEqual({ url: 'https://example.com', data: 'ok' });
    expect(result.retries).toBe(0);
    expect(result.totalCooldownMs).toBe(0);
    expect(result.blocked).toBeUndefined();
    expect(visitFn).toHaveBeenCalledOnce();
  });

  it('retries on block and succeeds after unblock', async () => {
    let callCount = 0;
    const visitFn = vi.fn(async () => ({ url: 'https://example.com', call: ++callCount }));
    const page = {};
    const events = [];
    const emitter = { emit: (e) => events.push(e) };
    const isBlocked = vi.fn().mockResolvedValueOnce('rate-limit').mockResolvedValueOnce(undefined); // unblocked on second visit

    const cooldown = { baseDelay: 50, maxDelay: 200, backoffFactor: 2, maxRetries: 3, jitter: 0 };
    const result = await visitWithCooldown(
      visitFn,
      page,
      'https://example.com',
      emitter,
      cooldown,
      isBlocked,
      25
    );

    expect(result.retries).toBe(1);
    expect(result.totalCooldownMs).toBe(50);
    expect(result.blocked).toBeUndefined();
    expect(visitFn).toHaveBeenCalledTimes(2);

    const eventTypes = events.map((e) => e.event);
    expect(eventTypes).toContain('cooldown:start');
    expect(eventTypes).toContain('cooldown:tick');
    expect(eventTypes).toContain('cooldown:retry');
  });

  it('returns blocked result when retries exhausted', async () => {
    const visitFn = vi.fn(async () => ({ url: 'https://example.com', blocked: true }));
    const page = {};
    const events = [];
    const emitter = { emit: (e) => events.push(e) };
    const isBlocked = vi.fn(async () => 'access-denied');

    const cooldown = { baseDelay: 10, maxDelay: 50, backoffFactor: 2, maxRetries: 2, jitter: 0 };
    const result = await visitWithCooldown(
      visitFn,
      page,
      'https://example.com',
      emitter,
      cooldown,
      isBlocked,
      5
    );

    expect(result.blocked).toBe('access-denied');
    expect(result.retries).toBe(2);
    expect(visitFn).toHaveBeenCalledTimes(3); // initial + 2 retries

    const eventTypes = events.map((e) => e.event);
    expect(eventTypes).toContain('cooldown:exhausted');
  });

  it('emits cooldown:start with correct metadata', async () => {
    const visitFn = vi.fn(async () => ({ url: 'https://example.com' }));
    const page = {};
    const events = [];
    const emitter = { emit: (e) => events.push(e) };
    const isBlocked = vi.fn().mockResolvedValueOnce('rate-limit').mockResolvedValueOnce(undefined);

    const cooldown = { baseDelay: 30, maxDelay: 200, backoffFactor: 2, maxRetries: 3, jitter: 0 };
    await visitWithCooldown(visitFn, page, 'https://example.com', emitter, cooldown, isBlocked, 10);

    const startEvent = events.find((e) => e.event === 'cooldown:start');
    expect(startEvent).toBeDefined();
    expect(startEvent.url).toBe('https://example.com');
    expect(startEvent.reason).toBe('rate-limit');
    expect(startEvent.attempt).toBe(1);
    expect(startEvent.maxRetries).toBe(3);
    expect(startEvent.delayMs).toBe(30);
  });
});

describe('createHeartbeat', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('emits heartbeat events at the specified interval', async () => {
    const events = [];
    const emitter = { emit: (e) => events.push(e) };
    const getState = () => ({ pages: 5, pending: 10 });

    const hb = createHeartbeat(emitter, 50, getState);

    // Wait for a few heartbeats
    await new Promise((resolve) => setTimeout(resolve, 180));
    hb.stop();

    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events[0].event).toBe('heartbeat');
    expect(events[0].pages).toBe(5);
    expect(events[0].pending).toBe(10);
  });

  it('stop() halts further emissions', async () => {
    const events = [];
    const emitter = { emit: (e) => events.push(e) };
    const hb = createHeartbeat(emitter, 30, () => ({}));

    await new Promise((resolve) => setTimeout(resolve, 100));
    hb.stop();
    const countAtStop = events.length;

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(events.length).toBe(countAtStop);
  });

  it('calls getState on each tick to get fresh data', async () => {
    const events = [];
    const emitter = { emit: (e) => events.push(e) };
    let counter = 0;
    const getState = () => ({ counter: ++counter });

    const hb = createHeartbeat(emitter, 40, getState);
    await new Promise((resolve) => setTimeout(resolve, 130));
    hb.stop();

    // Each heartbeat should have an incrementing counter
    const counters = events.map((e) => e.counter);
    for (let i = 1; i < counters.length; i++) {
      expect(counters[i]).toBeGreaterThan(counters[i - 1]);
    }
  });
});
