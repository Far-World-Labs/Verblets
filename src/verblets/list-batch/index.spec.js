import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/llm/index.js', () => ({ default: vi.fn() }));

import listBatch, { ListStyle, determineStyle } from './index.js';
import callLlm from '../../lib/llm/index.js';

beforeEach(() => {
  callLlm.mockReset();
  callLlm.mockResolvedValue(['processed-a', 'processed-b']);
});

describe('listBatch verblet', () => {
  describe('basic call', () => {
    it('returns the array from callLlm', async () => {
      const result = await listBatch(['a', 'b'], 'uppercase each item');
      expect(result).toStrictEqual(['processed-a', 'processed-b']);
    });

    it('passes prompt containing instructions and input items to callLlm', async () => {
      await listBatch(['alpha', 'beta'], 'reverse each word');

      const prompt = callLlm.mock.calls[0][0];
      expect(prompt).toContain('<instructions>');
      expect(prompt).toContain('reverse each word');
      expect(prompt).toContain('Input items:');
      expect(prompt).toContain('alpha');
      expect(prompt).toContain('beta');
    });

    it('uses default JSON schema response format when none provided', async () => {
      await listBatch(['x'], 'transform');

      const options = callLlm.mock.calls[0][1];
      const responseFormat = options.response_format;
      expect(responseFormat.type).toBe('json_schema');
      expect(responseFormat.json_schema.name).toBe('list_result');
      expect(responseFormat.json_schema.schema).toStrictEqual({
        type: 'object',
        properties: {
          items: { type: 'array', items: { type: 'string' } },
        },
        required: ['items'],
        additionalProperties: false,
      });
    });
  });

  describe('empty and missing input', () => {
    it('returns empty array for empty list without calling llm', async () => {
      const result = await listBatch([], 'anything');
      expect(result).toStrictEqual([]);
      expect(callLlm).not.toHaveBeenCalled();
    });

    it('returns empty array for null list without calling llm', async () => {
      const result = await listBatch(null, 'anything');
      expect(result).toStrictEqual([]);
      expect(callLlm).not.toHaveBeenCalled();
    });

    it('returns empty array for undefined list without calling llm', async () => {
      const result = await listBatch(undefined, 'anything');
      expect(result).toStrictEqual([]);
      expect(callLlm).not.toHaveBeenCalled();
    });
  });

  describe('config merging', () => {
    it('forwards custom responseFormat overriding the default', async () => {
      const customFormat = {
        type: 'json_schema',
        json_schema: {
          name: 'custom_output',
          schema: { type: 'object', properties: { data: { type: 'string' } } },
        },
      };
      await listBatch(['a'], 'transform', { responseFormat: customFormat });

      const options = callLlm.mock.calls[0][1];
      expect(options.response_format).toStrictEqual(customFormat);
    });

    it('forwards incoming model keys and merges with response_format', async () => {
      await listBatch(['a'], 'transform', { temperature: 0.5, systemPrompt: 'be terse' });

      const options = callLlm.mock.calls[0][1];
      expect(options.temperature).toBe(0.5);
      expect(options.systemPrompt).toBe('be terse');
      expect(options.response_format).toBeDefined();
    });
  });

  describe('list styles', () => {
    it('formats as newline-separated by default for short items', async () => {
      await listBatch(['apple', 'banana'], 'categorize');

      const prompt = callLlm.mock.calls[0][0];
      expect(prompt).toContain('apple\nbanana');
      expect(prompt).not.toContain('<list>');
    });

    it('formats as XML when listStyle is XML', async () => {
      await listBatch(['apple', 'banana'], 'categorize', {
        listStyle: ListStyle.XML,
      });

      const prompt = callLlm.mock.calls[0][0];
      expect(prompt).toContain('<list>');
      expect(prompt).toContain('<item>apple</item>');
      expect(prompt).toContain('<item>banana</item>');
      expect(prompt).toContain('</list>');
    });

    it('formats as newline when listStyle is NEWLINE regardless of item length', async () => {
      const longItem = 'x'.repeat(2000);
      await listBatch([longItem], 'summarize', {
        listStyle: ListStyle.NEWLINE,
      });

      const prompt = callLlm.mock.calls[0][0];
      expect(prompt).not.toContain('<list>');
      expect(prompt).toContain(longItem);
    });

    it('auto-switches to XML when items contain newlines', async () => {
      await listBatch(['line1\nline2', 'simple'], 'process');

      const prompt = callLlm.mock.calls[0][0];
      expect(prompt).toContain('<list>');
      expect(prompt).toContain('<item>');
    });

    it('auto-switches to XML when items exceed default threshold of 1000 chars', async () => {
      const longItem = 'a'.repeat(1001);
      await listBatch([longItem, 'short'], 'process');

      const prompt = callLlm.mock.calls[0][0];
      expect(prompt).toContain('<list>');
    });

    it('respects custom autoModeThreshold', async () => {
      const item = 'a'.repeat(50);
      await listBatch([item], 'process', { autoModeThreshold: 30 });

      const prompt = callLlm.mock.calls[0][0];
      expect(prompt).toContain('<list>');
    });

    it('XML format escapes special characters in items', async () => {
      await listBatch(['<b>bold</b>', 'a & b'], 'process', {
        listStyle: ListStyle.XML,
      });

      const prompt = callLlm.mock.calls[0][0];
      expect(prompt).toContain('&lt;b&gt;bold&lt;/b&gt;');
      expect(prompt).toContain('a &amp; b');
    });

    it('coerces non-string items via String()', async () => {
      await listBatch([42, true, null], 'describe each');

      const prompt = callLlm.mock.calls[0][0];
      expect(prompt).toContain('42');
      expect(prompt).toContain('true');
      expect(prompt).toContain('null');
    });
  });

  describe('instructions as function', () => {
    it('calls instruction function with list, style, and count', async () => {
      const instructionFn = vi.fn().mockReturnValue('dynamic instructions');
      await listBatch(['a', 'b', 'c'], instructionFn);

      expect(instructionFn).toHaveBeenCalledWith({
        list: ['a', 'b', 'c'],
        style: ListStyle.NEWLINE,
        count: 3,
      });

      const prompt = callLlm.mock.calls[0][0];
      expect(prompt).toContain('dynamic instructions');
    });

    it('passes XML style to instruction function when style is XML', async () => {
      const instructionFn = vi.fn().mockReturnValue('xml instructions');
      await listBatch(['multi\nline'], instructionFn);

      expect(instructionFn).toHaveBeenCalledWith(expect.objectContaining({ style: ListStyle.XML }));
    });
  });

  describe('error handling', () => {
    it('re-throws callLlm errors', async () => {
      callLlm.mockRejectedValue(new Error('LLM service unavailable'));

      await expect(listBatch(['a'], 'process')).rejects.toThrow('LLM service unavailable');
    });

    it('logs error details when logger is provided and callLlm fails', async () => {
      const logger = { debug: vi.fn(), error: vi.fn() };
      callLlm.mockRejectedValue(new Error('timeout'));

      await expect(listBatch(['a', 'b'], 'process', { logger })).rejects.toThrow('timeout');

      expect(logger.error).toHaveBeenCalledWith(
        'LLM request failed in listBatch',
        expect.objectContaining({
          error: 'timeout',
          promptLength: expect.any(Number),
          itemCount: 2,
        })
      );
    });
  });
});

describe('determineStyle', () => {
  it('returns NEWLINE for short simple items in AUTO mode', () => {
    expect(determineStyle(ListStyle.AUTO, ['short', 'items'])).toBe(ListStyle.NEWLINE);
  });

  it('returns XML for items with newlines in AUTO mode', () => {
    expect(determineStyle(ListStyle.AUTO, ['has\nnewline'])).toBe(ListStyle.XML);
  });

  it('returns XML for items exceeding default 1000 char threshold', () => {
    expect(determineStyle(ListStyle.AUTO, ['x'.repeat(1001)])).toBe(ListStyle.XML);
  });

  it('respects custom threshold', () => {
    expect(determineStyle(ListStyle.AUTO, ['medium length'], 5)).toBe(ListStyle.XML);
  });

  it('returns NEWLINE when all items are under custom threshold', () => {
    expect(determineStyle(ListStyle.AUTO, ['hi'], 100)).toBe(ListStyle.NEWLINE);
  });

  it('returns the explicit style when not AUTO', () => {
    expect(determineStyle(ListStyle.XML, ['short'])).toBe(ListStyle.XML);
    expect(determineStyle(ListStyle.NEWLINE, ['has\nnewline'])).toBe(ListStyle.NEWLINE);
  });

  it('treats falsy style as AUTO', () => {
    expect(determineStyle(undefined, ['short'])).toBe(ListStyle.NEWLINE);
    expect(determineStyle(null, ['short'])).toBe(ListStyle.NEWLINE);
    expect(determineStyle('', ['has\nnewline'])).toBe(ListStyle.XML);
  });
});

describe('ListStyle enum', () => {
  it('exposes the expected style values', () => {
    expect(ListStyle.NEWLINE).toBe('newline');
    expect(ListStyle.XML).toBe('xml');
    expect(ListStyle.AUTO).toBe('auto');
  });

  it('has exactly three entries', () => {
    expect(Object.keys(ListStyle)).toHaveLength(3);
  });
});
