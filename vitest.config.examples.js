import { defineConfig } from 'vitest/config';
import { baseConfig } from './vitest.config.base.js';

// Check if debug mode is enabled
const debugModeEnabled = process.env.VERBLETS_DEBUG_SUITE_FIRST === '1' ||
                         process.env.VERBLETS_DEBUG_RUNS === '1' ||
                         process.env.VERBLETS_DEBUG_STREAM === '1' ||
                         process.env.VERBLETS_DEBUG_LOGS === '1';

// Config for npm run examples - runs *.examples.js in Node
export default defineConfig({
  test: {
    ...baseConfig,
    environment: 'node',
    include: ['src/**/*.examples.js'],
    // Remove globalSetup/globalTeardown - reporter handles this
    setupFiles: ['./src/chains/test-analysis/setup.js'],
    reporters: debugModeEnabled ? ['./src/chains/test-analysis/index.js'] : ['default']
  },
});