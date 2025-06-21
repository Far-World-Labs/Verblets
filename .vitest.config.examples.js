import { configDefaults, defineConfig } from 'vitest/config'
import dotenv from 'dotenv'

// Load environment variables from .env file
dotenv.config()

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude],
    include: ['src/**/*.examples.js']
  },
});
