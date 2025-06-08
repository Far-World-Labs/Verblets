import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude],
    include: ['src/**/*.examples.js'],
    env: {
      EXAMPLES: 'true'
    }
  },
});
