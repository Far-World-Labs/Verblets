import { defineConfig } from 'vitest/config';
import { baseConfig } from './vitest.config.base.js';

// Default config for npm test - runs *.spec.js and *.test.js in Node
export default defineConfig({
  test: {
    ...baseConfig,
    environment: 'node',
    include: ['src/**/*.spec.js', 'src/**/*.test.js'],
  },
});