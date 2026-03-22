export const rewriteQuery = (query) =>
  `Rewrite the following search query to be clearer and more specific. Expand abbreviations, clarify ambiguous terms, and add relevant keywords that would help retrieve better results. Return only the rewritten query — no preamble.\n\nQuery: ${query}`;

export const multiQuery = (query, count = 3) =>
  `Generate ${count} diverse search queries that would help find information related to the following query. Each variant should approach the topic from a different angle or use different terminology. Return only the queries.\n\nOriginal query: ${query}`;

export const stepBack = (query, count = 3) =>
  `Given the following specific query, generate ${count} broader, more fundamental questions that would help retrieve useful background context. Step back from the specifics to the underlying concepts and principles. Return only the questions.\n\nQuery: ${query}`;

export const decomposeQuery = (query) =>
  `Break the following complex query into simpler, atomic sub-questions that can each be answered independently. Each sub-question should target a single piece of information needed to fully answer the original query. Return only the sub-questions.\n\nQuery: ${query}`;
