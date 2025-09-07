import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from './index.js';

// Mock chatGPT
vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn(),
}));

// Mock retry to just call the function
vi.mock('../../lib/retry/index.js', () => ({
  default: vi.fn((fn) => fn()),
}));

import chatGPT from '../../lib/chatgpt/index.js';

let tempFile;

beforeEach(() => {
  vi.clearAllMocks();
  tempFile = join(tmpdir(), `test-${Date.now()}.js`);
});

afterEach(async () => {
  try {
    await unlink(tempFile);
  } catch {
    // Ignore if file doesn't exist
  }
});

describe('test chain', () => {
  it('analyzes code and returns feedback when issues found', async () => {
    const mockCode = 'function example() { return "hello"; }';
    await writeFile(tempFile, mockCode);

    chatGPT.mockResolvedValueOnce({
      hasIssues: true,
      issues: ['This function could use JSDoc comments.', 'Consider adding error handling.'],
    });

    const result = await test(tempFile, 'provide feedback');

    expect(result).toEqual([
      'This function could use JSDoc comments.',
      'Consider adding error handling.',
    ]);

    expect(chatGPT).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        modelOptions: expect.objectContaining({
          response_format: expect.objectContaining({
            type: 'json_schema',
          }),
        }),
      })
    );
  });

  it('returns empty array when no issues found', async () => {
    const mockCode = 'function example() { return "hello"; }';
    await writeFile(tempFile, mockCode);

    chatGPT.mockResolvedValueOnce({
      hasIssues: false,
      issues: [],
    });

    const result = await test(tempFile, 'provide feedback');

    expect(result).toEqual([]);
  });

  it('handles errors', async () => {
    chatGPT.mockRejectedValueOnce(new Error('Analysis failed'));
    await writeFile(tempFile, 'bad code');

    const result = await test(tempFile, 'provide feedback');
    expect(result).toEqual([`Error analyzing ${tempFile}: Analysis failed`]);
  });
});
