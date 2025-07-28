import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.spec.js'],
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
      'src/lib/parse-js-parts/**',
      // Exclude tests that rely on file system
      'src/chains/ai-arch-expect/**',
      'src/chains/test/**',
      'src/chains/test-advice/**',
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
    alias: {
      // Redirect Node-specific modules to browser versions
      'node:crypto': resolve(__dirname, 'src/lib/crypto/index.js'),
      'node:fs': resolve(__dirname, 'src/lib/fs-browser.js'),
      'node:fs/promises': resolve(__dirname, 'src/lib/fs-browser.js'),
      'node:path': resolve(__dirname, 'src/lib/path-browser.js'),
      'node:url': resolve(__dirname, 'src/lib/url-browser.js'),
      'fs': resolve(__dirname, 'src/lib/fs-browser.js'),
      'path': resolve(__dirname, 'src/lib/path-browser.js'),
      'child_process': resolve(__dirname, 'src/lib/child-process-browser.js'),
      './index.node.js': './index.browser.js',
      // Browser stubs for Node-specific modules
      './search-js-files/index.js': './search-js-files/index.browser.js',
      './parse-js-parts/index.js': './parse-js-parts/index.browser.js',
      './scan-js/index.js': './scan-js/index.browser.js',
      './transcribe/index.js': './transcribe/index.browser.js',
      // Redirect expect chain to browser version
      [resolve(__dirname, 'src/chains/expect/index.js')]: resolve(__dirname, 'src/chains/expect/index.browser.js'),
      // Redirect test chain to browser version
      [resolve(__dirname, 'src/chains/test/index.js')]: resolve(__dirname, 'src/chains/test/index.browser.js'),
      // Use native fetch in browser
      'node-fetch': resolve(__dirname, 'src/lib/fetch-browser.js'),
    },
    conditions: ['browser', 'import', 'default'],
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('test'),
  },
});