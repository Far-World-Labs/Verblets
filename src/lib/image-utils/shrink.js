const SHRINK_QUALITY = 60;

/**
 * Map imageShrink dial to Sharp resize options.
 * Width-based, aspect-ratio-preserving compression presets.
 * @param {string|undefined} value - 'low' | 'med' | 'high' | undefined
 * @returns {object|undefined} Sharp resize options or undefined (no shrink)
 */
export const mapImageShrink = (value) =>
  ({
    low: { width: 300, quality: SHRINK_QUALITY, format: 'jpeg' },
    med: { width: 100, quality: SHRINK_QUALITY, format: 'jpeg' },
    high: { width: 50, quality: SHRINK_QUALITY, format: 'jpeg' },
  })[value];
