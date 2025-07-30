import { defineConfig } from 'vitest/config';
import { baseConfig } from './vitest.config.base.js';

// Config for npm run arch - runs *.arch.js files
export default defineConfig({
  test: {
    ...baseConfig,
    environment: 'node',
    include: ['**/*.arch.js'],
  },
});