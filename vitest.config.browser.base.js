import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export const baseBrowserConfig = {
  environment: 'jsdom',
  globals: true,
  exclude: [
    'node_modules/**',
    // Exclude Node.js-specific modules that can't work in browser
    'src/lib/search-js-files/**',
    'src/chains/scan-js/**',
    'src/lib/editor/**',
    'src/lib/transcribe/**',
    'src/lib/path-aliases/**',
    'src/lib/each-dir/**',
    'src/lib/dependency-cruiser/**',
    'src/chains/list/**',
    'src/chains/ai-arch-expect/**',
    // Exclude test files that directly import fs
    'src/chains/test/index.spec.js',
  ],
  server: {
    deps: {
      inline: [
        'underscore',
        'natural',
      ],
    },
  },
};

export const browserResolveConfig = {
  alias: {
    // Redirect Node-specific modules to browser versions
    'node:crypto': resolve(__dirname, 'src/lib/crypto/index.js'),
    './index.node.js': './index.browser.js',
    // Browser stubs for Node-specific modules
    './search-js-files/index.js': './search-js-files/index.browser.js',
    './scan-js/index.js': './scan-js/index.browser.js',
    './transcribe/index.js': './transcribe/index.browser.js',
    // Redirect expect chain to browser version
    [resolve(__dirname, 'src/chains/expect/index.js')]: resolve(__dirname, 'src/chains/expect/index.browser.js'),
    // Redirect Redis service to browser version
    [resolve(__dirname, 'src/services/redis/index.js')]: resolve(__dirname, 'src/services/redis/index.browser.js'),
  },
  conditions: ['browser', 'import', 'default'],
};