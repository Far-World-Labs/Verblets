/**
 * Anthropic provider adapter.
 * Translates OpenAI-shaped requests/responses to Anthropic's API format.
 *
 * Key differences from OpenAI:
 *   - Auth: x-api-key header (not Bearer token)
 *   - System messages: top-level `system` param (not in messages array)
 *   - Structured output: top-level json schema (not response_format)
 *   - max_tokens is required
 *   - No frequency_penalty / presence_penalty
 */

const ANTHROPIC_VERSION = '2023-06-01';

const extractSystemMessages = (messages) => {
  const systemMessages = messages.filter((m) => m.role === 'system');
  const nonSystemMessages = messages.filter((m) => m.role !== 'system');
  const systemText = systemMessages.map((m) => m.content).join('\n');
  return { systemText, messages: nonSystemMessages };
};

const translateResponseFormat = (responseFormat) => {
  if (!responseFormat) return {};

  const schema = responseFormat.json_schema?.schema;
  if (!schema) return {};

  return {
    output_format: {
      type: 'json_schema',
      json_schema: {
        name: responseFormat.json_schema?.name || 'response',
        schema,
      },
    },
  };
};

export const buildRequest = (apiUrl, apiKey, endpoint, requestConfig) => {
  const url = `${apiUrl}${endpoint}`;

  const {
    messages = [],
    model,
    max_tokens,
    temperature,
    response_format,
    tools,
    tool_choice,
    // Strip unsupported params
    top_p: _topP, // eslint-disable-line no-unused-vars
    frequency_penalty: _fp, // eslint-disable-line no-unused-vars
    presence_penalty: _pp, // eslint-disable-line no-unused-vars
    ...rest
  } = requestConfig;

  const { systemText, messages: userMessages } = extractSystemMessages(messages);

  const body = {
    model,
    messages: userMessages,
    max_tokens: max_tokens || 4096,
    ...rest,
  };

  if (systemText) {
    body.system = systemText;
  }

  if (temperature !== undefined) {
    body.temperature = temperature;
  }

  if (tools) {
    body.tools = tools;
    if (tool_choice) {
      body.tool_choice = tool_choice;
    }
  }

  const responseFormatTranslated = translateResponseFormat(response_format);
  Object.assign(body, responseFormatTranslated);

  const fetchOptions = {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };

  return { url, fetchOptions };
};

export const parseResponse = (json) => {
  const content = json.content || [];
  const textBlock = content.find((b) => b.type === 'text');
  const toolBlocks = content.filter((b) => b.type === 'tool_use');

  const message = {
    role: 'assistant',
    content: textBlock?.text || '',
  };

  if (toolBlocks.length > 0) {
    message.tool_calls = toolBlocks.map((block) => ({
      id: block.id,
      type: 'function',
      function: {
        name: block.name,
        arguments: JSON.stringify(block.input),
      },
    }));
  }

  return {
    choices: [
      {
        message,
        finish_reason: json.stop_reason === 'end_turn' ? 'stop' : json.stop_reason,
      },
    ],
    usage: json.usage
      ? {
          prompt_tokens: json.usage.input_tokens,
          completion_tokens: json.usage.output_tokens,
          total_tokens: (json.usage.input_tokens || 0) + (json.usage.output_tokens || 0),
        }
      : undefined,
  };
};
