/**
 * OpenWebUI / Ollama provider adapter.
 * OpenAI-compatible API with minor differences:
 *   - Some models don't support structured output (response_format)
 *   - Endpoint paths may differ slightly
 */

export const buildRequest = (apiUrl, apiKey, endpoint, requestConfig) => {
  const url = `${apiUrl}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const fetchOptions = {
    method: 'POST',
    headers,
    body: JSON.stringify(requestConfig),
  };

  return { url, fetchOptions };
};

// OpenWebUI returns OpenAI-compatible responses
export const parseResponse = (json) => json;
