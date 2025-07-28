import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Custom plugin to intercept Redis imports in tests
const redisTestPlugin = {
  name: 'redis-test-plugin',
  enforce: 'pre',
  resolveId(id, importer) {
    // Intercept Redis service imports and redirect to Node.js version for caching benefits
    if (id.includes('services/redis/index.js') || id.includes('services/redis/index.browser.js')) {
      return resolve(__dirname, 'src/services/redis/index.node.js');
    }
  }
};

export default defineConfig({
  plugins: [redisTestPlugin],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup/browser.js'],
    include: ['src/**/*.examples.js'],
    exclude: [
      'node_modules/**',
      // Exclude Node.js-specific tests
      'src/lib/search-js-files/**',
      'src/chains/scan-js/**',
      'src/lib/editor/**',
      'src/lib/transcribe/**',
      'src/lib/path-aliases/**',
      'src/lib/each-dir/**',
      'src/lib/dependency-cruiser/**',
      // Exclude tests that rely on file system
      'src/chains/list/index.examples.js',
      'src/chains/ai-arch-expect/**',
      'src/chains/document-shrink/index.examples.js',
      'src/chains/split/index.examples.js',
      'src/chains/sort/index.examples.js',
      'src/chains/timeline/index.examples.js',
      'src/chains/questions/index.examples.js',
    ],
    server: {
      deps: {
        inline: [
          'underscore',
          'natural',
        ],
      },
    },
  },
  resolve: {
    alias: [
      // Custom resolver for node:fs to exclude test files
      {
        find: /^node:fs$/,
        replacement: resolve(__dirname, 'src/lib/fs-browser.js'),
        customResolver(source, importer) {
          // Don't alias node:fs in test files
          if (importer?.includes('.examples.js') || importer?.includes('.spec.js')) {
            return false;
          }
          return null;
        }
      },
      // Other aliases as objects
      { find: 'node:crypto', replacement: resolve(__dirname, 'src/lib/crypto/index.js') },
      { find: 'node:fs/promises', replacement: resolve(__dirname, 'src/lib/fs-browser.js') },
      { find: 'node:path', replacement: resolve(__dirname, 'src/lib/path-browser.js') },
      // Keep aliasing non-prefixed imports for backward compatibility
      { find: /^fs$/, replacement: resolve(__dirname, 'src/lib/fs-browser.js') },
      { find: /^path$/, replacement: resolve(__dirname, 'src/lib/path-browser.js') },
      { find: 'child_process', replacement: resolve(__dirname, 'src/lib/child-process-browser.js') },
      { find: './index.node.js', replacement: './index.browser.js' },
      // Browser stubs for Node-specific modules
      { find: './search-js-files/index.js', replacement: './search-js-files/index.browser.js' },
      { find: './scan-js/index.js', replacement: './scan-js/index.browser.js' },
      { find: './transcribe/index.js', replacement: './transcribe/index.browser.js' },
      // Redirect expect chain to browser version
      { find: resolve(__dirname, 'src/chains/expect/index.js'), replacement: resolve(__dirname, 'src/chains/expect/index.browser.js') },
    ],
    conditions: ['browser', 'import', 'default'],
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('test'),
    'process.env.OPENAI_API_KEY': JSON.stringify(process.env.OPENAI_API_KEY),
    'process.env.OPENWEBUI_API_URL': JSON.stringify(process.env.OPENWEBUI_API_URL),
    'process.env.OPENWEBUI_API_KEY': JSON.stringify(process.env.OPENWEBUI_API_KEY),
    'process.env.VERBLETS_DEBUG': JSON.stringify(process.env.VERBLETS_DEBUG),
  },
});