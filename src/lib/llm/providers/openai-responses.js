/**
 * OpenAI Responses API provider adapter.
 * Translates Chat-Completions-shaped requests to the Responses API format
 * (v1/responses) and normalizes responses back to canonical (Chat Completions) shape.
 *
 * Key differences from Chat Completions:
 *   - Input: `input` (string or messages) + `instructions` (system prompt)
 *   - Structured output: `text.format` instead of `response_format`
 *   - Output: `output[]` items instead of `choices[]`
 *   - No frequency_penalty, presence_penalty, or top_p
 *   - max_tokens → max_output_tokens
 */

const extractSystemMessages = (messages) => {
  const systemMessages = messages.filter((m) => m.role === 'system');
  const nonSystemMessages = messages.filter((m) => m.role !== 'system');
  const instructions = systemMessages.map((m) => m.content).join('\n');
  return { instructions, messages: nonSystemMessages };
};

const translateResponseFormat = (responseFormat) => {
  if (!responseFormat) return {};

  // Responses API uses text.format instead of response_format
  if (responseFormat.type === 'json_schema') {
    return {
      text: {
        format: {
          type: 'json_schema',
          name: responseFormat.json_schema?.name || 'response',
          schema: responseFormat.json_schema?.schema,
          strict: responseFormat.json_schema?.strict,
        },
      },
    };
  }

  if (responseFormat.type === 'json_object') {
    return {
      text: {
        format: { type: 'json_object' },
      },
    };
  }

  return {};
};

export const buildRequest = (apiUrl, apiKey, endpoint, requestConfig) => {
  const url = `${apiUrl}${endpoint}`;

  const {
    messages = [],
    model,
    max_tokens,
    response_format,
    tools,
    tool_choice,
    // Strip unsupported params
    temperature: _temperature, // eslint-disable-line no-unused-vars
    top_p: _topP, // eslint-disable-line no-unused-vars
    frequency_penalty: _fp, // eslint-disable-line no-unused-vars
    presence_penalty: _pp, // eslint-disable-line no-unused-vars
    ...rest
  } = requestConfig;

  const { instructions, messages: userMessages } = extractSystemMessages(messages);

  const body = {
    model,
    input: userMessages,
    ...rest,
  };

  if (instructions) {
    body.instructions = instructions;
  }

  if (max_tokens) {
    body.max_output_tokens = max_tokens;
  }

  if (tools) {
    // Responses API uses a flatter tool schema
    body.tools = tools.map((tool) => {
      if (tool.type === 'function') {
        return {
          type: 'function',
          name: tool.function.name,
          description: tool.function.description,
          parameters: tool.function.parameters,
          strict: tool.function.strict,
        };
      }
      return tool;
    });

    if (tool_choice) {
      body.tool_choice = tool_choice;
    }
  }

  const textFormat = translateResponseFormat(response_format);
  Object.assign(body, textFormat);

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

export const parseResponse = (json) => {
  const output = json.output || [];

  // Find the message item (type: "message")
  const messageItem = output.find((item) => item.type === 'message');

  // Find function call items
  const functionCalls = output.filter((item) => item.type === 'function_call');

  // Extract text content from message
  let textContent = '';
  if (messageItem?.content) {
    const textBlock = messageItem.content.find((c) => c.type === 'output_text');
    textContent = textBlock?.text || '';
  }

  // Fall back to output_text convenience field
  if (!textContent && json.output_text) {
    textContent = json.output_text;
  }

  const message = {
    role: 'assistant',
    content: textContent,
  };

  // Map function calls to Chat Completions tool_calls format
  if (functionCalls.length > 0) {
    message.tool_calls = functionCalls.map((call) => ({
      id: call.call_id || call.id,
      type: 'function',
      function: {
        name: call.name,
        arguments:
          typeof call.arguments === 'string' ? call.arguments : JSON.stringify(call.arguments),
      },
    }));
  }

  return {
    choices: [
      {
        message,
        finish_reason: json.status === 'completed' ? 'stop' : json.status,
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
