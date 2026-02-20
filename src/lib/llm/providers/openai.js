/**
 * OpenAI provider adapter.
 * Builds fetch requests and parses responses for OpenAI-compatible APIs.
 * Response format is already canonical (OpenAI shape is the canonical shape).
 *
 * GPT-5+ compatibility:
 *   - max_tokens → max_completion_tokens
 *   - temperature, top_p, frequency_penalty, presence_penalty are not supported
 */

const isReasoningModel = (model) => /^(gpt-5|o[34])/i.test(model);

export const buildRequest = (apiUrl, apiKey, endpoint, requestConfig) => {
  const url = `${apiUrl}${endpoint}`;

  const { max_tokens, temperature, top_p, frequency_penalty, presence_penalty, ...rest } =
    requestConfig;

  const body = { ...rest };

  // Rename max_tokens → max_completion_tokens
  if (max_tokens !== undefined) {
    body.max_completion_tokens = max_tokens;
  }

  // Reasoning models (GPT-5, o3, o4) don't support sampling parameters
  if (!isReasoningModel(body.model)) {
    if (temperature !== undefined) body.temperature = temperature;
    if (top_p !== undefined) body.top_p = top_p;
    if (frequency_penalty !== undefined) body.frequency_penalty = frequency_penalty;
    if (presence_penalty !== undefined) body.presence_penalty = presence_penalty;
  }

  const fetchOptions = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };

  return { url, fetchOptions };
};

export const parseResponse = (json) => json;
