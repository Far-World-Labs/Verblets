// ==========================================
// Config Test Utilities
// ==========================================
//
// Shared infrastructure behavior (config forwarding, response_format,
// progress scoping, lifecycle logging) is tested centrally in
// config-integration.spec.js against representative chains.
//
// These utilities are available for chains that need chain-SPECIFIC
// config tests (e.g., testing that a chain-specific option like
// 'strictness' produces different prompt text).
//
// DO NOT add generic config forwarding tests to per-chain spec files.
// Test chain-specific behavior only.
// ==========================================

import { describe, expect, it, vi } from 'vitest';

/**
 * Test that a chain/verblet forwards config options to a downstream mock.
 *
 * Generates one `it` per option entry. Each test calls `setupMocks()`, invokes the
 * chain with the option, then asserts it was forwarded to the target mock.
 *
 * @param {string} label - Describe block label (e.g. 'forwards config to map')
 * @param {Object} setup
 * @param {Function} setup.invoke - `(config) => chain(args, config)` — call the chain under test
 * @param {Function} setup.setupMocks - Called before each test to reset/configure mocks
 * @param {Object} setup.target - `{ mock, argIndex }` — which mock to inspect and at what call arg
 * @param {Object} setup.options - Map of option names to test configs
 * @param {*} setup.options[key].value - Value to pass in config
 * @param {*} [setup.options[key].expected] - Expected value on mock (defaults to `value`)
 * @param {number} [setup.options[key].callIndex] - Which mock call to check (default 0)
 *
 * @example
 * testForwardsConfig('forwards config to map', {
 *   invoke: (config) => glossary('text', config),
 *   setupMocks: () => { map.mockResolvedValueOnce([{ terms: ['a'] }]); },
 *   target: { mock: map, argIndex: 2 },
 *   options: {
 *     llm: { value: { model: 'test' } },
 *     batchSize: { value: 7 },
 *   },
 * });
 */
export function testForwardsConfig(label, { invoke, setupMocks, target, options }) {
  describe(label, () => {
    for (const [key, entry] of Object.entries(options)) {
      it(`forwards ${key}`, async () => {
        setupMocks();
        await invoke({ [key]: entry.value });
        const callIndex = entry.callIndex ?? 0;
        const config = target.mock.mock.calls[callIndex][target.argIndex ?? 2];
        expect(config[key]).toBe(entry.expected ?? entry.value);
      });
    }
  });
}

/**
 * Test that a chain wraps onProgress via scopeProgress (not forwarded directly).
 *
 * @param {string} label - Test label suffix
 * @param {Object} setup
 * @param {Function} setup.invoke - `(config) => chain(args, config)`
 * @param {Function} setup.setupMocks - Called before the test
 * @param {Object} setup.target - `{ mock, argIndex }`
 * @param {number} [setup.callIndex] - Which mock call to check (default 0)
 */
export function testScopesProgress(label, { invoke, setupMocks, target, callIndex = 0 }) {
  it(`scopes onProgress ${label}`, async () => {
    setupMocks();
    const onProgress = vi.fn();
    await invoke({ onProgress });
    const config = target.mock.mock.calls[callIndex][target.argIndex ?? 2];
    expect(config.onProgress).toBeTypeOf('function');
    expect(config.onProgress).not.toBe(onProgress);
  });
}

/**
 * Test that a chain wraps a raw logger into a lifecycle logger.
 *
 * @param {string} label - Test label suffix
 * @param {Object} setup
 * @param {Function} setup.invoke - `(config) => chain(args, config)`
 * @param {Function} setup.setupMocks - Called before the test
 * @param {Object} setup.target - `{ mock, argIndex }`
 * @param {number} [setup.callIndex] - Which mock call to check (default 0)
 */
export function testLifecycleLogger(label, { invoke, setupMocks, target, callIndex = 0 }) {
  it(`forwards lifecycle logger ${label}`, async () => {
    setupMocks();
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
    await invoke({ logger });
    const config = target.mock.mock.calls[callIndex][target.argIndex ?? 2];
    expect(config.logger.logEvent).toBeTypeOf('function');
    expect(config.logger.info).toBe(logger.info);
  });
}

/**
 * Test that a prompt-shaping option (like divergence, creativity, tolerance)
 * injects guidance into the LLM prompt for low/high and omits it when not set.
 *
 * @param {string} optionName - Config key (e.g. 'divergence')
 * @param {Object} setup
 * @param {Function} setup.invoke - `(config) => verblet(input, config)` — call the verblet
 * @param {Function} setup.setupMocks - Called before each test
 * @param {Object} setup.llmMock - The mocked callLlm function
 * @param {Object} setup.markers - `{ low: string, high: string }` — strings expected in prompt
 * @param {number} [setup.promptArgIndex] - Which arg of llmMock.mock.calls[0] is the prompt (default 0)
 */
export function testPromptShapingOption(
  optionName,
  { invoke, setupMocks, llmMock, markers, promptArgIndex = 0 }
) {
  describe(`${optionName} option`, () => {
    it(`injects ${optionName} low guidance into prompt`, async () => {
      setupMocks();
      await invoke({ [optionName]: 'low' });
      const prompt = llmMock.mock.calls[0][promptArgIndex];
      expect(prompt).toContain(markers.low);
    });

    it(`injects ${optionName} high guidance into prompt`, async () => {
      setupMocks();
      await invoke({ [optionName]: 'high' });
      const prompt = llmMock.mock.calls[0][promptArgIndex];
      expect(prompt).toContain(markers.high);
    });

    it(`omits ${optionName} guidance when not specified`, async () => {
      setupMocks();
      await invoke({});
      const prompt = llmMock.mock.calls[0][promptArgIndex];
      expect(prompt).not.toContain(markers.low);
      expect(prompt).not.toContain(markers.high);
    });
  });
}

/**
 * Test that a chain passes a structured response_format to the LLM mock.
 *
 * @param {string} label - Test label
 * @param {Object} setup
 * @param {Function} setup.invoke - (config) => chain(args, config)
 * @param {Function} setup.setupMocks - Called before the test
 * @param {Object} setup.llmMock - The mocked callLlm/llm function
 * @param {string} setup.schemaName - Expected json_schema.name
 * @param {number} [setup.callIndex] - Which mock call to check (default 0)
 */
export function testResponseFormat(
  label,
  { invoke, setupMocks, llmMock, schemaName, callIndex = 0 }
) {
  it(`passes ${schemaName} response format ${label}`, async () => {
    setupMocks();
    await invoke({});
    const options = llmMock.mock.calls[callIndex][1];
    expect(options.response_format).toEqual(
      expect.objectContaining({
        type: 'json_schema',
        json_schema: expect.objectContaining({ name: schemaName }),
      })
    );
  });
}
