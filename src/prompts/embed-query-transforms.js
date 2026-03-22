export const rewriteQuery = (query) =>
  `Rewrite the following search query to be clearer and more specific. Expand abbreviations, clarify ambiguous terms, and add relevant keywords that would help retrieve better results. Return only the rewritten query — no preamble.\n\nQuery: ${query}`;

export const multiQuery = (query, count = 3, { divergenceGuidance } = {}) =>
  `Generate ${count} diverse search queries that would help find information related to the following query. Each variant should approach the topic from a different angle or use different terminology.${divergenceGuidance ? `\n\n${divergenceGuidance}` : ''} Return only the queries.\n\nOriginal query: ${query}`;

export const stepBack = (query, count = 3, { abstractionGuidance } = {}) =>
  `Given the following specific query, generate ${count} broader, more fundamental questions that would help retrieve useful background context. Step back from the specifics to the underlying concepts and principles.${abstractionGuidance ? `\n\n${abstractionGuidance}` : ''} Return only the questions.\n\nQuery: ${query}`;

export const decomposeQuery = (query, { granularityGuidance } = {}) =>
  `Break the following complex query into simpler, atomic sub-questions that can each be answered independently. Each sub-question should target a single piece of information needed to fully answer the original query.${granularityGuidance ? `\n\n${granularityGuidance}` : ''} Return only the sub-questions.\n\nQuery: ${query}`;

export const hydeOutputDoc = (query) =>
  `Given this search query, write a short passage (2-4 sentences) that would be a good answer or matching document. Write it in the style and vocabulary of actual source documents. Return only the passage.\n\nQuery: ${query}`;
