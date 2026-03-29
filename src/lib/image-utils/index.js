import sharp from 'sharp';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { isImageProcessingEnabled } from './state.js';

export { setImageProcessingEnabled } from './state.js';

const DISABLED_MESSAGE =
  'Image processing is disabled. Call init({ imageProcessing: true }) to enable.';

const FORMAT_TO_MIME = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  tiff: 'image/tiff',
  avif: 'image/avif',
  svg: 'image/svg+xml',
};

function assertEnabled() {
  if (!isImageProcessingEnabled()) {
    throw new Error(DISABLED_MESSAGE);
  }
}

function tempPath(format, outputDir) {
  return join(outputDir || tmpdir(), `verblets-img-${randomUUID()}.${format}`);
}

export async function resizeImage(
  inputPath,
  { width, height, quality = 80, format = 'jpeg', outputDir }
) {
  assertEnabled();

  const outputPath = tempPath(format, outputDir);
  const dimensions = { ...(width ? { width } : {}), ...(height ? { height } : {}) };
  const resized = sharp(inputPath).resize(dimensions).toFormat(format, { quality });
  await resized.toFile(outputPath);

  const metadata = await sharp(outputPath).metadata();
  const fileStat = await stat(outputPath);

  return {
    path: outputPath,
    width: metadata.width,
    height: metadata.height,
    sizeBytes: fileStat.size,
  };
}

export async function tileImages(
  inputPaths,
  { columns = 2, tileHeight = 300, gutter = 4, quality = 80, labels, outputDir } = {}
) {
  assertEnabled();

  const resizedBuffers = await Promise.all(
    inputPaths.map((p) =>
      sharp(p).resize({ height: tileHeight }).toBuffer({ resolveWithObject: true })
    )
  );

  const tiles = resizedBuffers.map((buf, i) => ({
    index: i,
    label: labels?.[i],
    w: buf.info.width,
    h: buf.info.height,
  }));

  const rows = Math.ceil(inputPaths.length / columns);

  const columnWidths = Array.from({ length: columns }, (_, col) => {
    const colTiles = tiles.filter((_, i) => i % columns === col);
    return colTiles.length > 0 ? Math.max(...colTiles.map((t) => t.w)) : 0;
  });

  const totalWidth = columnWidths.reduce((sum, w) => sum + w, 0) + gutter * (columns - 1);
  const totalHeight = rows * tileHeight + gutter * (rows - 1);

  const compositeInputs = [];

  for (let i = 0; i < tiles.length; i++) {
    const col = i % columns;
    const row = Math.floor(i / columns);
    const x = columnWidths.slice(0, col).reduce((sum, w) => sum + w, 0) + gutter * col;
    const y = row * (tileHeight + gutter);

    tiles[i].x = x;
    tiles[i].y = y;

    compositeInputs.push({ input: resizedBuffers[i].data, left: x, top: y });

    if (tiles[i].label) {
      const labelH = Math.min(24, tiles[i].h);
      const fontSize = Math.min(14, labelH - 2);
      const safeLabel = tiles[i].label
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
      const labelSvg = Buffer.from(
        `<svg width="${tiles[i].w}" height="${labelH}">
          <rect x="0" y="0" width="${tiles[i].w}" height="${labelH}" fill="rgba(0,0,0,0.6)"/>
          <text x="4" y="${labelH - 3}" font-family="sans-serif" font-size="${fontSize}" fill="white">${safeLabel}</text>
        </svg>`
      );
      compositeInputs.push({
        input: labelSvg,
        left: x,
        top: y + tiles[i].h - labelH,
      });
    }
  }

  const outputPath = tempPath('jpeg', outputDir);
  await sharp({
    create: {
      width: totalWidth,
      height: totalHeight,
      channels: 3,
      background: { r: 128, g: 128, b: 128 },
    },
  })
    .composite(compositeInputs)
    .jpeg({ quality })
    .toFile(outputPath);

  const fileStat = await stat(outputPath);

  return {
    path: outputPath,
    width: totalWidth,
    height: totalHeight,
    sizeBytes: fileStat.size,
    tiles,
  };
}

export { mapImageShrink } from './shrink.js';

export async function imageToBase64(filePath) {
  assertEnabled();

  const buffer = await readFile(filePath);
  const metadata = await sharp(buffer).metadata();
  const mediaType = FORMAT_TO_MIME[metadata.format];

  return {
    data: buffer.toString('base64'),
    mediaType,
  };
}
