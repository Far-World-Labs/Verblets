import { describe, expect, it } from 'vitest';
import {
  sanitizeSchemaForAnthropic,
  buildRequest,
  parseResponse,
  translateContentBlocks,
} from './anthropic.js';

describe('sanitizeSchemaForAnthropic', () => {
  it('should not mutate the original schema', () => {
    const original = {
      type: 'object',
      properties: {
        score: { type: 'integer', minimum: 0, maximum: 10 },
      },
    };
    const frozen = JSON.parse(JSON.stringify(original));

    sanitizeSchemaForAnthropic(original);

    expect(original).toEqual(frozen);
  });

  describe('numeric constraints', () => {
    it('should strip minimum, maximum and annotate description', () => {
      const result = sanitizeSchemaForAnthropic({
        type: 'integer',
        minimum: 0,
        maximum: 100,
      });

      expect(result.minimum).toBeUndefined();
      expect(result.maximum).toBeUndefined();
      expect(result.description).toBe('Note: minimum=0, maximum=100');
    });

    it('should strip exclusiveMinimum, exclusiveMaximum, multipleOf', () => {
      const result = sanitizeSchemaForAnthropic({
        type: 'number',
        exclusiveMinimum: 0,
        exclusiveMaximum: 1,
        multipleOf: 0.1,
      });

      expect(result.exclusiveMinimum).toBeUndefined();
      expect(result.exclusiveMaximum).toBeUndefined();
      expect(result.multipleOf).toBeUndefined();
      expect(result.description).toBe(
        'Note: exclusiveMinimum=0, exclusiveMaximum=1, multipleOf=0.1'
      );
    });
  });

  describe('string constraints', () => {
    it('should strip minLength and maxLength', () => {
      const result = sanitizeSchemaForAnthropic({
        type: 'string',
        minLength: 1,
        maxLength: 255,
      });

      expect(result.minLength).toBeUndefined();
      expect(result.maxLength).toBeUndefined();
      expect(result.description).toBe('Note: minLength=1, maxLength=255');
    });
  });

  describe('array constraints', () => {
    it('should strip maxItems', () => {
      const result = sanitizeSchemaForAnthropic({
        type: 'array',
        items: { type: 'string' },
        maxItems: 10,
      });

      expect(result.maxItems).toBeUndefined();
      expect(result.description).toBe('Note: maxItems=10');
    });

    it('should strip minItems when > 1', () => {
      const result = sanitizeSchemaForAnthropic({
        type: 'array',
        items: { type: 'string' },
        minItems: 3,
      });

      expect(result.minItems).toBeUndefined();
      expect(result.description).toBe('Note: minItems=3');
    });

    it('should keep minItems when 0', () => {
      const result = sanitizeSchemaForAnthropic({
        type: 'array',
        items: { type: 'string' },
        minItems: 0,
      });

      expect(result.minItems).toBe(0);
      expect(result.description).toBeUndefined();
    });

    it('should keep minItems when 1', () => {
      const result = sanitizeSchemaForAnthropic({
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
      });

      expect(result.minItems).toBe(1);
      expect(result.description).toBeUndefined();
    });
  });

  describe('oneOf → anyOf conversion', () => {
    it('should convert oneOf to anyOf', () => {
      const result = sanitizeSchemaForAnthropic({
        oneOf: [{ type: 'string' }, { type: 'integer', minimum: 0 }],
      });

      expect(result.oneOf).toBeUndefined();
      expect(result.anyOf).toEqual([
        { type: 'string' },
        { type: 'integer', description: 'Note: minimum=0' },
      ]);
    });
  });

  describe('additionalProperties normalization', () => {
    it('should set additionalProperties to false on objects with properties', () => {
      const result = sanitizeSchemaForAnthropic({
        type: 'object',
        properties: { name: { type: 'string' } },
        additionalProperties: true,
      });

      expect(result.additionalProperties).toBe(false);
    });

    it('should set additionalProperties to false when it is a schema object', () => {
      const result = sanitizeSchemaForAnthropic({
        type: 'object',
        properties: { name: { type: 'string' } },
        additionalProperties: { type: 'string' },
      });

      expect(result.additionalProperties).toBe(false);
    });

    it('should keep additionalProperties false as-is', () => {
      const result = sanitizeSchemaForAnthropic({
        type: 'object',
        properties: { name: { type: 'string' } },
        additionalProperties: false,
      });

      expect(result.additionalProperties).toBe(false);
    });

    it('should convert free-form object (no properties) to string', () => {
      const result = sanitizeSchemaForAnthropic({
        type: 'object',
        additionalProperties: true,
      });

      expect(result.type).toBe('string');
      expect(result.description).toBe('Return as a JSON-encoded object string');
      expect(result.additionalProperties).toBeUndefined();
    });

    it('should convert free-form object with description to string', () => {
      const result = sanitizeSchemaForAnthropic({
        type: 'object',
        description: 'The pattern template',
      });

      expect(result.type).toBe('string');
      expect(result.description).toBe(
        'Return as a JSON-encoded object string. The pattern template'
      );
    });
  });

  describe('description handling', () => {
    it('should append to existing description', () => {
      const result = sanitizeSchemaForAnthropic({
        type: 'integer',
        description: 'A score value',
        minimum: 0,
        maximum: 10,
      });

      expect(result.description).toBe('A score value. Note: minimum=0, maximum=10');
    });

    it('should create description when none exists', () => {
      const result = sanitizeSchemaForAnthropic({
        type: 'integer',
        minimum: 1,
      });

      expect(result.description).toBe('Note: minimum=1');
    });

    it('should not add description when nothing is stripped', () => {
      const result = sanitizeSchemaForAnthropic({
        type: 'string',
        description: 'A name',
      });

      expect(result.description).toBe('A name');
    });
  });

  describe('deep recursion', () => {
    it('should sanitize nested object properties', () => {
      const result = sanitizeSchemaForAnthropic({
        type: 'object',
        properties: {
          inner: {
            type: 'object',
            properties: {
              value: { type: 'integer', minimum: 0, maximum: 100 },
            },
          },
        },
      });

      expect(result.properties.inner.additionalProperties).toBe(false);
      expect(result.properties.inner.properties.value.minimum).toBeUndefined();
      expect(result.properties.inner.properties.value.maximum).toBeUndefined();
      expect(result.properties.inner.properties.value.description).toBe(
        'Note: minimum=0, maximum=100'
      );
    });

    it('should sanitize array items', () => {
      const result = sanitizeSchemaForAnthropic({
        type: 'array',
        items: {
          type: 'object',
          properties: {
            count: { type: 'integer', minimum: 1 },
          },
        },
      });

      expect(result.items.additionalProperties).toBe(false);
      expect(result.items.properties.count.minimum).toBeUndefined();
      expect(result.items.properties.count.description).toBe('Note: minimum=1');
    });

    it('should sanitize inside anyOf/allOf arrays', () => {
      const result = sanitizeSchemaForAnthropic({
        anyOf: [
          { type: 'integer', minimum: 0 },
          { type: 'string', maxLength: 50 },
        ],
        allOf: [{ type: 'object', properties: { x: { type: 'number', maximum: 1 } } }],
      });

      expect(result.anyOf[0].minimum).toBeUndefined();
      expect(result.anyOf[0].description).toBe('Note: minimum=0');
      expect(result.anyOf[1].maxLength).toBeUndefined();
      expect(result.anyOf[1].description).toBe('Note: maxLength=50');
      expect(result.allOf[0].properties.x.maximum).toBeUndefined();
    });

    it('should handle a realistic multi-level schema', () => {
      const result = sanitizeSchemaForAnthropic({
        type: 'object',
        properties: {
          items: {
            type: 'array',
            minItems: 5,
            maxItems: 20,
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', minLength: 1, maxLength: 100 },
                score: { type: 'number', minimum: 0, maximum: 1, description: 'Confidence score' },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  minItems: 1,
                  maxItems: 5,
                },
              },
              additionalProperties: true,
            },
          },
        },
        additionalProperties: false,
      });

      // Top-level object
      expect(result.additionalProperties).toBe(false);

      // Array with minItems > 1 stripped, maxItems stripped
      const itemsProp = result.properties.items;
      expect(itemsProp.minItems).toBeUndefined();
      expect(itemsProp.maxItems).toBeUndefined();
      expect(itemsProp.description).toBe('Note: maxItems=20, minItems=5');

      // Nested object
      const itemSchema = itemsProp.items;
      expect(itemSchema.additionalProperties).toBe(false);

      // String constraints stripped
      expect(itemSchema.properties.name.minLength).toBeUndefined();
      expect(itemSchema.properties.name.maxLength).toBeUndefined();

      // Numeric constraints stripped, existing description preserved
      expect(itemSchema.properties.score.minimum).toBeUndefined();
      expect(itemSchema.properties.score.maximum).toBeUndefined();
      expect(itemSchema.properties.score.description).toBe(
        'Confidence score. Note: minimum=0, maximum=1'
      );

      // Tags array: minItems=1 kept, maxItems stripped
      const tagsProp = itemSchema.properties.tags;
      expect(tagsProp.minItems).toBe(1);
      expect(tagsProp.maxItems).toBeUndefined();
      expect(tagsProp.description).toBe('Note: maxItems=5');
    });
  });

  describe('property key sanitization', () => {
    it('should rename @-prefixed keys to _at_ prefixed', () => {
      const result = sanitizeSchemaForAnthropic({
        type: 'object',
        properties: {
          '@type': { type: 'string' },
          '@context': { type: 'string' },
          name: { type: 'string' },
        },
        required: ['@type', 'name'],
      });

      expect(result.properties._at_type).toBeDefined();
      expect(result.properties._at_context).toBeDefined();
      expect(result.properties.name).toBeDefined();
      expect(result.properties['@type']).toBeUndefined();
      expect(result.required).toEqual(['_at_type', 'name']);
    });

    it('should leave valid keys unchanged', () => {
      const result = sanitizeSchemaForAnthropic({
        type: 'object',
        properties: {
          valid_key: { type: 'string' },
          'also.valid': { type: 'number' },
        },
      });

      expect(result.properties.valid_key).toBeDefined();
      expect(result.properties['also.valid']).toBeDefined();
    });

    it('should sanitize keys in nested objects', () => {
      const result = sanitizeSchemaForAnthropic({
        type: 'object',
        properties: {
          location: {
            type: 'object',
            properties: {
              '@type': { type: 'string' },
              name: { type: 'string' },
            },
            required: ['@type'],
          },
        },
      });

      expect(result.properties.location.properties._at_type).toBeDefined();
      expect(result.properties.location.required).toEqual(['_at_type']);
    });
  });

  describe('free-form object conversion', () => {
    it('should convert object without properties to string', () => {
      const result = sanitizeSchemaForAnthropic({
        type: 'object',
        description: 'The pattern template or instance data',
      });

      expect(result.type).toBe('string');
      expect(result.description).toBe(
        'Return as a JSON-encoded object string. The pattern template or instance data'
      );
      expect(result.additionalProperties).toBeUndefined();
    });

    it('should not convert objects with properties', () => {
      const result = sanitizeSchemaForAnthropic({
        type: 'object',
        properties: { name: { type: 'string' } },
      });

      expect(result.type).toBe('object');
      expect(result.properties.name).toBeDefined();
    });
  });
});

describe('parseResponse structured output restoration', () => {
  const makeResponse = (text) => ({
    content: [{ type: 'text', text }],
    stop_reason: 'end_turn',
  });

  it('should restore _at_ prefixed keys to @ in JSON responses', () => {
    const json = JSON.stringify({ _at_type: 'Place', name: 'Paris' });
    const result = parseResponse(makeResponse(json));
    const parsed = JSON.parse(result.choices[0].message.content);

    expect(parsed['@type']).toBe('Place');
    expect(parsed.name).toBe('Paris');
    expect(parsed._at_type).toBeUndefined();
  });

  it('should parse JSON string values back to objects', () => {
    const json = JSON.stringify({
      items: [{ template: '{"key": "value", "count": 5}' }],
    });
    const result = parseResponse(makeResponse(json));
    const parsed = JSON.parse(result.choices[0].message.content);

    expect(parsed.items[0].template).toEqual({ key: 'value', count: 5 });
  });

  it('should leave non-JSON strings untouched', () => {
    const json = JSON.stringify({ name: 'hello world' });
    const result = parseResponse(makeResponse(json));
    const parsed = JSON.parse(result.choices[0].message.content);

    expect(parsed.name).toBe('hello world');
  });

  it('should leave non-JSON text responses untouched', () => {
    const result = parseResponse(makeResponse('Hello, how are you?'));

    expect(result.choices[0].message.content).toBe('Hello, how are you?');
  });

  it('should handle nested key restoration and JSON parsing together', () => {
    const json = JSON.stringify({
      _at_context: 'https://schema.org',
      _at_type: 'Place',
      address: '{"_at_type": "PostalAddress", "city": "Paris"}',
    });
    const result = parseResponse(makeResponse(json));
    const parsed = JSON.parse(result.choices[0].message.content);

    expect(parsed['@context']).toBe('https://schema.org');
    expect(parsed['@type']).toBe('Place');
    expect(parsed.address).toEqual({ '@type': 'PostalAddress', city: 'Paris' });
  });
});

describe('buildRequest tool_choice translation', () => {
  const base = {
    messages: [{ role: 'user', content: 'hi' }],
    model: 'claude-3',
    tools: [{ name: 'test', description: 'test tool', input_schema: { type: 'object' } }],
  };

  const getBody = (config) => {
    const { fetchOptions } = buildRequest(
      'https://api.anthropic.com',
      'key',
      '/v1/messages',
      config
    );
    return JSON.parse(fetchOptions.body);
  };

  it('should translate string "auto" to {type: "auto"}', () => {
    const body = getBody({ ...base, tool_choice: 'auto' });
    expect(body.tool_choice).toEqual({ type: 'auto' });
  });

  it('should translate string "required" to {type: "any"}', () => {
    const body = getBody({ ...base, tool_choice: 'required' });
    expect(body.tool_choice).toEqual({ type: 'any' });
  });

  it('should omit tool_choice for "none"', () => {
    const body = getBody({ ...base, tool_choice: 'none' });
    expect(body.tool_choice).toBeUndefined();
  });

  it('should translate OpenAI function object to Anthropic tool object', () => {
    const body = getBody({
      ...base,
      tool_choice: { type: 'function', function: { name: 'my_tool' } },
    });
    expect(body.tool_choice).toEqual({ type: 'tool', name: 'my_tool' });
  });

  it('should pass through Anthropic-native object format', () => {
    const body = getBody({ ...base, tool_choice: { type: 'auto' } });
    expect(body.tool_choice).toEqual({ type: 'auto' });
  });

  it('should omit tool_choice when not provided', () => {
    const body = getBody({ ...base });
    expect(body.tool_choice).toBeUndefined();
  });
});

describe('buildRequest tools format translation', () => {
  const getBody = (config) => {
    const { fetchOptions } = buildRequest(
      'https://api.anthropic.com',
      'key',
      '/v1/messages',
      config
    );
    return JSON.parse(fetchOptions.body);
  };

  it('should translate OpenAI function tools to Anthropic format and sanitize schema', () => {
    const body = getBody({
      messages: [{ role: 'user', content: 'hi' }],
      model: 'claude-3',
      tools: [
        {
          type: 'function',
          function: {
            name: 'get_weather',
            description: 'Get the weather',
            parameters: {
              type: 'object',
              properties: { city: { type: 'string' } },
            },
          },
        },
      ],
    });

    expect(body.tools).toEqual([
      {
        name: 'get_weather',
        description: 'Get the weather',
        input_schema: {
          type: 'object',
          properties: { city: { type: 'string' } },
          additionalProperties: false,
        },
      },
    ]);
  });

  it('should sanitize Anthropic-native tool input_schema', () => {
    const body = getBody({
      messages: [{ role: 'user', content: 'hi' }],
      model: 'claude-3',
      tools: [
        {
          name: 'search',
          description: 'Search the web',
          input_schema: { type: 'object', properties: { q: { type: 'string' } } },
        },
      ],
    });

    expect(body.tools).toEqual([
      {
        name: 'search',
        description: 'Search the web',
        input_schema: {
          type: 'object',
          properties: { q: { type: 'string' } },
          additionalProperties: false,
        },
      },
    ]);
  });

  it('should omit tools when not provided', () => {
    const body = getBody({
      messages: [{ role: 'user', content: 'hi' }],
      model: 'claude-3',
    });

    expect(body.tools).toBeUndefined();
  });
});

describe('translateContentBlocks (Anthropic)', () => {
  it('should pass through a plain string', () => {
    const result = translateContentBlocks('just text');
    expect(result).toBe('just text');
  });

  it('should pass through text-only content blocks unchanged', () => {
    const blocks = [{ type: 'text', text: 'Hello world' }];
    const result = translateContentBlocks(blocks);

    expect(result).toEqual([{ type: 'text', text: 'Hello world' }]);
  });

  it('should translate image blocks to Anthropic base64 source format', () => {
    const blocks = [
      { type: 'text', text: 'Analyze this' },
      { type: 'image', data: 'abc123', mediaType: 'image/jpeg' },
    ];
    const result = translateContentBlocks(blocks);

    expect(result).toEqual([
      { type: 'text', text: 'Analyze this' },
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: 'abc123',
        },
      },
    ]);
  });

  it('should translate multiple image blocks', () => {
    const blocks = [
      { type: 'text', text: 'Compare' },
      { type: 'image', data: 'img1', mediaType: 'image/png' },
      { type: 'image', data: 'img2', mediaType: 'image/webp' },
    ];
    const result = translateContentBlocks(blocks);

    expect(result[1].source.media_type).toBe('image/png');
    expect(result[2].source.media_type).toBe('image/webp');
    expect(result[1].source.data).toBe('img1');
    expect(result[2].source.data).toBe('img2');
  });
});

describe('buildRequest vision content translation', () => {
  const getBody = (config) => {
    const { fetchOptions } = buildRequest(
      'https://api.anthropic.com',
      'key',
      '/v1/messages',
      config
    );
    return JSON.parse(fetchOptions.body);
  };

  it('should translate image content blocks in user messages', () => {
    const body = getBody({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'What is in this image?' },
            { type: 'image', data: 'base64data', mediaType: 'image/jpeg' },
          ],
        },
      ],
      model: 'claude-3',
    });

    expect(body.messages[0].content).toEqual([
      { type: 'text', text: 'What is in this image?' },
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: 'base64data',
        },
      },
    ]);
  });

  it('should leave string content in messages unchanged', () => {
    const body = getBody({
      messages: [{ role: 'user', content: 'plain text' }],
      model: 'claude-3',
    });

    expect(body.messages[0].content).toBe('plain text');
  });
});
