import { describe, it, expect } from 'vitest';
import generateCollection from './generate-collection.js';

describe('generateCollection', () => {
  it('includes the description text', () => {
    const result = generateCollection('famous scientists');
    expect(result).toContain('famous scientists');
  });

  it('uses default schema when none provided', () => {
    const result = generateCollection('items');
    expect(result).toContain('"name": "<string>"');
  });

  it('formats custom schema properties', () => {
    const schema = {
      type: 'object',
      properties: {
        title: { type: 'string' },
        year: { type: 'number' },
      },
    };
    const result = generateCollection('movies', { schema });
    expect(result).toContain('"title": "<string>"');
    expect(result).toContain('"year": "<number>"');
  });

  it('includes JSON output format instructions', () => {
    const result = generateCollection('items');
    expect(result).toContain('JSON.parse');
  });

  it('includes array of objects instruction', () => {
    const result = generateCollection('items');
    expect(result).toContain('array of objects');
  });

  it('includes data completeness instruction', () => {
    const result = generateCollection('items');
    expect(result).toContain('as much valid data as possible');
  });

  it('asks for array of objects', () => {
    const result = generateCollection('things');
    expect(result).toContain('array');
  });
});
