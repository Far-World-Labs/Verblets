/**
 * OpenAI provider adapter.
 * Builds fetch requests and parses responses for OpenAI-compatible APIs.
 * Response format is already canonical (OpenAI shape is the canonical shape).
 */

export const buildRequest = (apiUrl, apiKey, endpoint, requestConfig) => {
  const url = `${apiUrl}${endpoint}`;
  const fetchOptions = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestConfig),
  };

  return { url, fetchOptions };
};

export const parseResponse = (json) => json;
