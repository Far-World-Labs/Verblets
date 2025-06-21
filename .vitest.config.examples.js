import { configDefaults, defineConfig } from 'vitest/config'
import dotenv from 'dotenv'

// Load environment variables from .env file
dotenv.config()

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude],
    include: ['src/**/*.examples.js'],
    env: {
      NODE_ENV: 'test',
      ...process.env
    }
  },
});
