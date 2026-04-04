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

  describe('temperature', () => {
    it('defaults to 0', async () => {
      const { temperature } = await importModels();
      expect(temperature).toBe(0);
    });

    it('reads VERBLETS_TEMPERATURE from env', async () => {
      vi.stubEnv('VERBLETS_TEMPERATURE', '0.7');
      const { temperature } = await importModels();
      expect(temperature).toBe(0.7);
    });
  });

  describe('topP', () => {
    it('defaults to 0.5', async () => {
      const { topP } = await importModels();
      expect(topP).toBe(0.5);
    });

    it('reads VERBLETS_TOPP from env', async () => {
      vi.stubEnv('VERBLETS_TOPP', '0.9');
      const { topP } = await importModels();
      expect(topP).toBe(0.9);
    });
  });

  describe('frequencyPenalty', () => {
    it('defaults to 0', async () => {
      const { frequencyPenalty } = await importModels();
      expect(frequencyPenalty).toBe(0);
    });

    it('reads VERBLETS_FREQUENCY_PENALTY from env', async () => {
      vi.stubEnv('VERBLETS_FREQUENCY_PENALTY', '0.2');
      const { frequencyPenalty } = await importModels();
      expect(frequencyPenalty).toBe(0.2);
    });
  });

  describe('presencePenalty', () => {
    it('defaults to 0', async () => {
      const { presencePenalty } = await importModels();
      expect(presencePenalty).toBe(0);
    });

    it('reads VERBLETS_PRESENCE_PENALTY from env', async () => {
      vi.stubEnv('VERBLETS_PRESENCE_PENALTY', '0.4');
      const { presencePenalty } = await importModels();
      expect(presencePenalty).toBe(0.4);
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

  describe('selectMapping (via defaultMapping)', () => {
    it('includes sensitive mapping when OPENWEBUI_API_KEY is set', async () => {
      vi.stubEnv('OPENAI_API_KEY', 'test-key');
      vi.stubEnv('OPENWEBUI_API_KEY', 'owui-key');
      const { defaultMapping } = await importModels();
      expect(defaultMapping.sensitive).toBeDefined();
      expect(defaultMapping.sensitiveGood).toBeDefined();
    });

    it('sensitive defaults to qwen3.5:2b', async () => {
      vi.stubEnv('OPENAI_API_KEY', 'test-key');
      vi.stubEnv('OPENWEBUI_API_KEY', 'owui-key');
      const { defaultMapping } = await importModels();
      expect(defaultMapping.sensitive).toBe('qwen3.5:2b');
    });

    it('sensitiveGood defaults to qwen3.5:4b', async () => {
      vi.stubEnv('OPENAI_API_KEY', 'test-key');
      vi.stubEnv('OPENWEBUI_API_KEY', 'owui-key');
      const { defaultMapping } = await importModels();
      expect(defaultMapping.sensitiveGood).toBe('qwen3.5:4b');
    });

    it('reads VERBLETS_SENSITIVITY_MODEL override', async () => {
      vi.stubEnv('OPENAI_API_KEY', 'test-key');
      vi.stubEnv('OPENWEBUI_API_KEY', 'owui-key');
      vi.stubEnv('VERBLETS_SENSITIVITY_MODEL', 'gemma3:4b-it-qat');
      const { defaultMapping } = await importModels();
      expect(defaultMapping.sensitive).toBe('gemma3:4b-it-qat');
    });

    it('reads VERBLETS_SENSITIVITY_GOOD_MODEL override', async () => {
      vi.stubEnv('OPENAI_API_KEY', 'test-key');
      vi.stubEnv('OPENWEBUI_API_KEY', 'owui-key');
      vi.stubEnv('VERBLETS_SENSITIVITY_GOOD_MODEL', 'qwen3:8b');
      const { defaultMapping } = await importModels();
      expect(defaultMapping.sensitiveGood).toBe('qwen3:8b');
    });

    it('omits sensitive mappings when OPENWEBUI_API_KEY is unset', async () => {
      vi.stubEnv('OPENAI_API_KEY', 'test-key');
      vi.stubEnv('OPENWEBUI_API_KEY', '');
      vi.stubEnv('ANTHROPIC_API_KEY', '');
      const { defaultMapping } = await importModels();
      expect(defaultMapping.sensitive).toBeUndefined();
      expect(defaultMapping.sensitiveGood).toBeUndefined();
    });

    it('uses openai mapping when only OPENAI_API_KEY is set', async () => {
      vi.stubEnv('OPENAI_API_KEY', 'test-key');
      vi.stubEnv('ANTHROPIC_API_KEY', '');
      vi.stubEnv('OPENWEBUI_API_KEY', '');
      const { defaultMapping } = await importModels();
      expect(defaultMapping.fastGood).toBe('gpt-4.1-mini');
      expect(defaultMapping.fastCheap).toBe('gpt-4.1-nano');
    });

    it('uses anthropic mapping when only ANTHROPIC_API_KEY is set', async () => {
      vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
      vi.stubEnv('OPENAI_API_KEY', '');
      vi.stubEnv('OPENWEBUI_API_KEY', '');
      const { defaultMapping } = await importModels();
      expect(defaultMapping.fastGood).toBe('claude-sonnet-4-6');
      expect(defaultMapping.fastCheap).toBe('claude-haiku-4-5');
    });

    it('uses mixed mapping when both keys are set', async () => {
      vi.stubEnv('OPENAI_API_KEY', 'test-key');
      vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
      vi.stubEnv('OPENWEBUI_API_KEY', '');
      const { defaultMapping } = await importModels();
      expect(defaultMapping.fastGood).toBe('gpt-4.1-mini');
      expect(defaultMapping.reasoning).toBe('claude-opus-4-6');
    });
  });
});
