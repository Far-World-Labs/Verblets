import { beforeEach, vi, expect } from 'vitest';
import { ChainEvent, Kind } from '../../lib/progress/constants.js';
import { runTable, applyMocks } from '../../lib/examples-runner/index.js';

vi.mock('../../lib/llm/index.js', async () => {
  const actual = await vi.importActual('../../lib/llm/index.js');
  return {
    ...actual,
    default: vi.fn(async () => 'Analysis of the image content'),
  };
});

vi.mock('../../lib/image-utils/index.js', () => ({
  imageToBase64: vi.fn(async (path) => ({
    data: `base64data-${path}`,
    mediaType: 'image/png',
  })),
  tileImages: vi.fn(async () => ({
    path: '/tmp/tile.jpg',
    width: 800,
    height: 600,
    sizeBytes: 12345,
    tiles: [],
  })),
}));

vi.mock('../../lib/retry/index.js', () => ({ default: vi.fn((fn) => fn()) }));

import analyzeImage, { mapDetail } from './index.js';
import callLlm from '../../lib/llm/index.js';
import { imageToBase64, tileImages } from '../../lib/image-utils/index.js';

beforeEach(() => vi.clearAllMocks());

runTable({
  describe: 'analyze-image',
  examples: [
    {
      name: 'accepts a single string path and calls imageToBase64 once',
      inputs: { images: '/photos/cat.png', instructions: 'describe this image' },
      want: {
        toBase64Calls: 1,
        toBase64Args: ['/photos/cat.png'],
        llmCalls: 1,
        value: 'Analysis of the image content',
      },
    },
    {
      name: 'accepts an array of paths and calls imageToBase64 for each',
      inputs: { images: ['/photos/a.png', '/photos/b.png'], instructions: 'compare these' },
      want: { toBase64Calls: 2, toBase64ArgsAny: ['/photos/a.png', '/photos/b.png'] },
    },
    {
      name: 'accepts an array of { path, label } objects and normalizes correctly',
      inputs: {
        images: [
          { path: '/photos/before.png', label: 'Before' },
          { path: '/photos/after.png', label: 'After' },
        ],
        instructions: 'spot the differences',
      },
      want: { toBase64Calls: 2, toBase64ArgsAny: ['/photos/before.png', '/photos/after.png'] },
    },
    {
      name: 'tiles multiple images when tile option is true',
      inputs: {
        images: [
          { path: '/photos/a.png', label: 'A' },
          { path: '/photos/b.png', label: 'B' },
        ],
        instructions: 'compare',
        options: { tile: true },
      },
      want: {
        tileCalls: 1,
        tileArgs: [['/photos/a.png', '/photos/b.png'], { labels: ['A', 'B'] }],
        toBase64Calls: 1,
        toBase64Args: ['/tmp/tile.jpg'],
      },
    },
    {
      name: 'does not tile when tile is true but only one image is provided',
      inputs: {
        images: ['/photos/solo.png'],
        instructions: 'describe',
        options: { tile: true },
      },
      want: { noTile: true, toBase64Calls: 1, toBase64Args: ['/photos/solo.png'] },
    },
    {
      name: 'passes instructions as the text content in the vision prompt',
      inputs: { images: '/photos/cat.png', instructions: 'count the whiskers' },
      want: { textEntry: 'count the whiskers' },
    },
    {
      name: 'passes runConfig to callLlm with operation path including analyze-image',
      inputs: {
        images: '/photos/cat.png',
        instructions: 'describe',
        options: { operation: 'parent' },
      },
      want: { operationContains: 'analyze-image' },
    },
    {
      name: 'emits start and complete events via onProgress callback',
      inputs: { images: '/photos/cat.png', instructions: 'describe', withEvents: true },
      want: { startAndComplete: true, completeShape: { imageCount: 1, tiled: false } },
    },
    {
      name: 'emits error event on failure and rethrows',
      inputs: {
        images: '/photos/cat.png',
        instructions: 'describe',
        withEvents: true,
        tolerant: true,
      },
      mocks: { callLlm: [new Error('vision model unavailable')] },
      want: { errorMessage: 'vision model unavailable', errorEventShape: { imageCount: 1 } },
    },
    {
      name: 'emits tile event with composite dimensions',
      inputs: {
        images: ['/photos/a.png', '/photos/b.png'],
        instructions: 'compare',
        options: { tile: true },
        withEvents: true,
      },
      want: {
        tileEventShape: {
          path: '/tmp/tile.jpg',
          width: 800,
          height: 600,
          sizeBytes: 12345,
        },
      },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { callLlm });
    if (inputs.withEvents) {
      const events = [];
      let value;
      let error;
      try {
        value = await analyzeImage(inputs.images, inputs.instructions, {
          ...inputs.options,
          onProgress: (e) => events.push(e),
        });
      } catch (e) {
        if (!inputs.tolerant) throw e;
        error = e;
      }
      return { value, events, error };
    }
    return analyzeImage(inputs.images, inputs.instructions, inputs.options);
  },
  expects: ({ result, want }) => {
    if ('toBase64Calls' in want) {
      expect(imageToBase64).toHaveBeenCalledTimes(want.toBase64Calls);
    }
    if (want.toBase64Args) {
      expect(imageToBase64).toHaveBeenCalledWith(...want.toBase64Args);
    }
    if (want.toBase64ArgsAny) {
      for (const arg of want.toBase64ArgsAny) {
        expect(imageToBase64).toHaveBeenCalledWith(arg);
      }
    }
    if ('llmCalls' in want) expect(callLlm).toHaveBeenCalledTimes(want.llmCalls);
    if ('value' in want) expect(result).toBe(want.value);
    if ('tileCalls' in want) {
      expect(tileImages).toHaveBeenCalledTimes(want.tileCalls);
    }
    if (want.tileArgs) expect(tileImages).toHaveBeenCalledWith(...want.tileArgs);
    if (want.noTile) expect(tileImages).not.toHaveBeenCalled();
    if (want.textEntry) {
      const contentArray = callLlm.mock.calls[0][0];
      const textEntry = contentArray.find((entry) => entry.type === 'text');
      expect(textEntry.text).toBe(want.textEntry);
    }
    if (want.operationContains) {
      const runConfig = callLlm.mock.calls[0][1];
      expect(runConfig.operation).toContain(want.operationContains);
    }
    if (want.startAndComplete) {
      const start = result.events.find(
        (e) => e.kind === Kind.telemetry && e.event === ChainEvent.start
      );
      const complete = result.events.find(
        (e) => e.kind === Kind.telemetry && e.event === ChainEvent.complete
      );
      expect(start).toBeDefined();
      expect(complete).toMatchObject(want.completeShape);
    }
    if (want.errorMessage) {
      expect(result.error?.message).toBe(want.errorMessage);
      const errorEvent = result.events.find(
        (e) => e.kind === Kind.telemetry && e.event === ChainEvent.error
      );
      expect(errorEvent).toMatchObject(want.errorEventShape);
    }
    if (want.tileEventShape) {
      const tileEvents = result.events.filter((e) => e.event === 'tile');
      expect(tileEvents).toHaveLength(1);
      expect(tileEvents[0]).toMatchObject(want.tileEventShape);
    }
  },
});

runTable({
  describe: 'mapDetail',
  examples: [
    { name: 'returns auto for undefined', inputs: { value: undefined }, want: { result: 'auto' } },
    { name: 'returns low for low', inputs: { value: 'low' }, want: { result: 'low' } },
    { name: 'returns high for high', inputs: { value: 'high' }, want: { result: 'high' } },
    { name: 'returns auto for ultra', inputs: { value: 'ultra' }, want: { result: 'auto' } },
    { name: 'returns auto for medium', inputs: { value: 'medium' }, want: { result: 'auto' } },
  ],
  process: ({ inputs }) => mapDetail(inputs.value),
  expects: ({ result, want }) => expect(result).toEqual(want.result),
});
