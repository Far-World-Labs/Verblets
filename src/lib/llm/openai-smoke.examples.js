import { describe, expect, it } from 'vitest';
import { run } from './index.js';
import modelService from '../../services/llm-model/index.js';
import { env } from '../../lib/env/index.js';
import { longTestTimeout } from '../../constants/common.js';

const hasOpenAIKey = !!env.OPENAI_API_KEY;
const provider = (env.VERBLETS_LLM_PROVIDER || '').toLowerCase();
const skipOpenAISmoke = !hasOpenAIKey || (provider && provider !== 'openai');

// Billing or auth errors mean the key is present but the account can't be used right now.
// Skip gracefully rather than failing the suite.
const isBillingOrAuthError = (msg) => /credit balance|billing|quota|authentication/i.test(msg);

describe('OpenAI provider smoke test', () => {
  it.skipIf(skipOpenAISmoke)(
    'answers a simple question via GPT',
    async () => {
      modelService.setGlobalOverride('modelName', 'gpt-4.1-mini');

      try {
        const result = await run('What is 2 + 2? Answer with just the number.');
        console.log('OpenAI result:', JSON.stringify(result));
        expect(result).toBeDefined();
        expect(String(result)).toContain('4');
      } catch (error) {
        if (isBillingOrAuthError(error.message)) {
          console.warn(`OpenAI smoke test skipped: ${error.message}`);
          return;
        }
        throw error;
      } finally {
        modelService.clearGlobalOverride('modelName');
      }
    },
    longTestTimeout
  );
});
