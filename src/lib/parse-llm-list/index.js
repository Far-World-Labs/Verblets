/**
 * Parse a list of items from LLM response that could be JSON array or CSV format.
 * Handles common LLM response patterns and filters out invalid entries.
 *
 * @param {string} response - The LLM response string
 * @param {object} [options] - Parsing options
 * @param {string[]} [options.excludeValues=['none', 'null', 'undefined']] - Values to exclude (case-insensitive)
 * @param {boolean} [options.trimItems=true] - Whether to trim whitespace from items
 * @param {boolean} [options.filterEmpty=true] - Whether to filter out empty strings
 * @returns {string[]} Array of parsed items
 */
export default function parseLLMList(
  response,
  { excludeValues = ['none', 'null', 'undefined'], trimItems = true, filterEmpty = true } = {}
) {
  if (!response || typeof response !== 'string') {
    return [];
  }

  // Skip responses that contain notes or are empty arrays
  if (response === '[]' || response.includes('<note>')) {
    return [];
  }

  const items = [];

  try {
    const parsed = JSON.parse(response);
    if (Array.isArray(parsed)) {
      items.push(...parsed.filter((item) => typeof item === 'string'));
    }
  } catch {
    items.push(...response.split(','));
  }

  let processedItems = items;

  if (trimItems) {
    processedItems = processedItems.map((item) => item.trim());
  }

  if (filterEmpty) {
    processedItems = processedItems.filter(Boolean);
  }

  // Filter out excluded values (case-insensitive)
  const excludeSet = new Set(excludeValues.map((val) => val.toLowerCase()));
  processedItems = processedItems.filter((item) => !excludeSet.has(item.toLowerCase()));

  return processedItems;
}
