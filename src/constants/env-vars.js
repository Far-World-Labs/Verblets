/**
 * Environment Variable Registry
 *
 * Central catalog of every env var the library recognizes.
 * Pure data — no imports from other modules.
 *
 * Scopes:
 *   credential — API keys, secrets
 *   deploy     — operational config (cache, model params, redis)
 *   debug      — developer debugging flags
 *   test       — test-framework config (vitest, arch tests, examples)
 */

// Group constraints (evaluated by config.validate())
export const CONSTRAINTS = [{ oneOf: ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'] }];

export const ENV_VARS = {
  // ── Credentials ──────────────────────────────────────────────────────
  OPENAI_API_KEY: { type: 'string', scope: 'credential' },
  ANTHROPIC_API_KEY: { type: 'string', scope: 'credential' },
  OPENWEBUI_API_KEY: { type: 'string', scope: 'credential' },

  // ── API URLs ─────────────────────────────────────────────────────────
  OPENAI_PROXY_URL: { type: 'string', scope: 'deploy', default: 'https://api.openai.com/' },
  OPENWEBUI_API_URL: { type: 'string', scope: 'deploy', requiredIf: 'OPENWEBUI_API_KEY' },

  // ── Output & Storage ─────────────────────────────────────────────────
  VERBLETS_OUTPUT_DIR: { type: 'string', scope: 'deploy' },

  // ── Cache ────────────────────────────────────────────────────────────
  VERBLETS_CACHE_TTL: { type: 'number', default: 31_536_000, scope: 'deploy' },
  VERBLETS_DISABLE_CACHE: { type: 'boolean', default: false, scope: 'deploy' },

  // ── Debug & Logging ──────────────────────────────────────────────────
  VERBLETS_DEBUG: { type: 'boolean', default: false, scope: 'debug' },
  VERBLETS_DEBUG_PROMPT: { type: 'boolean', default: false, scope: 'debug' },
  VERBLETS_DEBUG_REQUEST_IF_CHANGED: { type: 'boolean', default: false, scope: 'debug' },
  VERBLETS_DEBUG_RESPONSE: { type: 'boolean', default: false, scope: 'debug' },
  VERBLETS_DEBUG_RESPONSE_IF_CHANGED: { type: 'boolean', default: false, scope: 'debug' },
  VERBLETS_DEBUG_REDIS: { type: 'boolean', default: false, scope: 'debug' },

  // ── Model Selection ──────────────────────────────────────────────────
  VERBLETS_EMBED_MODEL: {
    type: 'string',
    scope: 'deploy',
    default: 'mixedbread-ai/mxbai-embed-xsmall-v1',
  },
  VERBLETS_SENSITIVITY_MODEL: { type: 'string', scope: 'deploy', default: 'qwen3.5:2b' },
  VERBLETS_SENSITIVITY_GOOD_MODEL: { type: 'string', scope: 'deploy', default: 'qwen3.5:4b' },

  // ── Redis ────────────────────────────────────────────────────────────
  REDIS_HOST: { type: 'string', scope: 'deploy' },
  REDIS_PORT: { type: 'number', scope: 'deploy' },

  // ── Runtime ──────────────────────────────────────────────────────────
  NODE_ENV: { type: 'string', scope: 'deploy' },
  VERBLETS_LLM_EXPECT_MODE: { type: 'string', scope: 'deploy', default: 'none' },

  // ── Test Analysis ────────────────────────────────────────────────────
  VERBLETS_AI_LOGS_ONLY: { type: 'boolean', default: false, scope: 'test' },
  VERBLETS_AI_PER_SUITE: { type: 'boolean', default: false, scope: 'test' },
  VERBLETS_AI_DETAIL: { type: 'boolean', default: false, scope: 'test' },
  VERBLETS_DEBUG_SUITES: { type: 'boolean', default: false, scope: 'test' },
  VERBLETS_RING_BUFFER_SIZE: { type: 'number', default: 5000, scope: 'test' },
  VERBLETS_POLL_INTERVAL: { type: 'number', default: 100, scope: 'test' },
  VERBLETS_STATUS_INTERVAL: { type: 'number', default: 10_000, scope: 'test' },
  VERBLETS_BATCH_SIZE: { type: 'number', default: 50, scope: 'test' },
  VERBLETS_DRAIN_SIZE: { type: 'number', default: 100, scope: 'test' },
  VERBLETS_LOOKBACK_SIZE: { type: 'number', default: 5000, scope: 'test' },
  VERBLETS_AI_TIMEOUT: { type: 'number', default: 120_000, scope: 'test' },
  VERBLETS_NO_SUITE_OUTPUT: { type: 'boolean', default: false, scope: 'test' },

  // ── Arch Tests ───────────────────────────────────────────────────────
  VERBLETS_ARCH_LOG: { type: 'string', scope: 'test' },
  VERBLETS_ARCH_SHUFFLE: { type: 'boolean', default: false, scope: 'test' },
  VERBLETS_ARCH_DEBUG: { type: 'boolean', default: false, scope: 'test' },

  // ── Example / CI Flags ───────────────────────────────────────────────
  VERBLETS_EXAMPLE_BUDGET: { type: 'string', default: 'low', scope: 'test' },
  VERBLETS_REDIS_TEST_SKIP: { type: 'boolean', default: false, scope: 'test' },
  VERBLETS_DEBUG_EVENTS: { type: 'boolean', default: false, scope: 'test' },
  VERBLETS_SENSITIVITY_TEST_SKIP: { type: 'boolean', default: false, scope: 'test' },
};

/** Valid scopes for env var classification. */
export const VALID_SCOPES = ['credential', 'deploy', 'debug', 'test'];

/** Valid types for env var coercion. */
export const VALID_TYPES = ['string', 'number', 'boolean'];
