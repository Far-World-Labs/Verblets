import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChainEvent, Kind } from '../../lib/progress/constants.js';

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

vi.mock('../../lib/retry/index.js', () => ({
  default: vi.fn((fn) => fn()),
}));

import analyzeImage, { mapDetail } from './index.js';
import callLlm from '../../lib/llm/index.js';
import { imageToBase64, tileImages } from '../../lib/image-utils/index.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('analyze-image', () => {
  it('accepts a single string path and calls imageToBase64 once', async () => {
    const result = await analyzeImage('/photos/cat.png', 'describe this image');

    expect(imageToBase64).toHaveBeenCalledTimes(1);
    expect(imageToBase64).toHaveBeenCalledWith('/photos/cat.png');
    expect(callLlm).toHaveBeenCalledTimes(1);
    expect(result).toBe('Analysis of the image content');
  });

  it('accepts an array of paths and calls imageToBase64 for each', async () => {
    await analyzeImage(['/photos/a.png', '/photos/b.png'], 'compare these');

    expect(imageToBase64).toHaveBeenCalledTimes(2);
    expect(imageToBase64).toHaveBeenCalledWith('/photos/a.png');
    expect(imageToBase64).toHaveBeenCalledWith('/photos/b.png');
  });

  it('accepts an array of { path, label } objects and normalizes correctly', async () => {
    const images = [
      { path: '/photos/before.png', label: 'Before' },
      { path: '/photos/after.png', label: 'After' },
    ];
    await analyzeImage(images, 'spot the differences');

    expect(imageToBase64).toHaveBeenCalledTimes(2);
    expect(imageToBase64).toHaveBeenCalledWith('/photos/before.png');
    expect(imageToBase64).toHaveBeenCalledWith('/photos/after.png');
  });

  it('tiles multiple images when tile option is true', async () => {
    await analyzeImage(
      [
        { path: '/photos/a.png', label: 'A' },
        { path: '/photos/b.png', label: 'B' },
      ],
      'compare',
      { tile: true }
    );

    expect(tileImages).toHaveBeenCalledTimes(1);
    expect(tileImages).toHaveBeenCalledWith(['/photos/a.png', '/photos/b.png'], {
      labels: ['A', 'B'],
    });
    // imageToBase64 called once for the tile composite, not per-image
    expect(imageToBase64).toHaveBeenCalledTimes(1);
    expect(imageToBase64).toHaveBeenCalledWith('/tmp/tile.jpg');
  });

  it('does not tile when tile is true but only one image is provided', async () => {
    await analyzeImage(['/photos/solo.png'], 'describe', { tile: true });

    expect(tileImages).not.toHaveBeenCalled();
    expect(imageToBase64).toHaveBeenCalledTimes(1);
    expect(imageToBase64).toHaveBeenCalledWith('/photos/solo.png');
  });

  it('passes instructions as the text content in the vision prompt', async () => {
    await analyzeImage('/photos/cat.png', 'count the whiskers');

    const contentArray = callLlm.mock.calls[0][0];
    const textEntry = contentArray.find((entry) => entry.type === 'text');
    expect(textEntry.text).toBe('count the whiskers');
  });

  it('passes runConfig to callLlm with operation path including analyze-image', async () => {
    await analyzeImage('/photos/cat.png', 'describe', { operation: 'parent' });

    const runConfig = callLlm.mock.calls[0][1];
    expect(runConfig.operation).toContain('analyze-image');
  });

  it('emits start and complete events via onProgress callback', async () => {
    const progressEvents = [];
    const onProgress = (event) => progressEvents.push(event);

    await analyzeImage('/photos/cat.png', 'describe', { onProgress });

    const startEvent = progressEvents.find(
      (e) => e.kind === Kind.telemetry && e.event === ChainEvent.start
    );
    const completeEvent = progressEvents.find(
      (e) => e.kind === Kind.telemetry && e.event === ChainEvent.complete
    );
    expect(startEvent).toBeDefined();
    expect(completeEvent).toBeDefined();
    expect(completeEvent.imageCount).toBe(1);
    expect(completeEvent.tiled).toBe(false);
  });

  it('emits error event on failure and rethrows', async () => {
    const llmError = new Error('vision model unavailable');
    callLlm.mockRejectedValueOnce(llmError);

    const progressEvents = [];
    const onProgress = (event) => progressEvents.push(event);

    await expect(analyzeImage('/photos/cat.png', 'describe', { onProgress })).rejects.toThrow(
      'vision model unavailable'
    );

    const errorEvent = progressEvents.find(
      (e) => e.kind === Kind.telemetry && e.event === ChainEvent.error
    );
    expect(errorEvent).toBeDefined();
    expect(errorEvent.imageCount).toBe(1);
  });

  it('emits tile event with composite dimensions', async () => {
    const events = [];
    await analyzeImage(['/photos/a.png', '/photos/b.png'], 'compare', {
      tile: true,
      onProgress: (e) => events.push(e),
    });

    const tileEvents = events.filter((e) => e.event === 'tile');
    expect(tileEvents).toHaveLength(1);
    expect(tileEvents[0]).toMatchObject({
      path: '/tmp/tile.jpg',
      width: 800,
      height: 600,
      sizeBytes: 12345,
    });
  });

  describe('mapDetail', () => {
    it('returns auto for undefined', () => {
      expect(mapDetail(undefined)).toBe('auto');
    });

    it('returns low for low', () => {
      expect(mapDetail('low')).toBe('low');
    });

    it('returns high for high', () => {
      expect(mapDetail('high')).toBe('high');
    });

    it('returns auto for unrecognized values', () => {
      expect(mapDetail('ultra')).toBe('auto');
      expect(mapDetail('medium')).toBe('auto');
    });
  });
});
