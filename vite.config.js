import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.js'),
        'index.browser': resolve(__dirname, 'src/index.browser.js'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        // Node.js built-ins
        'fs',
        'fs/promises',
        'path',
        'crypto',
        'child_process',
        'node:fs',
        'node:fs/promises', 
        'node:path',
        'node:crypto',
        'node:child_process',
        'url',
        // Node-specific packages
        'redis',
        'dotenv',
        'node-fetch',
        'node-record-lpcm16',
        'whisper-node',
        // Parser/compiler packages that might have Node dependencies
        'acorn',
        'acorn-walk',
        'ajv',
        'commander',
        'compromise',
        'dependency-tree',
        'glob',
        'gpt-tokenizer',
        'gpt4-tokenizer',
        'mocha',
        'natural',
        'yargs',
      ],
    },
  },
  resolve: {
    alias: {
      // Redirect Node-specific modules to browser versions
      'node:crypto': resolve(__dirname, 'src/lib/crypto/index.js'),
      './chains/expect/index.js': resolve(__dirname, 'src/chains/expect/index.browser.js'),
      './chains/scan-js/index.js': resolve(__dirname, 'src/chains/scan-js/index.browser.js'),
      './lib/parse-js-parts/index.js': resolve(__dirname, 'src/lib/parse-js-parts/index.browser.js'),
      './lib/search-js-files/index.js': resolve(__dirname, 'src/lib/search-js-files/index.browser.js'),
      './lib/transcribe/index.js': resolve(__dirname, 'src/lib/transcribe/index.browser.js'),
      './services/redis/index.js': resolve(__dirname, 'src/services/redis/index.browser.js'),
    },
    conditions: ['browser', 'import', 'default'],
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
});