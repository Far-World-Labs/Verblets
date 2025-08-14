import { defineConfig } from 'vitest/config';
import { baseConfig } from './vitest.config.base.js';
import { truthyValues, falsyValues } from './src/constants/common.js';

// Check if AI mode should be enabled (matches config.js logic)
const aiLogsOnly = process.env.VERBLETS_AI_LOGS_ONLY && truthyValues.includes(process.env.VERBLETS_AI_LOGS_ONLY);
const aiPerSuite = process.env.VERBLETS_AI_PER_SUITE && truthyValues.includes(process.env.VERBLETS_AI_PER_SUITE);
// const aiModeEnabled = false; // Temporarily disable to debug hanging tests
const aiModeEnabled = aiLogsOnly || aiPerSuite;

// Config for npm run examples - runs *.examples.js in Node
export default defineConfig({
  test: {
    ...baseConfig,
    environment: 'node',
    include: ['src/**/*.examples.js'],
    // Temporarily exclude slow/hanging tests
    exclude: [
      ...baseConfig.exclude,
      // 'src/chains/detect-threshold/*.examples.js', // Testing with AI wrappers
      // 'src/chains/document-shrink/*.examples.js', // Testing with AI wrappers
      // 'src/chains/scale/*.examples.js', // Testing with AI wrappers
      // 'src/chains/set-interval/*.examples.js', // Testing with timer fix
      // 'src/chains/timeline/*.examples.js' // All tests now enabled
    ],
    includeTaskLocation: true, // for precise file/line in reporters (v3)
    // Only include setupFiles when AI mode is enabled
    ...(aiModeEnabled && { setupFiles: ['./src/chains/test-analysis/setup.js'] }),
    reporters: aiModeEnabled 
      ? ['./src/chains/test-analysis/index.js'] // Only our reporter in AI mode
      : ['default']
  },
});