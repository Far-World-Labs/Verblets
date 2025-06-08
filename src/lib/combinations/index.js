export default function combinations(items, size = 2) {
  const result = [];
  if (!Array.isArray(items) || size < 1) return result;

  const combo = [];
  const generate = (start) => {
    if (combo.length === size) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i < items.length; i++) {
      combo.push(items[i]);
      generate(i + 1);
      combo.pop();
    }
  };

  generate(0);
  return result;
}

export function rangeCombinations(items, minSize = 2, maxSize = items.length) {
  const sets = [];
  if (!Array.isArray(items)) return sets;
  const upper = Math.min(items.length, maxSize);
  for (let s = minSize; s <= upper; s++) {
    sets.push(...combinations(items, s));
  }
  return sets;
}
