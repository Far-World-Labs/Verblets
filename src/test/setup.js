import { beforeEach, afterAll } from 'vitest';
import dotenv from 'dotenv';
import { getClient as getRedis } from '../services/redis/index.js';

// Load environment variables from .env file
dotenv.config();

let redisClient;

// Ensure environment variables are set for tests
if (process.env.EXAMPLES === 'true') {
  process.env.GPT_REASONING_ENABLED = 'true';
}

beforeEach(async () => {
  // Get a fresh Redis client for each test
  redisClient = await getRedis();
});

afterAll(async () => {
  // Clean up Redis client after all tests
  if (redisClient) {
    await redisClient.disconnect();
  }
});
