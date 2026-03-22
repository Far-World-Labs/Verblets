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

  const ollamaConfig = {
    ...requestConfig,
    think: false,
    keep_alive: '30m',
  };

  const fetchOptions = {
    method: 'POST',
    headers,
    body: JSON.stringify(ollamaConfig),
  };

  return { url, fetchOptions };
};

/**
 * Strip `<think>…</think>` reasoning blocks emitted by models like Qwen3.
 * These blocks appear at the start of the content and are not part of the
 * actual answer.  The regex is non-greedy so it handles multiple blocks and
 * avoids clobbering legitimate content.
 */
const stripThinkTags = (text) => text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

// OpenWebUI returns OpenAI-compatible responses — strip thinking blocks
export const parseResponse = (json) => {
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content === 'string' && content.includes('<think>')) {
    json.choices[0].message.content = stripThinkTags(content);
  }
  return json;
};
