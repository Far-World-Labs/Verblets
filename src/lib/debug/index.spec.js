import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debug } from './index.js';

describe('debug', () => {
  let errorSpy;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('does not log when VERBLETS_DEBUG is unset', () => {
    delete process.env.VERBLETS_DEBUG;
    debug('test message');
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('does not log when VERBLETS_DEBUG is a non-truthy value', () => {
    vi.stubEnv('VERBLETS_DEBUG', 'false');
    debug('test message');
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('logs to stderr when VERBLETS_DEBUG is "true"', () => {
    vi.stubEnv('VERBLETS_DEBUG', 'true');
    debug('test message');
    expect(errorSpy).toHaveBeenCalledWith('test message');
  });

  it('logs to stderr when VERBLETS_DEBUG is "1"', () => {
    vi.stubEnv('VERBLETS_DEBUG', '1');
    debug('test message');
    expect(errorSpy).toHaveBeenCalledWith('test message');
  });

  it('logs to stderr when VERBLETS_DEBUG is "yes"', () => {
    vi.stubEnv('VERBLETS_DEBUG', 'yes');
    debug('test message');
    expect(errorSpy).toHaveBeenCalledWith('test message');
  });

  it('passes multiple arguments through', () => {
    vi.stubEnv('VERBLETS_DEBUG', 'true');
    debug('message', { detail: 42 }, 'extra');
    expect(errorSpy).toHaveBeenCalledWith('message', { detail: 42 }, 'extra');
  });

  it('re-evaluates env var on each call (not cached)', () => {
    vi.stubEnv('VERBLETS_DEBUG', 'true');
    debug('first');
    expect(errorSpy).toHaveBeenCalledTimes(1);

    vi.stubEnv('VERBLETS_DEBUG', 'false');
    debug('second');
    expect(errorSpy).toHaveBeenCalledTimes(1); // no new call
  });
});
