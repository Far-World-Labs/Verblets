import { describe, expect, it, vi, beforeEach } from 'vitest';
import fs from 'node:fs/promises';
import test from './index.js';

// Mock the dependencies
vi.mock('node:fs/promises', () => ({
  default: {
    readFile: vi.fn(),
  },
}));

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn(),
}));

import chatGPT from '../../lib/chatgpt/index.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('test chain', () => {
  it('analyzes code and returns feedback when issues found', async () => {
    const mockCode = 'function example() { return "hello"; }';
    const mockFeedback = 'This function could use JSDoc comments.\nConsider adding error handling.';

    fs.readFile.mockResolvedValueOnce(mockCode);
    chatGPT.mockResolvedValueOnce(mockFeedback);

    const result = await test('/path/to/file.js', 'provide feedback');

    expect(result).toEqual([
      'This function could use JSDoc comments.',
      'Consider adding error handling.',
    ]);
    expect(fs.readFile).toHaveBeenCalledWith('/path/to/file.js', 'utf-8');
    expect(chatGPT).toHaveBeenCalledWith(
      expect.stringContaining('Analyze this code and provide feedback'),
      expect.objectContaining({
        modelOptions: {
          modelName: 'fastGoodCheap',
        },
      })
    );
  });

  it('returns empty array when no issues found', async () => {
    const mockCode = 'function example() { return "hello"; }';
    const mockFeedback = 'NO_ISSUES_FOUND';

    fs.readFile.mockResolvedValueOnce(mockCode);
    chatGPT.mockResolvedValueOnce(mockFeedback);

    const result = await test('/path/to/file.js', 'provide feedback');

    expect(result).toEqual([]);
  });

  it('returns empty array when feedback indicates no issues', async () => {
    const mockCode = 'function example() { return "hello"; }';
    const mockFeedback = 'The code looks good and follows best practices.';

    fs.readFile.mockResolvedValueOnce(mockCode);
    chatGPT.mockResolvedValueOnce(mockFeedback);

    const result = await test('/path/to/file.js', 'provide feedback');

    expect(result).toEqual([]);
  });

  it('handles file reading errors', async () => {
    fs.readFile.mockRejectedValueOnce(new Error('File not found'));

    const result = await test('/nonexistent/file.js', 'provide feedback');

    expect(result).toEqual(['Error analyzing /nonexistent/file.js: File not found']);
  });
});
