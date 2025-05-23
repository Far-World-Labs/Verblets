import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { PassThrough } from 'node:stream';
import { EventEmitter } from 'node:events';

vi.mock('node-record-lpcm16', () => ({
  default: {
    record: vi.fn(() => {
      const stream = new PassThrough();
      const rec = {
        process: new EventEmitter(),
        stop: vi.fn(() => {
          stream.end();
          rec.process.emit('close');
        }),
        stream: () => stream,
      };
      setImmediate(() => {
        stream.end();
        rec.process.emit('close');
      });
      return rec;
    }),
  },
}));

vi.mock('whisper-node', () => ({
  default: vi.fn(async () => [{ speech: 'hello world stop' }]),
}));

// eslint-disable-next-line import/first
import Transcriber from './index.js';

describe('Transcriber', () => {
  const cacheDir = path.join(os.tmpdir(), 'verblets-test');

  beforeEach(async () => {
    try {
      await fs.rm(cacheDir, { recursive: true });
    } catch {
      // ignore
    }
  });

  it('records and transcribes to cache directory', async () => {
    const transcriber = new Transcriber('', { cacheDir });
    const textPromise = transcriber.startRecording();
    const text = await textPromise;
    expect(text).toBe('hello world stop');
    const files = await fs.readdir(cacheDir);
    expect(files.length).toBe(1);
  });
});
