import { describe, it, expect } from 'vitest';
import intent from './intent.js';

describe('intent', () => {
  it('includes the input text in XML input tags', () => {
    const result = intent('play some jazz music');
    expect(result).toContain('play some jazz music');
    expect(result).toContain('<input>');
  });

  it('includes the intent schema in XML schema tags', () => {
    const result = intent('test');
    expect(result).toContain('<schema>');
    expect(result).toContain('queryText');
    expect(result).toContain('operation');
  });

  it('includes the example JSON in XML example tags', () => {
    const result = intent('test');
    expect(result).toContain('<example>');
    expect(result).toContain('play_music');
    expect(result).toContain('The Beatles');
  });

  it('includes operations section when operations provided', () => {
    const result = intent('turn on lights', { operations: ['toggle', 'dim', 'color'] });
    expect(result).toContain('possible operations');
    expect(result).toContain('toggle, dim, color');
  });

  it('omits operations section when operations empty', () => {
    const result = intent('test', { operations: [] });
    expect(result).not.toContain('possible operations');
  });

  it('includes parameters section when parameters provided', () => {
    const result = intent('set volume', { parameters: ['level', 'device'] });
    expect(result).toContain('possible parameters');
    expect(result).toContain('level, device');
  });

  it('omits parameters section when parameters empty', () => {
    const result = intent('test', { parameters: [] });
    expect(result).not.toContain('possible parameters');
  });

  it('handles both operations and parameters together', () => {
    const result = intent('play music', {
      operations: ['play', 'pause', 'stop'],
      parameters: ['genre', 'artist', 'volume'],
    });
    expect(result).toContain('play, pause, stop');
    expect(result).toContain('genre, artist, volume');
  });

  it('uses "None given" when text is falsy', () => {
    const result = intent(undefined);
    expect(result).toContain('None given');
  });

  it('includes JSON output format instruction', () => {
    const result = intent('test');
    expect(result).toContain('JSON.parse');
  });

  it('includes abstraction and parameter guidance', () => {
    const result = intent('test');
    expect(result).toContain('sufficiently abstract');
    expect(result).toContain('full list of supplied parameters');
  });
});
