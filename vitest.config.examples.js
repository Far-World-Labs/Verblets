import { defineConfig } from 'vitest/config';
import { baseConfig } from './vitest.config.base.js';

// Config for npm run examples - runs *.examples.js in Node
export default defineConfig({
  test: {
    ...baseConfig,
    environment: 'node',
    include: ['src/**/*.examples.js'],
  },
});