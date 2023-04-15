export const norm = ([min, max], value) => (value - min) / (max - min);

export const lerp = ([min, max], norm) => (max - min) * norm + min;

export const scale = (source = [0, 1], dest = [0, 100], value) =>
  lerp(dest, norm(source, value));

export const clamp = ([min, max], value) => Math.min(Math.max(value, min), max);
