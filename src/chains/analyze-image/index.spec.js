import { beforeEach, vi, expect } from 'vitest';
import { ChainEvent, Kind } from '../../lib/progress/constants.js';
import { runTable, equals } from '../../lib/examples-runner/index.js';

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

// ─── analyzeImage ─────────────────────────────────────────────────────────

const examples = [
  {
    name: 'accepts a single string path and calls imageToBase64 once',
    inputs: { images: '/photos/cat.png', instructions: 'describe this image' },
    check: ({ result }) => {
      expect(imageToBase64).toHaveBeenCalledTimes(1);
      expect(imageToBase64).toHaveBeenCalledWith('/photos/cat.png');
      expect(callLlm).toHaveBeenCalledTimes(1);
      expect(result).toBe('Analysis of the image content');
    },
  },
  {
    name: 'accepts an array of paths and calls imageToBase64 for each',
    inputs: { images: ['/photos/a.png', '/photos/b.png'], instructions: 'compare these' },
    check: () => {
      expect(imageToBase64).toHaveBeenCalledTimes(2);
      expect(imageToBase64).toHaveBeenCalledWith('/photos/a.png');
      expect(imageToBase64).toHaveBeenCalledWith('/photos/b.png');
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
    },
    check: () => {
      expect(imageToBase64).toHaveBeenCalledTimes(2);
      expect(imageToBase64).toHaveBeenCalledWith('/photos/before.png');
      expect(imageToBase64).toHaveBeenCalledWith('/photos/after.png');
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
    },
    check: () => {
      expect(tileImages).toHaveBeenCalledTimes(1);
      expect(tileImages).toHaveBeenCalledWith(['/photos/a.png', '/photos/b.png'], {
        labels: ['A', 'B'],
      });
      expect(imageToBase64).toHaveBeenCalledTimes(1);
      expect(imageToBase64).toHaveBeenCalledWith('/tmp/tile.jpg');
    },
  },
  {
    name: 'does not tile when tile is true but only one image is provided',
    inputs: {
      images: ['/photos/solo.png'],
      instructions: 'describe',
      options: { tile: true },
    },
    check: () => {
      expect(tileImages).not.toHaveBeenCalled();
      expect(imageToBase64).toHaveBeenCalledTimes(1);
      expect(imageToBase64).toHaveBeenCalledWith('/photos/solo.png');
    },
  },
  {
    name: 'passes instructions as the text content in the vision prompt',
    inputs: { images: '/photos/cat.png', instructions: 'count the whiskers' },
    check: () => {
      const contentArray = callLlm.mock.calls[0][0];
      const textEntry = contentArray.find((entry) => entry.type === 'text');
      expect(textEntry.text).toBe('count the whiskers');
    },
  },
  {
    name: 'passes runConfig to callLlm with operation path including analyze-image',
    inputs: {
      images: '/photos/cat.png',
      instructions: 'describe',
      options: { operation: 'parent' },
    },
    check: () => {
      const runConfig = callLlm.mock.calls[0][1];
      expect(runConfig.operation).toContain('analyze-image');
    },
  },
  {
    name: 'emits start and complete events via onProgress callback',
    inputs: { images: '/photos/cat.png', instructions: 'describe', withEvents: true },
    check: ({ result }) => {
      const start = result.events.find(
        (e) => e.kind === Kind.telemetry && e.event === ChainEvent.start
      );
      const complete = result.events.find(
        (e) => e.kind === Kind.telemetry && e.event === ChainEvent.complete
      );
      expect(start).toBeDefined();
      expect(complete).toMatchObject({ imageCount: 1, tiled: false });
    },
  },
  {
    name: 'emits error event on failure and rethrows',
    inputs: {
      images: '/photos/cat.png',
      instructions: 'describe',
      withEvents: true,
      tolerant: true,
      preMock: () => callLlm.mockRejectedValueOnce(new Error('vision model unavailable')),
    },
    check: ({ result }) => {
      expect(result.error?.message).toBe('vision model unavailable');
      const errorEvent = result.events.find(
        (e) => e.kind === Kind.telemetry && e.event === ChainEvent.error
      );
      expect(errorEvent).toMatchObject({ imageCount: 1 });
    },
  },
  {
    name: 'emits tile event with composite dimensions',
    inputs: {
      images: ['/photos/a.png', '/photos/b.png'],
      instructions: 'compare',
      options: { tile: true },
      withEvents: true,
    },
    check: ({ result }) => {
      const tileEvents = result.events.filter((e) => e.event === 'tile');
      expect(tileEvents).toHaveLength(1);
      expect(tileEvents[0]).toMatchObject({
        path: '/tmp/tile.jpg',
        width: 800,
        height: 600,
        sizeBytes: 12345,
      });
    },
  },
];

runTable({
  describe: 'analyze-image',
  examples,
  process: async ({ images, instructions, options, withEvents, tolerant, preMock }) => {
    if (preMock) preMock();
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
});

// ─── mapDetail ────────────────────────────────────────────────────────────

runTable({
  describe: 'mapDetail',
  examples: [
    { name: 'returns auto for undefined', inputs: { value: undefined }, check: equals('auto') },
    { name: 'returns low for low', inputs: { value: 'low' }, check: equals('low') },
    { name: 'returns high for high', inputs: { value: 'high' }, check: equals('high') },
    { name: 'returns auto for ultra', inputs: { value: 'ultra' }, check: equals('auto') },
    { name: 'returns auto for medium', inputs: { value: 'medium' }, check: equals('auto') },
  ],
  process: ({ value }) => mapDetail(value),
});
