import { describe, expect, it } from 'vitest';
import { buildVisionPrompt } from './index.js';

describe('buildVisionPrompt', () => {
  it('should build a content array with text and a single image', () => {
    const result = buildVisionPrompt('Analyze this screenshot', [
      { data: 'abc123', mediaType: 'image/jpeg' },
    ]);

    expect(result).toEqual([
      { type: 'text', text: 'Analyze this screenshot' },
      { type: 'image', data: 'abc123', mediaType: 'image/jpeg' },
    ]);
  });

  it('should build a content array with text and multiple images', () => {
    const result = buildVisionPrompt('Compare these images', [
      { data: 'img1data', mediaType: 'image/png' },
      { data: 'img2data', mediaType: 'image/jpeg' },
      { data: 'img3data', mediaType: 'image/webp' },
    ]);

    expect(result).toHaveLength(4);
    expect(result[0]).toEqual({ type: 'text', text: 'Compare these images' });
    expect(result[1]).toEqual({ type: 'image', data: 'img1data', mediaType: 'image/png' });
    expect(result[2]).toEqual({ type: 'image', data: 'img2data', mediaType: 'image/jpeg' });
    expect(result[3]).toEqual({ type: 'image', data: 'img3data', mediaType: 'image/webp' });
  });

  it('should build a text-only content array when images is empty', () => {
    const result = buildVisionPrompt('Just text, no images', []);

    expect(result).toEqual([{ type: 'text', text: 'Just text, no images' }]);
  });

  it('should not include extra properties from image objects', () => {
    const result = buildVisionPrompt('Check this', [
      { data: 'abc', mediaType: 'image/png', width: 800, extraProp: true },
    ]);

    expect(result[1]).toEqual({ type: 'image', data: 'abc', mediaType: 'image/png' });
    expect(result[1].width).toBeUndefined();
    expect(result[1].extraProp).toBeUndefined();
  });
});
