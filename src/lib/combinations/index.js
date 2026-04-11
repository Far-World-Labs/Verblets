export default function combinations(items, size = 2) {
  const result = [];
  if (!Array.isArray(items) || size < 1) return result;

  const generate = (start, current) => {
    if (current.length === size) {
      result.push(current);
      return;
    }
    for (let i = start; i < items.length; i++) {
      generate(i + 1, [...current, items[i]]);
    }
  };

  generate(0, []);
  return result;
}

export function rangeCombinations(items, minSize = 2, maxSize) {
  const sets = [];
  if (!Array.isArray(items)) return sets;
  const upper = Math.min(items.length, maxSize ?? items.length);
  for (let s = minSize; s <= upper; s++) {
    sets.push(...combinations(items, s));
  }
  return sets;
}
