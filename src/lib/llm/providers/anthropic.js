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

const translateToolChoice = (toolChoice) => {
  if (!toolChoice) return undefined;
  if (typeof toolChoice === 'object') {
    // OpenAI {type: 'function', function: {name: '...'}} → Anthropic {type: 'tool', name: '...'}
    if (toolChoice.type === 'function' && toolChoice.function?.name) {
      return { type: 'tool', name: toolChoice.function.name };
    }
    return toolChoice;
  }
  // String shortcuts: 'auto' → {type: 'auto'}, 'required' → {type: 'any'}, 'none' → omit
  if (toolChoice === 'none') return undefined;
  if (toolChoice === 'required') return { type: 'any' };
  return { type: toolChoice };
};

const extractSystemMessages = (messages) => {
  const systemMessages = messages.filter((m) => m.role === 'system');
  const nonSystemMessages = messages.filter((m) => m.role !== 'system');
  const systemText = systemMessages.map((m) => m.content).join('\n');
  return { systemText, messages: nonSystemMessages };
};

const NUMERIC_CONSTRAINTS = [
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'multipleOf',
];
const STRING_CONSTRAINTS = ['minLength', 'maxLength'];

const INVALID_KEY_CHAR = /[^a-zA-Z0-9_.-]/;

const sanitizePropertyKeys = (node) => {
  if (!node.properties) return;

  const entries = Object.entries(node.properties);
  const hasInvalidKeys = entries.some(([key]) => INVALID_KEY_CHAR.test(key));
  if (!hasInvalidKeys) return;

  const renamedProps = {};
  for (const [key, value] of entries) {
    const sanitizedKey = INVALID_KEY_CHAR.test(key)
      ? key.replace(/@/g, '_at_').replace(INVALID_KEY_CHAR, '_')
      : key;
    renamedProps[sanitizedKey] = value;
  }
  node.properties = renamedProps;

  if (Array.isArray(node.required)) {
    node.required = node.required.map((key) =>
      INVALID_KEY_CHAR.test(key) ? key.replace(/@/g, '_at_').replace(INVALID_KEY_CHAR, '_') : key
    );
  }
};

const sanitizeNode = (node) => {
  if (!node || typeof node !== 'object') return;

  const stripped = [];

  // Numeric constraints
  for (const key of NUMERIC_CONSTRAINTS) {
    if (key in node) {
      stripped.push(`${key}=${node[key]}`);
      delete node[key];
    }
  }

  // String constraints
  for (const key of STRING_CONSTRAINTS) {
    if (key in node) {
      stripped.push(`${key}=${node[key]}`);
      delete node[key];
    }
  }

  // Array constraints
  if ('maxItems' in node) {
    stripped.push(`maxItems=${node.maxItems}`);
    delete node.maxItems;
  }
  if ('minItems' in node && node.minItems > 1) {
    stripped.push(`minItems=${node.minItems}`);
    delete node.minItems;
  }

  // Annotate description with stripped constraints
  if (stripped.length > 0) {
    const note = `Note: ${stripped.join(', ')}`;
    node.description = node.description ? `${node.description}. ${note}` : note;
  }

  // Convert oneOf → anyOf
  if (node.oneOf) {
    node.anyOf = node.oneOf;
    delete node.oneOf;
  }

  // Free-form objects (type: 'object' without properties) → type: 'string'
  // Anthropic requires additionalProperties: false, making propertyless objects always {}
  if (node.type === 'object' && !node.properties) {
    node.type = 'string';
    delete node.additionalProperties;
    const hint = 'Return as a JSON-encoded object string';
    node.description = node.description ? `${hint}. ${node.description}` : hint;
  }

  // Sanitize property keys with invalid characters (e.g. @type → _at_type)
  sanitizePropertyKeys(node);

  // Normalize additionalProperties on any object type
  if (node.type === 'object' || node.properties) {
    node.additionalProperties = false;
  }

  // Recurse into properties
  if (node.properties) {
    for (const value of Object.values(node.properties)) {
      sanitizeNode(value);
    }
  }

  // Recurse into items
  if (node.items) {
    sanitizeNode(node.items);
  }

  // Recurse into anyOf/allOf
  if (Array.isArray(node.anyOf)) {
    for (const item of node.anyOf) {
      sanitizeNode(item);
    }
  }
  if (Array.isArray(node.allOf)) {
    for (const item of node.allOf) {
      sanitizeNode(item);
    }
  }
};

export const sanitizeSchemaForAnthropic = (schema) => {
  const clone = JSON.parse(JSON.stringify(schema));
  sanitizeNode(clone);
  return clone;
};

const translateResponseFormat = (responseFormat) => {
  if (!responseFormat) return {};

  const schema = responseFormat.json_schema?.schema;
  if (!schema) return {};

  const sanitized = sanitizeSchemaForAnthropic(schema);

  return {
    output_config: {
      format: {
        type: 'json_schema',
        schema: sanitized,
      },
    },
  };
};

const translateTools = (tools) => {
  if (!tools) return undefined;
  return tools.map((tool) => {
    let translated;
    // Already Anthropic format
    if (tool.name && tool.input_schema) {
      translated = tool;
    } else if (tool.type === 'function' && tool.function) {
      // OpenAI format: {type: 'function', function: {name, description, parameters}}
      translated = {
        name: tool.function.name,
        description: tool.function.description,
        input_schema: tool.function.parameters,
      };
    } else {
      translated = tool;
    }
    // Sanitize input_schema for Anthropic compatibility
    if (translated.input_schema) {
      translated = {
        ...translated,
        input_schema: sanitizeSchemaForAnthropic(translated.input_schema),
      };
    }
    return translated;
  });
};

export const translateContentBlocks = (content) => {
  if (!Array.isArray(content)) return content;
  return content.map((block) => {
    if (block.type === 'image') {
      return {
        type: 'image',
        source: {
          type: 'base64',
          media_type: block.mediaType,
          data: block.data,
        },
      };
    }
    return block;
  });
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
  const translatedMessages = userMessages.map((m) => ({
    ...m,
    content: translateContentBlocks(m.content),
  }));

  const body = {
    model,
    messages: translatedMessages,
    max_tokens: max_tokens || 4096,
    ...rest,
  };

  if (systemText) {
    body.system = systemText;
  }

  if (temperature !== undefined) {
    body.temperature = temperature;
  }

  const translatedTools = translateTools(tools);
  if (translatedTools) {
    body.tools = translatedTools;
    const translatedToolChoice = translateToolChoice(tool_choice);
    if (translatedToolChoice) {
      body.tool_choice = translatedToolChoice;
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

const restoreNode = (obj) => {
  if (typeof obj === 'string') {
    const trimmed = obj.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return restoreNode(JSON.parse(trimmed));
      } catch {
        return obj;
      }
    }
    return obj;
  }
  if (Array.isArray(obj)) return obj.map(restoreNode);
  if (obj && typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      const restoredKey = key.startsWith('_at_') ? `@${key.slice(4)}` : key;
      result[restoredKey] = restoreNode(value);
    }
    return result;
  }
  return obj;
};

const stripMarkdownCodeFences = (text) => {
  const trimmed = text.trim();
  // Strip ```json ... ``` or ``` ... ``` wrapping
  const match = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
  return match ? match[1].trim() : trimmed;
};

const restoreStructuredOutput = (text) => {
  try {
    const parsed = JSON.parse(text);
    return JSON.stringify(restoreNode(parsed));
  } catch {
    // Try stripping markdown code fences (Anthropic sometimes wraps JSON in ```)
    const stripped = stripMarkdownCodeFences(text);
    try {
      const parsed = JSON.parse(stripped);
      return JSON.stringify(restoreNode(parsed));
    } catch {
      return text;
    }
  }
};

export const parseResponse = (json) => {
  const content = json.content || [];
  const textBlock = content.find((b) => b.type === 'text');
  const toolBlocks = content.filter((b) => b.type === 'tool_use');

  const rawText = textBlock?.text || '';
  const message = {
    role: 'assistant',
    content: restoreStructuredOutput(rawText),
  };

  if (toolBlocks.length > 0) {
    message.tool_calls = toolBlocks.map((block) => ({
      id: block.id,
      type: 'function',
      function: {
        name: block.name,
        arguments: JSON.stringify(restoreNode(block.input)),
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
