import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import { constants as promptConstants } from '../../prompts/index.js';
import { nameStep } from '../../lib/context/option.js';
import { resolveTexts } from '../../lib/instruction/index.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { DomainEvent, Outcome } from '../../lib/progress/constants.js';
import { booleanSchema } from './schema.js';

const verbletName = 'bool';

const { asBool, asUndefinedByDefault, explainAndSeparate, explainAndSeparatePrimitive } =
  promptConstants;

export default async function bool(text, config = {}) {
  const { text: inputText, context } = resolveTexts(text, []);
  const effectiveText = context ? `${inputText}\n\n${context}` : inputText;
  const runConfig = nameStep(verbletName, config);
  const emitter = createProgressEmitter(verbletName, runConfig.onProgress, runConfig);
  emitter.start();
  emitter.emit({ event: DomainEvent.input, value: effectiveText });

  const systemPrompt = `${explainAndSeparate} ${explainAndSeparatePrimitive}

${asBool} ${asUndefinedByDefault}

The value should be "true", "false", or "undefined".`;

  try {
    const response = await callLlm(effectiveText, {
      ...runConfig,
      systemPrompt,
      responseFormat: jsonSchema('boolean_evaluation', booleanSchema),
    });

    // Interpret response
    const interpreted = response === 'true' ? true : response === 'false' ? false : undefined;

    emitter.emit({ event: DomainEvent.output, value: interpreted });
    emitter.complete({ outcome: Outcome.success });

    return interpreted;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

bool.knownTexts = [];
