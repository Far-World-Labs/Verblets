import { describe, expect, it } from 'vitest';
import { translateContentBlocks, buildRequest } from './openai.js';

describe('translateContentBlocks (OpenAI)', () => {
  it('should pass through a plain string', () => {
    const result = translateContentBlocks('just text');
    expect(result).toBe('just text');
  });

  it('should pass through text-only content blocks unchanged', () => {
    const blocks = [{ type: 'text', text: 'Hello world' }];
    const result = translateContentBlocks(blocks);

    expect(result).toEqual([{ type: 'text', text: 'Hello world' }]);
  });

  it('should translate image blocks to OpenAI image_url format with data URI', () => {
    const blocks = [
      { type: 'text', text: 'Analyze this' },
      { type: 'image', data: 'abc123', mediaType: 'image/jpeg' },
    ];
    const result = translateContentBlocks(blocks);

    expect(result).toEqual([
      { type: 'text', text: 'Analyze this' },
      {
        type: 'image_url',
        image_url: {
          url: 'data:image/jpeg;base64,abc123',
        },
      },
    ]);
  });

  it('should translate multiple image blocks with correct data URIs', () => {
    const blocks = [
      { type: 'text', text: 'Compare' },
      { type: 'image', data: 'pngdata', mediaType: 'image/png' },
      { type: 'image', data: 'webpdata', mediaType: 'image/webp' },
    ];
    const result = translateContentBlocks(blocks);

    expect(result[1].image_url.url).toBe('data:image/png;base64,pngdata');
    expect(result[2].image_url.url).toBe('data:image/webp;base64,webpdata');
  });
});

describe('buildRequest vision content translation', () => {
  const getBody = (config) => {
    const { fetchOptions } = buildRequest(
      'https://api.openai.com',
      'key',
      '/v1/chat/completions',
      config
    );
    return JSON.parse(fetchOptions.body);
  };

  it('should translate image content blocks in messages', () => {
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
      model: 'gpt-4o',
    });

    expect(body.messages[0].content).toEqual([
      { type: 'text', text: 'What is in this image?' },
      {
        type: 'image_url',
        image_url: {
          url: 'data:image/jpeg;base64,base64data',
        },
      },
    ]);
  });

  it('should leave string content in messages unchanged', () => {
    const body = getBody({
      messages: [{ role: 'user', content: 'plain text' }],
      model: 'gpt-4o',
    });

    expect(body.messages[0].content).toBe('plain text');
  });
});
