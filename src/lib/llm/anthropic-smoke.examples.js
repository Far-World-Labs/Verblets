import { describe, expect, it } from 'vitest';
import { run } from './index.js';
import modelService from '../../services/llm-model/index.js';
import { env } from '../../lib/env/index.js';
import { longTestTimeout } from '../../constants/common.js';

const hasAnthropicKey = !!env.ANTHROPIC_API_KEY;

// Billing or auth errors mean the key is present but the account can't be used right now.
// Skip gracefully rather than failing the suite.
const isBillingOrAuthError = (msg) => /credit balance|billing|authentication_error/i.test(msg);

describe('Anthropic provider smoke test', () => {
  it.skipIf(!hasAnthropicKey)(
    'answers a simple question via Claude',
    async () => {
      modelService.setGlobalOverride('modelName', 'claude-sonnet-4-5-20250514');

      try {
        const result = await run('What is 2 + 2? Answer with just the number.');
        console.log('Anthropic result:', JSON.stringify(result));
        expect(result).toBeDefined();
        expect(String(result)).toContain('4');
      } catch (error) {
        if (isBillingOrAuthError(error.message)) {
          console.warn(`Anthropic smoke test skipped: ${error.message}`);
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
