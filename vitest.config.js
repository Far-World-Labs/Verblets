import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.js', 'src/**/*.test.js'],
    exclude: ['node_modules/**', 'dist/**'],
  },
  resolve: {
    // Use default node resolution
    conditions: ['node', 'import', 'require', 'default'],
  },
});