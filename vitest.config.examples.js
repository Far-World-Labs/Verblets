import { defineConfig } from 'vitest/config';
import { baseConfig } from './vitest.config.base.js';
import { truthyValues, falsyValues } from './src/constants/common.js';

// Check if AI mode should be enabled (matches config.js logic)
const aiLogsOnly = process.env.VERBLETS_AI_LOGS_ONLY && truthyValues.includes(process.env.VERBLETS_AI_LOGS_ONLY);
const aiPerSuite = process.env.VERBLETS_AI_PER_SUITE && truthyValues.includes(process.env.VERBLETS_AI_PER_SUITE);
const aiModeEnabled = aiLogsOnly || aiPerSuite;

// Config for npm run examples - runs *.examples.js in Node
export default defineConfig({
  test: {
    ...baseConfig,
    environment: 'node',
    include: ['src/**/*.examples.js'],
    // Only include setupFiles when AI mode is enabled
    ...(aiModeEnabled && { setupFiles: ['./src/chains/test-analysis/setup.js'] }),
    reporters: aiModeEnabled ? ['./src/chains/test-analysis/index.js'] : ['default']
  },
});