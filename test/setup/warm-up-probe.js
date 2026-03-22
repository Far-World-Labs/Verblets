/**
 * Global setup: prints suite config banner.
 *
 * Runs ONCE before all test files (not per-fork).
 * Sensitivity reachability is handled by sensitivity-probe.js (setupFile)
 * which runs in-process per worker — no cross-process env var issues.
 */

import { models } from '../../src/constants/model-mappings.js';
import { exampleBudget } from '../../src/constants/common.js';
import { env } from '../../src/lib/env/index.js';

export async function setup() {
  const provider = (env.VERBLETS_LLM_PROVIDER || '').toLowerCase();
  const keys = [
    env.OPENAI_API_KEY && 'openai',
    env.ANTHROPIC_API_KEY && 'anthropic',
    models.sensitive?.apiUrl && 'ollama',
  ].filter(Boolean);

  const lines = [
    `  budget: ${exampleBudget} (low=quick, medium=multi-call, high=all)`,
    `  providers: ${keys.join(', ') || 'none'}${provider ? ` (override: ${provider})` : ''}`,
    models.sensitive?.apiUrl
      ? '  sensitivity model: configured (reachability checked per-worker)'
      : '  sensitivity model: not configured → veiled-variants skipped',
  ].filter(Boolean);

  console.log(`\n  Example suite config:\n${lines.join('\n')}\n`);
}
