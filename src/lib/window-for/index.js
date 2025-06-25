/**
 * Create overlapping windows over a list for equal context exposure.
 * Each window contains a subset of items with configurable overlap between windows.
 *
 * @param {Array} list - The list to create windows from
 * @param {number} windowSize - Size of each window (default: 5)
 * @param {number} overlapPercent - Percentage of overlap between windows (default: 50)
 * @returns {Array} Array of window objects with fragments, startIndex, and endIndex
 */
export default function windowFor(list, windowSize = 5, overlapPercent = 50) {
  if (list.length === 0) return [];

  const windows = [];
  const step = Math.max(1, Math.floor(windowSize * (1 - overlapPercent / 100)));

  for (let i = 0; i < list.length; i += step) {
    const windowEnd = Math.min(i + windowSize, list.length);
    const windowFragments = list.slice(i, windowEnd);

    windows.push({
      fragments: windowFragments,
      startIndex: i,
      endIndex: windowEnd - 1,
    });

    if (windowEnd >= list.length) break;
  }

  return windows;
}
