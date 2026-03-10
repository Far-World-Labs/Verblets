// Pure utility functions — named, composable, non-mutating.
// Curried where it supports natural dataflow composition.

export const last = (arr) => arr.at(-1);

export const compact = (arr) => arr.filter((x) => x != null);

export const pick = (keys) => (obj) => {
  const keySet = keys instanceof Set ? keys : new Set(keys);
  return Object.fromEntries(Object.entries(obj).filter(([k]) => keySet.has(k)));
};

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

export const zipWith = (fn) => (a, b) => a.map((item, i) => fn(item, b[i], i));

// Dot product of two normalized Float32Array vectors (= cosine similarity when pre-normalized)
export const cosineSimilarity = (a, b) => {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
};

// Search a corpus of { vector, ...metadata } objects, returning top-K by cosine similarity
export const vectorSearch = (queryVector, corpus, { topK = 5 } = {}) =>
  corpus
    .map((item) => ({ ...item, score: cosineSimilarity(queryVector, item.vector) }))
    .toSorted((a, b) => b.score - a.score)
    .slice(0, topK);
