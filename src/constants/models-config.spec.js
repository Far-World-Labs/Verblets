import { describe, it, expect, vi, beforeEach } from 'vitest';

// models.js reads env vars at module scope via the env proxy, so we need
// dynamic imports and vi.stubEnv to test different configurations.
// These tests protect the config constants and their env-var defaults.

describe('models.js config exports', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  // Helper to import with clean module cache
  const importModels = () => import('./models.js');
  const importMappings = () => import('./model-mappings.js');

  describe('cacheTTL', () => {
    it('defaults to one year in seconds (31_536_000)', async () => {
      const { cacheTTL } = await importModels();
      expect(cacheTTL).toBe(31_536_000);
    });

    it('reads VERBLETS_CACHE_TTL from env', async () => {
      vi.stubEnv('VERBLETS_CACHE_TTL', '3600');
      const { cacheTTL } = await importModels();
      expect(cacheTTL).toBe(3600);
    });
  });

  describe('cachingEnabled', () => {
    it('defaults to true when VERBLETS_DISABLE_CACHE is unset', async () => {
      const { cachingEnabled } = await importModels();
      expect(cachingEnabled).toBe(true);
    });

    it('is false when VERBLETS_DISABLE_CACHE is "true"', async () => {
      vi.stubEnv('VERBLETS_DISABLE_CACHE', 'true');
      const { cachingEnabled } = await importModels();
      expect(cachingEnabled).toBe(false);
    });

    it('is true when VERBLETS_DISABLE_CACHE is any other value', async () => {
      vi.stubEnv('VERBLETS_DISABLE_CACHE', 'false');
      const { cachingEnabled } = await importModels();
      expect(cachingEnabled).toBe(true);
    });
  });

  describe('debugPromptGlobally', () => {
    it('defaults to false', async () => {
      const { debugPromptGlobally } = await importModels();
      expect(debugPromptGlobally).toBe(false);
    });

    it('reads VERBLETS_DEBUG_PROMPT from env', async () => {
      vi.stubEnv('VERBLETS_DEBUG_PROMPT', 'true');
      const { debugPromptGlobally } = await importModels();
      expect(debugPromptGlobally).toBe(true);
    });
  });

  describe('debugPromptGloballyIfChanged', () => {
    it('defaults to false', async () => {
      const { debugPromptGloballyIfChanged } = await importModels();
      expect(debugPromptGloballyIfChanged).toBe(false);
    });

    it('reads VERBLETS_DEBUG_REQUEST_IF_CHANGED', async () => {
      vi.stubEnv('VERBLETS_DEBUG_REQUEST_IF_CHANGED', 'true');
      const { debugPromptGloballyIfChanged } = await importModels();
      expect(debugPromptGloballyIfChanged).toBe(true);
    });
  });

  describe('debugResultGlobally', () => {
    it('defaults to false', async () => {
      const { debugResultGlobally } = await importModels();
      expect(debugResultGlobally).toBe(false);
    });

    it('reads VERBLETS_DEBUG_RESPONSE', async () => {
      vi.stubEnv('VERBLETS_DEBUG_RESPONSE', 'true');
      const { debugResultGlobally } = await importModels();
      expect(debugResultGlobally).toBe(true);
    });
  });

  describe('debugResultGloballyIfChanged', () => {
    it('defaults to false', async () => {
      const { debugResultGloballyIfChanged } = await importModels();
      expect(debugResultGloballyIfChanged).toBe(false);
    });

    it('reads VERBLETS_DEBUG_RESPONSE_IF_CHANGED', async () => {
      vi.stubEnv('VERBLETS_DEBUG_RESPONSE_IF_CHANGED', 'true');
      const { debugResultGloballyIfChanged } = await importModels();
      expect(debugResultGloballyIfChanged).toBe(true);
    });
  });

  describe('defaultRules (via model-mappings)', () => {
    const findRule = (rules, cap) => rules.find((r) => r.match?.[cap] === true);
    const hasSensitiveRules = (rules) => rules.some((r) => r.match?.sensitive === true);

    it('includes sensitive rules when OPENWEBUI_API_KEY is set', async () => {
      vi.stubEnv('OPENAI_API_KEY', 'test-key');
      vi.stubEnv('OPENWEBUI_API_KEY', 'owui-key');
      const { defaultRules } = await importMappings();
      expect(hasSensitiveRules(defaultRules)).toBe(true);
    });

    it('sensitive rule defaults to VERBLETS_SENSITIVITY_MODEL', async () => {
      vi.stubEnv('OPENAI_API_KEY', 'test-key');
      vi.stubEnv('OPENWEBUI_API_KEY', 'owui-key');
      const { defaultRules } = await importMappings();
      const rule = findRule(defaultRules, 'sensitive');
      expect(rule).toBeDefined();
    });

    it('reads VERBLETS_SENSITIVITY_MODEL override', async () => {
      vi.stubEnv('OPENAI_API_KEY', 'test-key');
      vi.stubEnv('OPENWEBUI_API_KEY', 'owui-key');
      vi.stubEnv('VERBLETS_SENSITIVITY_MODEL', 'gemma3:4b-it-qat');
      const { defaultRules } = await importMappings();
      // The second sensitive rule (without good) uses VERBLETS_SENSITIVITY_MODEL
      const sensitiveRules = defaultRules.filter((r) => r.match?.sensitive === true);
      const basicSensitive = sensitiveRules.find((r) => !r.match?.good);
      expect(basicSensitive.use).toBe('gemma3:4b-it-qat');
    });

    it('reads VERBLETS_SENSITIVITY_GOOD_MODEL override', async () => {
      vi.stubEnv('OPENAI_API_KEY', 'test-key');
      vi.stubEnv('OPENWEBUI_API_KEY', 'owui-key');
      vi.stubEnv('VERBLETS_SENSITIVITY_GOOD_MODEL', 'qwen3:8b');
      const { defaultRules } = await importMappings();
      const sensitiveRules = defaultRules.filter((r) => r.match?.sensitive === true);
      const goodSensitive = sensitiveRules.find((r) => r.match?.good === true);
      expect(goodSensitive.use).toBe('qwen3:8b');
    });

    it('omits sensitive rules when OPENWEBUI_API_KEY is unset', async () => {
      vi.stubEnv('OPENAI_API_KEY', 'test-key');
      vi.stubEnv('OPENWEBUI_API_KEY', '');
      vi.stubEnv('ANTHROPIC_API_KEY', '');
      const { defaultRules } = await importMappings();
      expect(hasSensitiveRules(defaultRules)).toBe(false);
    });

    it('uses openai rules when only OPENAI_API_KEY is set', async () => {
      vi.stubEnv('OPENAI_API_KEY', 'test-key');
      vi.stubEnv('ANTHROPIC_API_KEY', '');
      vi.stubEnv('OPENWEBUI_API_KEY', '');
      const { defaultRules } = await importMappings();
      // Catch-all (last rule) should be gpt-4.1-mini
      const catchAll = defaultRules.find((r) => !r.match || Object.keys(r.match).length === 0);
      expect(catchAll.use).toBe('gpt-4.1-mini');
    });

    it('uses anthropic rules when only ANTHROPIC_API_KEY is set', async () => {
      vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
      vi.stubEnv('OPENAI_API_KEY', '');
      vi.stubEnv('OPENWEBUI_API_KEY', '');
      const { defaultRules } = await importMappings();
      const catchAll = defaultRules.find((r) => !r.match || Object.keys(r.match).length === 0);
      expect(catchAll.use).toBe('claude-sonnet-4-6');
    });

    it('uses mixed rules when both keys are set', async () => {
      vi.stubEnv('OPENAI_API_KEY', 'test-key');
      vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
      vi.stubEnv('OPENWEBUI_API_KEY', '');
      const { defaultRules } = await importMappings();
      const catchAll = defaultRules.find((r) => !r.match || Object.keys(r.match).length === 0);
      expect(catchAll.use).toBe('gpt-4.1-mini');
      const reasoning = findRule(defaultRules, 'reasoning');
      expect(reasoning).toBeDefined();
      expect(reasoning.use).toBe('claude-opus-4-6');
    });
  });
});
