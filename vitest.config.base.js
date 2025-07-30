import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Base configuration shared by all tests
export const baseConfig = {
  globals: true,
  exclude: ['node_modules/**', 'dist/**'],
};

// Browser-specific exclusions (Node.js only modules)
export const browserExclusions = [
  'src/lib/search-js-files/**',
  'src/chains/scan-js/**',
  'src/lib/editor/**',
  'src/lib/transcribe/**',
  'src/lib/path-aliases/**',
  'src/lib/each-dir/**',
  'src/lib/dependency-cruiser/**',
  'src/lib/parse-js-parts/**',
  'src/chains/ai-arch-expect/**',
  'src/chains/test/**',
  'src/chains/test-advice/**',
];

// Browser-specific aliases for modules with browser versions
export const browserAliases = [
  { find: 'node:crypto', replacement: resolve(__dirname, 'src/lib/crypto/index.js') },
  { find: './index.node.js', replacement: './index.browser.js' },
  { find: 'node-fetch', replacement: resolve(__dirname, 'src/lib/fetch-browser.js') },
  { find: resolve(__dirname, 'src/chains/expect/index.js'), replacement: resolve(__dirname, 'src/chains/expect/index.browser.js') },
];

// Plugin to use Node.js Redis in browser tests for caching
export const redisTestPlugin = {
  name: 'redis-test-plugin',
  enforce: 'pre',
  resolveId(id) {
    if (id.includes('services/redis/index.js') || id.includes('services/redis/index.browser.js')) {
      return resolve(__dirname, 'src/services/redis/index.node.js');
    }
  }
};