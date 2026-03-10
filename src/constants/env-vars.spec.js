import { describe, it, expect } from 'vitest';
import { ENV_VARS, DEPRECATED_VARS, VALID_SCOPES, VALID_TYPES } from './env-vars.js';

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

  it('every deprecated target exists as a canonical key', () => {
    for (const [key, spec] of entries) {
      if (!spec.deprecated) continue;
      // The deprecated field is the OLD name — it should NOT be a canonical key
      // (otherwise we'd have two entries for the same thing)
      expect(
        ENV_VARS[spec.deprecated],
        `${key} has deprecated alias "${spec.deprecated}" that is also a canonical key`
      ).toBeUndefined();
    }
  });

  it('DEPRECATED_VARS maps old names to canonical names', () => {
    expect(DEPRECATED_VARS.CHATGPT_TEMPERATURE).toBe('VERBLETS_TEMPERATURE');
    expect(DEPRECATED_VARS.CHATGPT_TOPP).toBe('VERBLETS_TOPP');
    expect(DEPRECATED_VARS.CHATGPT_CACHE_TTL).toBe('VERBLETS_CACHE_TTL');
    expect(DEPRECATED_VARS.CHATGPT_FREQUENCY_PENALTY).toBe('VERBLETS_FREQUENCY_PENALTY');
    expect(DEPRECATED_VARS.CHATGPT_PRESENCE_PENALTY).toBe('VERBLETS_PRESENCE_PENALTY');
    expect(DEPRECATED_VARS.CHATGPT_DEBUG_PROMPT).toBe('VERBLETS_DEBUG_PROMPT');
    expect(DEPRECATED_VARS.CHATGPT_DEBUG_REQUEST_IF_CHANGED).toBe(
      'VERBLETS_DEBUG_REQUEST_IF_CHANGED'
    );
    expect(DEPRECATED_VARS.CHATGPT_DEBUG_RESPONSE).toBe('VERBLETS_DEBUG_RESPONSE');
    expect(DEPRECATED_VARS.CHATGPT_DEBUG_RESPONSE_IF_CHANGED).toBe(
      'VERBLETS_DEBUG_RESPONSE_IF_CHANGED'
    );
  });

  it('DEPRECATED_VARS has exactly 9 entries', () => {
    expect(Object.keys(DEPRECATED_VARS).length).toBe(9);
  });

  it('no deprecated name collides with a canonical name', () => {
    for (const oldName of Object.keys(DEPRECATED_VARS)) {
      expect(
        ENV_VARS[oldName],
        `deprecated name "${oldName}" collides with canonical key`
      ).toBeUndefined();
    }
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
    expect(ENV_VARS.DISABLE_CACHE).toBeDefined();
    expect(ENV_VARS.REDIS_HOST).toBeDefined();
    expect(ENV_VARS.REDIS_PORT).toBeDefined();
    expect(ENV_VARS.USE_REDIS_CACHE).toBeDefined();
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
});
