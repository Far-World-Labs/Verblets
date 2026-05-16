/**
 * OpenWebUI / Ollama provider adapter.
 *
 * Wraps the OpenAI request/response shape — OpenWebUI exposes an OpenAI-compatible
 * surface — and layers in two host-specific concerns:
 *   - `think: false` and `keep_alive: '30m'` body fields
 *   - Stripping `<think>…</think>` reasoning blocks from responses (Qwen3 et al.)
 */

import * as openai from './openai.js';

const HOST_FIELDS = { think: false, keep_alive: '30m' };

export const buildRequest = (apiUrl, apiKey, endpoint, requestConfig) => {
  const { url, fetchOptions } = openai.buildRequest(apiUrl, apiKey, endpoint, requestConfig);
  const body = JSON.parse(fetchOptions.body);
  const merged = { ...body, ...HOST_FIELDS };
  return {
    url,
    fetchOptions: { ...fetchOptions, body: JSON.stringify(merged) },
  };
};

const stripThinkTags = (text) => text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

export const parseResponse = (json) => {
  const parsed = openai.parseResponse(json);
  const content = parsed?.choices?.[0]?.message?.content;
  if (typeof content === 'string' && content.includes('<think>')) {
    parsed.choices[0].message.content = stripThinkTags(content);
  }
  return parsed;
};
