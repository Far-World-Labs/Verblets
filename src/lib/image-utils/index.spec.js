import { describe, it, expect, afterEach, afterAll } from 'vitest';
import { unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { isImageProcessingEnabled, setImageProcessingEnabled } from './state.js';

const tempFiles = [];

function trackTemp(path) {
  tempFiles.push(path);
  return path;
}

let sharp;
let sharpAvailable = false;
try {
  sharp = (await import('sharp')).default;
  sharpAvailable = true;
} catch {
  // sharp not installed — conditional tests will be skipped
}

afterEach(() => {
  setImageProcessingEnabled(false);
});

afterAll(async () => {
  await Promise.all(tempFiles.map((f) => unlink(f).catch(() => undefined)));
});

async function createTinyPng() {
  const buffer = await sharp({
    create: { width: 10, height: 10, channels: 3, background: { r: 255, g: 0, b: 0 } },
  })
    .png()
    .toBuffer();
  const path = join(tmpdir(), `verblets-test-${randomUUID()}.png`);
  await writeFile(path, buffer);
  trackTemp(path);
  return path;
}

describe('mapImageShrink', () => {
  it('returns undefined for undefined (no shrink)', async () => {
    const { mapImageShrink } = await import('./index.js');
    expect(mapImageShrink(undefined)).toBeUndefined();
  });

  it('returns 300px width for low', async () => {
    const { mapImageShrink } = await import('./index.js');
    expect(mapImageShrink('low')).toEqual({ width: 300, quality: 60, format: 'jpeg' });
  });

  it('returns 100px width for med', async () => {
    const { mapImageShrink } = await import('./index.js');
    expect(mapImageShrink('med')).toEqual({ width: 100, quality: 60, format: 'jpeg' });
  });

  it('returns 50px width for high', async () => {
    const { mapImageShrink } = await import('./index.js');
    expect(mapImageShrink('high')).toEqual({ width: 50, quality: 60, format: 'jpeg' });
  });

  it('returns undefined for unrecognized values', async () => {
    const { mapImageShrink } = await import('./index.js');
    expect(mapImageShrink('ultra')).toBeUndefined();
  });
});

describe('image-utils state', () => {
  it('starts disabled', () => {
    expect(isImageProcessingEnabled()).toBe(false);
  });

  it('can be enabled and disabled', () => {
    setImageProcessingEnabled(true);
    expect(isImageProcessingEnabled()).toBe(true);

    setImageProcessingEnabled(false);
    expect(isImageProcessingEnabled()).toBe(false);
  });
});

describe('image-utils gating', () => {
  it('resizeImage throws when not enabled', async () => {
    const { resizeImage } = await import('./index.js');
    await expect(resizeImage('/tmp/fake.png', { height: 100 })).rejects.toThrow(
      'Image processing is disabled'
    );
  });

  it('tileImages throws when not enabled', async () => {
    const { tileImages } = await import('./index.js');
    await expect(tileImages(['/tmp/fake.png'], {})).rejects.toThrow('Image processing is disabled');
  });

  it('imageToBase64 throws when not enabled', async () => {
    const { imageToBase64 } = await import('./index.js');
    await expect(imageToBase64('/tmp/fake.png')).rejects.toThrow('Image processing is disabled');
  });
});

describe.skipIf(!sharpAvailable)('imageToBase64', () => {
  it('reads a PNG and returns base64 with correct media type', async () => {
    const { imageToBase64 } = await import('./index.js');
    setImageProcessingEnabled(true);

    const pngPath = await createTinyPng();
    const result = await imageToBase64(pngPath);

    expect(result.mediaType).toBe('image/png');
    expect(typeof result.data).toBe('string');
    expect(result.data.length).toBeGreaterThan(0);

    const roundTrip = Buffer.from(result.data, 'base64');
    const metadata = await sharp(roundTrip).metadata();
    expect(metadata.format).toBe('png');
    expect(metadata.width).toBe(10);
    expect(metadata.height).toBe(10);
  });
});

describe.skipIf(!sharpAvailable)('resizeImage', () => {
  it('resizes a PNG to target height and returns metadata', async () => {
    const { resizeImage } = await import('./index.js');
    setImageProcessingEnabled(true);

    const pngPath = await createTinyPng();
    const result = await resizeImage(pngPath, { height: 5, format: 'png', quality: 90 });
    trackTemp(result.path);

    expect(result.height).toBe(5);
    expect(result.width).toBe(5);
    expect(result.sizeBytes).toBeGreaterThan(0);
    expect(result.path).toContain('verblets-img-');
  });

  it('resizes a PNG to target width, preserving aspect ratio', async () => {
    const { resizeImage } = await import('./index.js');
    setImageProcessingEnabled(true);

    const pngPath = await createTinyPng();
    const result = await resizeImage(pngPath, { width: 5, format: 'png', quality: 90 });
    trackTemp(result.path);

    expect(result.width).toBe(5);
    expect(result.height).toBe(5);
  });
});

describe.skipIf(!sharpAvailable)('tileImages', () => {
  it('tiles two images and returns grid metadata', async () => {
    const { tileImages } = await import('./index.js');
    setImageProcessingEnabled(true);

    const png1 = await createTinyPng();
    const png2 = await createTinyPng();
    const result = await tileImages([png1, png2], {
      columns: 2,
      tileHeight: 10,
      gutter: 2,
      labels: ['A', 'B'],
    });
    trackTemp(result.path);

    expect(result.sizeBytes).toBeGreaterThan(0);
    expect(result.tiles).toHaveLength(2);
    expect(result.tiles[0].label).toBe('A');
    expect(result.tiles[1].label).toBe('B');
    expect(result.tiles[0].x).toBe(0);
    expect(result.tiles[1].x).toBeGreaterThan(0);
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBe(10);
  });

  it('tiles without labels', async () => {
    const { tileImages } = await import('./index.js');
    setImageProcessingEnabled(true);

    const png1 = await createTinyPng();
    const result = await tileImages([png1], { columns: 1, tileHeight: 10 });
    trackTemp(result.path);

    expect(result.tiles).toHaveLength(1);
    expect(result.tiles[0].label).toBeUndefined();
  });
});
