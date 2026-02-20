/* global process */
import { defineConfig } from 'vitest/config';
import { baseConfig } from './vitest.config.base.js';
import { truthyValues } from './src/constants/common.js';

// Check if AI mode should be enabled (matches config.js logic)
const aiLogsOnly = process.env.VERBLETS_AI_LOGS_ONLY && truthyValues.includes(process.env.VERBLETS_AI_LOGS_ONLY);
const aiPerSuite = process.env.VERBLETS_AI_PER_SUITE && truthyValues.includes(process.env.VERBLETS_AI_PER_SUITE);
const aiDetail = process.env.VERBLETS_AI_DETAIL && truthyValues.includes(process.env.VERBLETS_AI_DETAIL);
// const aiModeEnabled = false; // Temporarily disable to debug hanging tests
const aiModeEnabled = aiLogsOnly || aiPerSuite || aiDetail;

// Config for npm run examples - runs *.examples.js in Node
export default defineConfig({
  test: {
    ...baseConfig,
    testTimeout: 60_000,
    environment: 'node',
    include: ['src/**/*.examples.js'],
    // Use forks pool with limited concurrency instead of threads.
    // Threads exhaust the pool during parallel collection of 70+ files.
    // Forks use separate processes, avoiding thread pool contention.
    // Anthropic has tighter rate limits, so use 1 fork for Anthropic.
    pool: 'forks',
    poolOptions: {
      forks: {
        minForks: 1,
        maxForks: process.env.VERBLETS_LLM_PROVIDER === 'anthropic' ? 1 : 2,
      },
    },
    exclude: [
      ...baseConfig.exclude,
    ],
    includeTaskLocation: true, // for precise file/line in reporters (v3)
    setupFiles: [
      './test/setup/llm-provider.js',
      ...(aiModeEnabled ? ['./src/chains/test-analysis/setup.js'] : []),
    ],
    reporters: aiModeEnabled
      ? (aiLogsOnly
        ? ['default', './src/chains/test-analysis/index.js'] // Logs-only: default output + event collection
        : ['./src/chains/test-analysis/index.js']) // Full AI mode: custom reporter only
      : ['default']
  },
});