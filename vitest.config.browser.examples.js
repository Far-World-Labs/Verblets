import { defineConfig } from 'vitest/config';
import { baseConfig, browserExclusions, browserAliases, redisTestPlugin } from './vitest.config.base.js';

// Additional exclusions for browser examples (files that read test data)
const browserExampleExclusions = [
  'src/chains/list/index.examples.js',
  'src/chains/sort/index.examples.js', 
  'src/chains/split/index.examples.js',
  'src/chains/document-shrink/index.examples.js',
  'src/chains/timeline/index.examples.js',
  'src/chains/questions/index.examples.js',
];

// Config for npm run examples:browser - runs examples in browser with Redis caching
export default defineConfig({
  plugins: [redisTestPlugin],
  test: {
    ...baseConfig,
    environment: 'jsdom',
    setupFiles: ['./test/setup/browser.js'],
    include: ['src/**/*.examples.js'],
    exclude: [...baseConfig.exclude, ...browserExclusions, ...browserExampleExclusions],
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
    'process.env.USE_REDIS_CACHE': JSON.stringify('true'),
    'process.env.OPENAI_API_KEY': JSON.stringify(process.env.OPENAI_API_KEY),
    'process.env.OPENWEBUI_API_URL': JSON.stringify(process.env.OPENWEBUI_API_URL),
    'process.env.OPENWEBUI_API_KEY': JSON.stringify(process.env.OPENWEBUI_API_KEY),
    'process.env.VERBLETS_DEBUG': JSON.stringify(process.env.VERBLETS_DEBUG),
  },
});