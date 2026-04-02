import { describe, expect, it } from 'vitest';
import { run } from './index.js';
import { ModelService } from '../../services/llm-model/index.js';
import { env } from '../../lib/env/index.js';
import { longTestTimeout } from '../../constants/common.js';

// ── Skip logic ────────────────────────────────────────────────────────
// Each provider test runs when its API key is present and no conflicting
// provider override is set. When VERBLETS_LLM_PROVIDER is unset, both run.

const provider = (env.VERBLETS_LLM_PROVIDER || '').toLowerCase();

const shouldSkip = (key, name) => !env[key] || (provider && provider !== name);

const isBillingOrAuthError = (msg) => /credit balance|billing|quota|authentication/i.test(msg);

// ── Shared smoke test ─────────────────────────────────────────────────

async function smokeTest(modelName, providerLabel) {
  const ms = new ModelService();
  ms.setGlobalOverride('modelName', modelName);
  try {
    const result = await run('What is 2 + 2? Answer with just the number.', { modelService: ms });
    console.log(`${providerLabel} result:`, JSON.stringify(result));
    expect(result).toBeDefined();
    expect(String(result)).toContain('4');
  } catch (error) {
    if (isBillingOrAuthError(error.message)) {
      console.warn(`${providerLabel} smoke test skipped: ${error.message}`);
      return;
    }
    throw error;
  }
}

// ── Provider tests ────────────────────────────────────────────────────

describe('Provider smoke tests', () => {
  it.skipIf(shouldSkip('OPENAI_API_KEY', 'openai'))(
    'answers a simple question via GPT',
    () => smokeTest('gpt-4.1-mini', 'OpenAI'),
    longTestTimeout
  );

  it.skipIf(shouldSkip('ANTHROPIC_API_KEY', 'anthropic'))(
    'answers a simple question via Claude',
    () => smokeTest('claude-sonnet-4-5', 'Anthropic'),
    longTestTimeout
  );
});
