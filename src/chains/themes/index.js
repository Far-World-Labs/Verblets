import bulkReduce from '../bulk-reduce/index.js';
import listReduce from '../../verblets/list-reduce/index.js';
import parseLLMList from '../../lib/parse-llm-list/index.js';

/**
 * Identify key themes from a long piece of text. The text is first split into
 * fragments which are processed in batches with `bulkReduce` to gather initial
 * theme candidates. The resulting list of themes is then condensed with a
 * second `listReduce` call to produce a final concise set.
 *
 * @param {string} text - input text to analyze
 * @param {object} [options]
 * @param {number} [options.chunkSize=8] - how many fragments per batch
 * @param {number} [options.maxThemes=5] - maximum number of final themes
 * @returns {Promise<string[]>} array of short theme descriptions
 */
export default async function themes(
  text,
  { chunkSize = 8, maxThemes = 5, sentenceMap = false, explain = false } = {}
) {
  const fragments = text
    .split(/\n{2,}|(?<=[.!?])\s+/)
    .map((f) => f.trim())
    .filter(Boolean);

  const initialThemes = await bulkReduce(
    fragments,
    'Add high-level themes from each item to the accumulator as a comma separated list. Avoid duplicates.',
    { chunkSize, initial: '' }
  );

  const themeCandidates = [
    ...new Set(
      initialThemes
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    ),
  ];

  const consolidated = await listReduce(
    '',
    themeCandidates,
    `Consolidate and normalize these themes into a short, unique list separated by commas. Limit to about ${maxThemes} items.`
  );

  const themesList = consolidated
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, maxThemes);

  let sentenceThemes;
  if (sentenceMap) {
    const sentences = [];
    const regex = /[^.!?]+[.!?]+|[^.!?]+$/g;
    let match;
    while ((match = regex.exec(text))) {
      const sentenceText = match[0].trim();
      if (!sentenceText) continue;
      sentences.push({ offset: match.index, sentenceText });
    }

    const mappingJson = await bulkReduce(
      sentences,
      `The accumulator is a JSON array. For each item provided as {offset, sentenceText},
append [offset, themes] to the array where "themes" lists any of the following:
${themesList.join(', ')}. Use an empty array if none apply.`,
      { chunkSize, initial: '[]' }
    );

    try {
      sentenceThemes = JSON.parse(mappingJson);
    } catch {
      // If JSON parsing fails, try to parse the response as a list of items
      const items = parseLLMList(mappingJson);
      sentenceThemes = items.map((item, index) => {
        try {
          // Try to parse each item as JSON
          const parsed = JSON.parse(item);
          if (Array.isArray(parsed) && parsed.length === 2) {
            return parsed;
          }
        } catch {
          // If parsing fails, try to extract offset and themes from the text
          const match = item.match(/\[(\d+),\s*\[(.*?)\]\]/);
          if (match) {
            const offset = parseInt(match[1], 10);
            const themes = match[2]
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean);
            return [offset, themes];
          }
        }
        // Fallback: use index as offset and empty themes array
        return [index, []];
      });
    }
  }

  if (sentenceMap || explain) {
    const result = { themes: themesList };
    if (sentenceMap) result.sentenceThemes = sentenceThemes;
    if (explain) {
      result.explanation = `Analyzed ${fragments.length} fragments to derive ${themesList.length} themes.`;
    }
    return result;
  }

  return themesList;
}
