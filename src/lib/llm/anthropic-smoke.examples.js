import { describe, expect, it } from 'vitest';
import { run } from './index.js';
import modelService from '../../services/llm-model/index.js';
import { longTestTimeout } from '../../constants/common.js';

describe('Anthropic provider smoke test', () => {
  it(
    'answers a simple question via Claude',
    async () => {
      modelService.setGlobalOverride('modelName', 'claude-sonnet-4-5-20250514');

      try {
        const result = await run('What is 2 + 2? Answer with just the number.');
        console.log('Anthropic result:', JSON.stringify(result));
        expect(result).toBeDefined();
        expect(String(result)).toContain('4');
      } finally {
        modelService.clearGlobalOverride('modelName');
      }
    },
    longTestTimeout
  );
});
