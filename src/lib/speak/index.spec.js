import { describe, it, expect, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import speak from './index.js';

vi.mock('node:child_process', () => ({
  spawnSync: vi.fn(() => ({ status: 0 })),
}));

describe('speak', () => {
  it('uses the first command by default', () => {
    speak('hello');
    expect(spawnSync.mock.calls[0][0]).toContain('tts');
  });

  it('falls back when command is missing', () => {
    spawnSync.mockReset();
    spawnSync.mockReturnValueOnce({ error: { code: 'ENOENT' } }).mockReturnValueOnce({ status: 0 });
    speak('hello', { commands: [() => 'missing', () => 'second'] });
    expect(spawnSync.mock.calls[1][0]).toBe('second');
  });
});
