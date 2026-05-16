import list from '../list/index.js';
import score from '../score/index.js';
import { nameStep, getOptions } from '../../lib/context/option.js';
import { resolveTexts } from '../../lib/instruction/index.js';
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { DomainEvent, Outcome, ErrorPosture } from '../../lib/progress/constants.js';
import parallelBatch from '../../lib/parallel-batch/index.js';

const name = 'collect-terms';

const splitIntoChunks = (text, maxLen) => {
  const words = text.split(/\s+/);
  const chunks = [];
  let current = '';
  for (const word of words) {
    if (current.length + word.length + 1 > maxLen) {
      if (current) chunks.push(current.trim());
      current = word;
    } else {
      current += (current ? ' ' : '') + word;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
};

export default async function collectTerms(text, config = {}) {
  const { text: sourceText, known, context } = resolveTexts(text, ['uniqueTerms']);
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  const { topN, chunkLen } = await getOptions(runConfig, {
    topN: 20,
    chunkLen: 1000,
  });

  try {
    let uniqueTerms;
    let chunkFailures = 0;

    if (known.uniqueTerms !== undefined) {
      if (typeof known.uniqueTerms !== 'string') {
        throw new Error(
          `collect-terms: known.uniqueTerms must be a comma-separated string (got ${typeof known.uniqueTerms})`
        );
      }
      uniqueTerms = known.uniqueTerms
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
    } else {
      if (typeof sourceText !== 'string') {
        throw new Error(
          `collect-terms: text must be a string (got ${
            sourceText === null ? 'null' : typeof sourceText
          })`
        );
      }
      const chunks = splitIntoChunks(sourceText, chunkLen);

      if (chunks.length === 0) {
        emitter.complete({ outcome: Outcome.success, terms: 0 });
        return [];
      }

      const batchDone = emitter.batch(chunks.length);

      // Collect terms from each chunk
      const chunkResults = await parallelBatch(
        chunks,
        async (chunk) => {
          const contextBlock = context ? `\n\n${context}` : '';
          const terms = await list(
            `key words and phrases that would help find documents about: ${chunk}${contextBlock}`,
            { ...runConfig, onProgress: scopePhase(runConfig.onProgress, 'list:extract') }
          );
          batchDone(1);
          return terms;
        },
        {
          maxParallel: 3,
          errorPosture: ErrorPosture.resilient,
          abortSignal: runConfig.abortSignal,
          label: 'collect-terms:extract',
        }
      );

      // Distinguish failed extractions (undefined under resilient) from
      // legitimately-empty (chunk had no terms). Total failure throws.
      chunkFailures = chunkResults.filter((r) => r === undefined).length;
      if (chunkFailures === chunkResults.length && chunkResults.length > 0) {
        throw new Error(`collect-terms: all ${chunkResults.length} chunks failed term extraction`);
      }

      const allTerms = chunkResults
        .filter((r) => Array.isArray(r))
        .flat()
        .filter((t) => typeof t === 'string');

      uniqueTerms = Array.from(new Set(allTerms.map((t) => t.trim()))).filter(Boolean);
    }

    emitter.emit({ event: DomainEvent.phase, phase: 'extracted', uniqueTerms });

    // If we already have fewer terms than requested, return them all
    if (uniqueTerms.length <= topN) {
      emitter.complete({
        outcome: chunkFailures > 0 ? Outcome.partial : Outcome.success,
        terms: uniqueTerms.length,
        chunkFailures,
      });
      return uniqueTerms;
    }

    // Score each term by relevance to the full text context
    const scores = await score(
      uniqueTerms,
      `relevance as a search term for finding information (1-10, higher is more important)`,
      { ...runConfig, onProgress: scopePhase(runConfig.onProgress, 'score:rank') }
    );

    // Drop terms with failed scores rather than fabricating zero (which would
    // rank them at the bottom and pretend they were judged). Throw on total
    // score failure since we have no ranking basis.
    const ranked = uniqueTerms
      .map((term, i) => ({ term, score: scores[i] }))
      .filter((s) => typeof s.score === 'number');

    if (ranked.length === 0) {
      throw new Error(
        `collect-terms: all ${uniqueTerms.length} term scores failed — no ranking basis`
      );
    }

    const sorted = ranked.toSorted((a, b) => b.score - a.score);
    emitter.emit({ event: DomainEvent.phase, phase: 'scored', termsWithScores: sorted });

    const scoreFailures = uniqueTerms.length - ranked.length;
    const hasFailures = chunkFailures > 0 || scoreFailures > 0;
    emitter.complete({
      outcome: hasFailures ? Outcome.partial : Outcome.success,
      terms: Math.min(ranked.length, topN),
      chunkFailures,
      scoreFailures,
    });

    return sorted.slice(0, topN).map((item) => item.term);
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

collectTerms.knownTexts = ['uniqueTerms'];
