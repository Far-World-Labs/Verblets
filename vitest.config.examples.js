import { defineConfig } from 'vitest/config';
import { baseConfig } from './vitest.config.base.js';
import { truthyValues, falsyValues } from './src/constants/common.js';

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
    environment: 'node',
    include: ['src/**/*.examples.js'],
    // Disable file parallelism to run tests sequentially and share Redis connection
    // fileParallelism: false, // Temporarily disabled to see if this affects output
    // Exclude hanging tests - uncomment as we identify working ones
    exclude: [
      ...baseConfig.exclude,
      // All tests enabled - let's see what breaks
    ],
    includeTaskLocation: true, // for precise file/line in reporters (v3)
    // Only include setupFiles when AI mode is enabled
    ...(aiModeEnabled && { setupFiles: ['./src/chains/test-analysis/setup.js'] }),
    reporters: aiModeEnabled 
      ? ['./src/chains/test-analysis/index.js'] // Only our reporter in AI mode
      : ['default']
  },
});