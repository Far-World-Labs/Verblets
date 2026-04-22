import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { nameStep, getOptions, withPolicy } from '../../lib/context/option.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { DomainEvent, Outcome } from '../../lib/progress/constants.js';
import { resolveArgs, resolveTexts } from '../../lib/instruction/index.js';
import argumentMapResultSchema from './argument-map-result.json' with { type: 'json' };

const name = 'argument-map';

const KNOWN_TEXTS = ['focus', 'perspective'];

const mapDepth = (value) => {
  if (value === undefined) return { claimLimit: 10, evidencePerClaim: 3 };
  if (typeof value === 'object') return value;
  return (
    {
      low: { claimLimit: 5, evidencePerClaim: 1 },
      high: { claimLimit: 20, evidencePerClaim: 5 },
    }[value] ?? { claimLimit: 10, evidencePerClaim: 3 }
  );
};

function createModelOptions() {
  return {
    responseFormat: jsonSchema('argument_map_result', argumentMapResultSchema),
  };
}

function buildPrompt(text, instructions, context, { claimLimit, evidencePerClaim }) {
  const parts = [
    `Analyze the following text and produce a structured argument map.`,
    `Identify the claims, evidence supporting each claim, and counterarguments that challenge the claims.`,
    '',
    `Guidelines:`,
    `- Extract up to ${claimLimit} primary claims`,
    `- For each claim, identify up to ${evidencePerClaim} pieces of supporting evidence`,
    `- Identify counterarguments where the text presents them or where they are logically implied`,
    `- Assign a unique id to each claim (e.g. "c1", "c2") and reference it in evidence and counterarguments`,
    `- Classify each claim type: factual, evaluative, causal, prescriptive, or definitional`,
    `- Classify each evidence type: empirical, logical, testimonial, analogical, or statistical`,
    `- Classify each counterargument type: rebuttal (directly contradicts), undercutter (weakens support), or alternative (offers different explanation)`,
    `- Rate confidence/strength as strong, moderate, or weak`,
  ];

  if (instructions) {
    parts.push('', `Additional instructions: ${instructions}`);
  }

  if (context) {
    parts.push('', context);
  }

  parts.push('', `<text>\n${text}\n</text>`);

  return parts.join('\n');
}

/**
 * Generate a structured argument map from text.
 *
 * @param {string} text - The text to analyze
 * @param {string|object} [instructions] - Analysis instructions or instruction object
 * @param {object} [config={}] - Configuration options
 * @param {string} [config.depth] - Analysis depth: 'low', 'high', or object { claimLimit, evidencePerClaim }
 * @param {object} [config.llm] - LLM configuration
 * @returns {Promise<{claims: object[], evidence: object[], counterarguments: object[]}>}
 */
async function argumentMap(text, instructions, config) {
  [instructions, config] = resolveArgs(instructions, config, KNOWN_TEXTS);
  const { text: instructionText, context } = resolveTexts(instructions, KNOWN_TEXTS);
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();

  try {
    const { claimLimit, evidencePerClaim } = await getOptions(runConfig, {
      depth: withPolicy(mapDepth, ['claimLimit', 'evidencePerClaim']),
    });

    const prompt = buildPrompt(text, instructionText, context, { claimLimit, evidencePerClaim });

    emitter.emit({ event: DomainEvent.input, value: text });

    const response = await retry(() => callLlm(prompt, { ...runConfig, ...createModelOptions() }), {
      label: 'argument-map-main',
      config: runConfig,
    });

    const result = {
      claims: Array.isArray(response?.claims) ? response.claims : [],
      evidence: Array.isArray(response?.evidence) ? response.evidence : [],
      counterarguments: Array.isArray(response?.counterarguments) ? response.counterarguments : [],
    };

    emitter.emit({ event: DomainEvent.output, value: result });
    emitter.complete({
      outcome: Outcome.success,
      claimCount: result.claims.length,
      evidenceCount: result.evidence.length,
      counterargumentCount: result.counterarguments.length,
    });

    return result;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

argumentMap.knownTexts = KNOWN_TEXTS;

export default argumentMap;
export { argumentMapResultSchema };
