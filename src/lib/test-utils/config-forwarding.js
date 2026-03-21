import { describe, expect, it } from 'vitest';

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
