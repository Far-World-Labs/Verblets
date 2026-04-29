import { defineConfig } from 'vitest/config';
import { baseConfig } from './vitest.config.base.js';

export default defineConfig({
  test: {
    ...baseConfig,
    include: ['/tmp/*.test.mjs'],
  },
});
