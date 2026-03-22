import { describe, it, expect } from 'vitest';
import { ENV_VARS, CONSTRAINTS, VALID_SCOPES, VALID_TYPES } from './env-vars.js';

describe('env-vars registry', () => {
  const entries = Object.entries(ENV_VARS);

  it('is not empty', () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it('every entry has a valid type', () => {
    for (const [key, spec] of entries) {
      expect(VALID_TYPES, `${key} has invalid type "${spec.type}"`).toContain(spec.type);
    }
  });

  it('every entry has a valid scope', () => {
    for (const [key, spec] of entries) {
      expect(VALID_SCOPES, `${key} has invalid scope "${spec.scope}"`).toContain(spec.scope);
    }
  });

  it('no duplicate keys', () => {
    const keys = entries.map(([k]) => k);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });

  it('credential-scoped vars have no defaults', () => {
    for (const [key, spec] of entries) {
      if (spec.scope !== 'credential') continue;
      expect(spec.default, `credential "${key}" should not have a default`).toBeUndefined();
    }
  });

  it('boolean-typed vars have boolean defaults when defaults exist', () => {
    for (const [key, spec] of entries) {
      if (spec.type !== 'boolean' || spec.default === undefined) continue;
      expect(
        typeof spec.default,
        `${key} is boolean-typed but default is ${typeof spec.default}`
      ).toBe('boolean');
    }
  });

  it('number-typed vars have number defaults when defaults exist', () => {
    for (const [key, spec] of entries) {
      if (spec.type !== 'number' || spec.default === undefined) continue;
      expect(
        typeof spec.default,
        `${key} is number-typed but default is ${typeof spec.default}`
      ).toBe('number');
    }
  });

  it('includes all known API key vars', () => {
    expect(ENV_VARS.OPENAI_API_KEY).toBeDefined();
    expect(ENV_VARS.ANTHROPIC_API_KEY).toBeDefined();
    expect(ENV_VARS.OPENWEBUI_API_KEY).toBeDefined();
  });

  it('includes all known LLM parameter vars', () => {
    expect(ENV_VARS.VERBLETS_TEMPERATURE).toBeDefined();
    expect(ENV_VARS.VERBLETS_FREQUENCY_PENALTY).toBeDefined();
    expect(ENV_VARS.VERBLETS_PRESENCE_PENALTY).toBeDefined();
    expect(ENV_VARS.VERBLETS_TOPP).toBeDefined();
  });

  it('includes cache and redis vars', () => {
    expect(ENV_VARS.VERBLETS_CACHE_TTL).toBeDefined();
    expect(ENV_VARS.VERBLETS_DISABLE_CACHE).toBeDefined();
    expect(ENV_VARS.REDIS_HOST).toBeDefined();
    expect(ENV_VARS.REDIS_PORT).toBeDefined();
  });

  it('does not include removed USE_REDIS_CACHE', () => {
    expect(ENV_VARS.USE_REDIS_CACHE).toBeUndefined();
  });

  it('includes debug vars', () => {
    expect(ENV_VARS.VERBLETS_DEBUG).toBeDefined();
    expect(ENV_VARS.VERBLETS_DEBUG_PROMPT).toBeDefined();
    expect(ENV_VARS.VERBLETS_DEBUG_REDIS).toBeDefined();
  });

  it('includes test-analysis vars', () => {
    expect(ENV_VARS.VERBLETS_AI_LOGS_ONLY).toBeDefined();
    expect(ENV_VARS.VERBLETS_RING_BUFFER_SIZE).toBeDefined();
    expect(ENV_VARS.VERBLETS_BATCH_SIZE).toBeDefined();
    expect(ENV_VARS.VERBLETS_AI_TIMEOUT).toBeDefined();
  });

  it('includes model selection vars', () => {
    expect(ENV_VARS.VERBLETS_EMBED_MODEL).toBeDefined();
    expect(ENV_VARS.VERBLETS_SENSITIVITY_MODEL).toBeDefined();
    expect(ENV_VARS.VERBLETS_SENSITIVITY_GOOD_MODEL).toBeDefined();
  });

  describe('CONSTRAINTS', () => {
    it('requires at least one LLM API key', () => {
      expect(CONSTRAINTS).toContainEqual({
        oneOf: ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'],
      });
    });
  });

  describe('requiredIf', () => {
    it('OPENWEBUI_API_URL is requiredIf OPENWEBUI_API_KEY', () => {
      expect(ENV_VARS.OPENWEBUI_API_URL.requiredIf).toBe('OPENWEBUI_API_KEY');
    });

    it('no other entries have requiredIf', () => {
      const withRequiredIf = Object.entries(ENV_VARS).filter(
        ([key, spec]) => spec.requiredIf && key !== 'OPENWEBUI_API_URL'
      );
      expect(withRequiredIf).toHaveLength(0);
    });
  });

  it('VERBLETS_ARCH_LOG has no default (string type, no boolean mismatch)', () => {
    expect(ENV_VARS.VERBLETS_ARCH_LOG.type).toBe('string');
    expect(ENV_VARS.VERBLETS_ARCH_LOG.default).toBeUndefined();
  });

  it('REDIS_HOST and REDIS_PORT have no defaults (Redis is optional)', () => {
    expect(ENV_VARS.REDIS_HOST.default).toBeUndefined();
    expect(ENV_VARS.REDIS_PORT.default).toBeUndefined();
  });
});
