// Pure utility functions — named, composable, non-mutating.
// Curried where it supports natural dataflow composition.

export const last = (arr) => arr.at(-1);

export const omit = (keys) => (obj) => {
  const keySet = keys instanceof Set ? keys : new Set(keys);
  return Object.fromEntries(Object.entries(obj).filter(([k]) => !keySet.has(k)));
};

export const chunk = (size) => (arr) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );

export const unionBy = (keyFn) => (existing, incoming) => {
  const seen = new Set(existing.map(keyFn));
  const novel = incoming.filter((item) => !seen.has(keyFn(item)));
  return [...existing, ...novel];
};
