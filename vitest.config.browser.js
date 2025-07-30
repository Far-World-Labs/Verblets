import { defineConfig } from 'vitest/config';
import { baseConfig, browserExclusions, browserAliases } from './vitest.config.base.js';

// Config for npm run test:browser - runs tests in browser environment
export default defineConfig({
  test: {
    ...baseConfig,
    environment: 'jsdom',
    include: ['src/**/*.spec.js'],
    exclude: [...baseConfig.exclude, ...browserExclusions],
    setupFiles: ['./test/setup/browser.js'],
    server: {
      deps: {
        inline: ['underscore', 'natural'],
      },
    },
  },
  resolve: {
    alias: browserAliases,
    conditions: ['browser', 'import', 'default'],
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('test'),
  },
});