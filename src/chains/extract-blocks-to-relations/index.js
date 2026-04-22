import extractBlocks from '../extract-blocks/index.js';
import extractRelations, { relationSpec } from '../relations/index.js';
import { nameStep, getOptions, withPolicy } from '../../lib/context/option.js';
import { resolveArgs, resolveTexts } from '../../lib/instruction/index.js';
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { DomainEvent, Outcome, ErrorPosture } from '../../lib/progress/constants.js';
import parallelBatch from '../../lib/parallel-batch/index.js';

const name = 'extract-blocks-to-relations';

/**
 * Map thoroughness to block extraction and relation processing posture.
 * low: process blocks independently, no shared spec.
 * high: generate a shared relation spec from instructions, apply to all blocks.
 * Default: shared spec.
 * @param {string|object|undefined} value
 * @returns {{ sharedSpec: boolean, maxParallel: number }}
 */
export const mapThoroughness = (value) => {
  if (value === undefined) return { sharedSpec: true, maxParallel: 3 };
  if (typeof value === 'object') return value;
  return (
    {
      low: { sharedSpec: false, maxParallel: 5 },
      med: { sharedSpec: true, maxParallel: 3 },
      high: { sharedSpec: true, maxParallel: 2 },
    }[value] ?? { sharedSpec: true, maxParallel: 3 }
  );
};

/**
 * Extract text blocks then extract relations from each block.
 *
 * Calls extractBlocks to segment text into blocks, optionally generates a shared
 * relation spec, then calls extractRelations on each block to produce structured
 * relation triples.
 *
 * @param {string} text - The full text to process
 * @param {string|object} instructions - Instructions for both block extraction and relation extraction.
 *   Known keys: `blockInstructions` (override block extraction instructions),
 *   `relationInstructions` (override relation extraction instructions), `spec` (pre-built relation spec).
 * @param {Object} config - Configuration options
 * @returns {Promise<Array<{ block: string[], relations: Array<{ subject: string, predicate: string, object: * }> }>>}
 */
export default async function extractBlocksToRelations(text, instructions, config) {
  [instructions, config] = resolveArgs(instructions, config, [
    'blockInstructions',
    'relationInstructions',
    'spec',
  ]);
  const {
    text: instructionText,
    known,
    context,
  } = resolveTexts(instructions, ['blockInstructions', 'relationInstructions', 'spec']);

  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  emitter.emit({ event: DomainEvent.input, value: text });

  const { sharedSpec, maxParallel } = await getOptions(runConfig, {
    thoroughness: withPolicy(mapThoroughness, ['sharedSpec', 'maxParallel']),
  });

  try {
    const effectiveInstructions = context ? `${instructionText}\n\n${context}` : instructionText;
    const blockInstr = known.blockInstructions ?? effectiveInstructions;
    const relationInstr = known.relationInstructions ?? effectiveInstructions;

    emitter.emit({ event: DomainEvent.phase, phase: 'extracting-blocks' });

    const blocks = await extractBlocks(text, blockInstr, {
      ...runConfig,
      onProgress: scopePhase(runConfig.onProgress, 'extract-blocks'),
    });

    if (blocks.length === 0) {
      emitter.complete({ blocksFound: 0, totalRelations: 0, outcome: Outcome.success });
      return [];
    }

    emitter.emit({
      event: DomainEvent.phase,
      phase: 'extracting-relations',
      blockCount: blocks.length,
    });

    let spec = known.spec;
    if (!spec && sharedSpec) {
      spec = await relationSpec(relationInstr, {
        ...runConfig,
        onProgress: scopePhase(runConfig.onProgress, 'relation-spec'),
      });
    }

    const batchDone = emitter.batch(blocks.length);

    const results = await parallelBatch(
      blocks,
      async (block) => {
        const blockText = block.join('\n');
        const instrBundle = spec ? { text: relationInstr, spec } : relationInstr;
        const relations = await extractRelations(blockText, instrBundle, {
          ...runConfig,
          onProgress: scopePhase(runConfig.onProgress, 'relations'),
        });
        batchDone(1);
        return { block, relations };
      },
      {
        maxParallel,
        errorPosture: ErrorPosture.resilient,
        abortSignal: runConfig.abortSignal,
        label: 'extract-blocks-to-relations:apply',
      }
    );

    const validResults = results.filter(Boolean);
    const totalRelations = validResults.reduce((sum, r) => sum + r.relations.length, 0);

    emitter.emit({ event: DomainEvent.output, value: validResults });
    emitter.complete({ blocksFound: blocks.length, totalRelations, outcome: Outcome.success });

    return validResults;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

extractBlocksToRelations.knownTexts = ['blockInstructions', 'relationInstructions', 'spec'];
