import { beforeEach, vi, expect } from 'vitest';
import { ChainEvent, Kind } from '../../lib/progress/constants.js';
import { runTable } from '../../lib/examples-runner/index.js';

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

// ─── analyzeImage ──────────────────────────────────────────────────────

runTable({
  describe: 'analyze-image',
  examples: [
    {
      name: 'accepts a single string path and calls imageToBase64 once',
      inputs: {
        images: '/photos/cat.png',
        instructions: 'describe this image',
        wantToBase64Calls: 1,
        wantToBase64Args: ['/photos/cat.png'],
        wantLlmCalls: 1,
        wantValue: 'Analysis of the image content',
      },
    },
    {
      name: 'accepts an array of paths and calls imageToBase64 for each',
      inputs: {
        images: ['/photos/a.png', '/photos/b.png'],
        instructions: 'compare these',
        wantToBase64Calls: 2,
        wantToBase64ArgsAny: ['/photos/a.png', '/photos/b.png'],
      },
    },
    {
      name: 'accepts an array of { path, label } objects and normalizes correctly',
      inputs: {
        images: [
          { path: '/photos/before.png', label: 'Before' },
          { path: '/photos/after.png', label: 'After' },
        ],
        instructions: 'spot the differences',
        wantToBase64Calls: 2,
        wantToBase64ArgsAny: ['/photos/before.png', '/photos/after.png'],
      },
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
        wantTileCalls: 1,
        wantTileArgs: [['/photos/a.png', '/photos/b.png'], { labels: ['A', 'B'] }],
        wantToBase64Calls: 1,
        wantToBase64Args: ['/tmp/tile.jpg'],
      },
    },
    {
      name: 'does not tile when tile is true but only one image is provided',
      inputs: {
        images: ['/photos/solo.png'],
        instructions: 'describe',
        options: { tile: true },
        wantNoTile: true,
        wantToBase64Calls: 1,
        wantToBase64Args: ['/photos/solo.png'],
      },
    },
    {
      name: 'passes instructions as the text content in the vision prompt',
      inputs: {
        images: '/photos/cat.png',
        instructions: 'count the whiskers',
        wantTextEntry: 'count the whiskers',
      },
    },
    {
      name: 'passes runConfig to callLlm with operation path including analyze-image',
      inputs: {
        images: '/photos/cat.png',
        instructions: 'describe',
        options: { operation: 'parent' },
        wantOperationContains: 'analyze-image',
      },
    },
    {
      name: 'emits start and complete events via onProgress callback',
      inputs: {
        images: '/photos/cat.png',
        instructions: 'describe',
        withEvents: true,
        wantStartAndComplete: true,
        wantCompleteShape: { imageCount: 1, tiled: false },
      },
    },
    {
      name: 'emits error event on failure and rethrows',
      inputs: {
        images: '/photos/cat.png',
        instructions: 'describe',
        withEvents: true,
        tolerant: true,
        mock: () => callLlm.mockRejectedValueOnce(new Error('vision model unavailable')),
        wantErrorMessage: 'vision model unavailable',
        wantErrorEventShape: { imageCount: 1 },
      },
    },
    {
      name: 'emits tile event with composite dimensions',
      inputs: {
        images: ['/photos/a.png', '/photos/b.png'],
        instructions: 'compare',
        options: { tile: true },
        withEvents: true,
        wantTileEventShape: {
          path: '/tmp/tile.jpg',
          width: 800,
          height: 600,
          sizeBytes: 12345,
        },
      },
    },
  ],
  process: async ({ images, instructions, options, withEvents, tolerant, mock }) => {
    if (mock) mock();
    if (withEvents) {
      const events = [];
      let value;
      let error;
      try {
        value = await analyzeImage(images, instructions, {
          ...options,
          onProgress: (e) => events.push(e),
        });
      } catch (e) {
        if (!tolerant) throw e;
        error = e;
      }
      return { value, events, error };
    }
    return analyzeImage(images, instructions, options);
  },
  expects: ({ result, inputs }) => {
    if ('wantToBase64Calls' in inputs) {
      expect(imageToBase64).toHaveBeenCalledTimes(inputs.wantToBase64Calls);
    }
    if (inputs.wantToBase64Args) {
      expect(imageToBase64).toHaveBeenCalledWith(...inputs.wantToBase64Args);
    }
    if (inputs.wantToBase64ArgsAny) {
      for (const arg of inputs.wantToBase64ArgsAny) {
        expect(imageToBase64).toHaveBeenCalledWith(arg);
      }
    }
    if ('wantLlmCalls' in inputs) expect(callLlm).toHaveBeenCalledTimes(inputs.wantLlmCalls);
    if ('wantValue' in inputs) expect(result).toBe(inputs.wantValue);
    if ('wantTileCalls' in inputs) {
      expect(tileImages).toHaveBeenCalledTimes(inputs.wantTileCalls);
    }
    if (inputs.wantTileArgs) expect(tileImages).toHaveBeenCalledWith(...inputs.wantTileArgs);
    if (inputs.wantNoTile) expect(tileImages).not.toHaveBeenCalled();
    if (inputs.wantTextEntry) {
      const contentArray = callLlm.mock.calls[0][0];
      const textEntry = contentArray.find((entry) => entry.type === 'text');
      expect(textEntry.text).toBe(inputs.wantTextEntry);
    }
    if (inputs.wantOperationContains) {
      const runConfig = callLlm.mock.calls[0][1];
      expect(runConfig.operation).toContain(inputs.wantOperationContains);
    }
    if (inputs.wantStartAndComplete) {
      const start = result.events.find(
        (e) => e.kind === Kind.telemetry && e.event === ChainEvent.start
      );
      const complete = result.events.find(
        (e) => e.kind === Kind.telemetry && e.event === ChainEvent.complete
      );
      expect(start).toBeDefined();
      expect(complete).toMatchObject(inputs.wantCompleteShape);
    }
    if (inputs.wantErrorMessage) {
      expect(result.error?.message).toBe(inputs.wantErrorMessage);
      const errorEvent = result.events.find(
        (e) => e.kind === Kind.telemetry && e.event === ChainEvent.error
      );
      expect(errorEvent).toMatchObject(inputs.wantErrorEventShape);
    }
    if (inputs.wantTileEventShape) {
      const tileEvents = result.events.filter((e) => e.event === 'tile');
      expect(tileEvents).toHaveLength(1);
      expect(tileEvents[0]).toMatchObject(inputs.wantTileEventShape);
    }
  },
});

// ─── mapDetail ────────────────────────────────────────────────────────

runTable({
  describe: 'mapDetail',
  examples: [
    { name: 'returns auto for undefined', inputs: { value: undefined, want: 'auto' } },
    { name: 'returns low for low', inputs: { value: 'low', want: 'low' } },
    { name: 'returns high for high', inputs: { value: 'high', want: 'high' } },
    { name: 'returns auto for ultra', inputs: { value: 'ultra', want: 'auto' } },
    { name: 'returns auto for medium', inputs: { value: 'medium', want: 'auto' } },
  ],
  process: ({ value }) => mapDetail(value),
  expects: ({ result, inputs }) => expect(result).toEqual(inputs.want),
});
