import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { resolveTexts } from '../../lib/instruction/index.js';
import retry from '../../lib/retry/index.js';
import socraticQuestionSchema from './socratic-question-schema.js';
import socraticAnswerSchema from './socratic-answer-schema.js';
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { DomainEvent, Outcome } from '../../lib/progress/constants.js';
import { nameStep, getOptions, withPolicy } from '../../lib/context/option.js';
import { expectString } from '../../lib/expect-shape/index.js';

const name = 'socratic';

// ===== Option Mappers =====

const DEFAULT_CHALLENGE = { challenge: undefined, temperature: 0.7 };

/**
 * Map challenge option to dialogue style + temperature coordination.
 * low: guided hints, lower temperature (predictable).
 * high: confronts weakest point, higher temperature (creative).
 * med: explicit normal mode — exploratory, default temperature.
 * @param {string|object|undefined} value
 * @returns {{ challenge: string|undefined, temperature: number }}
 */
export const mapChallenge = (value) => {
  if (value === undefined) return DEFAULT_CHALLENGE;
  if (typeof value === 'object') return value;
  return (
    {
      low: { challenge: 'low', temperature: 0.3 },
      med: DEFAULT_CHALLENGE,
      high: { challenge: 'high', temperature: 0.9 },
    }[value] ?? DEFAULT_CHALLENGE
  );
};

// Socratic method guidelines by challenge level
const CHALLENGE_GUIDELINES = {
  low: `Using the Socratic method, ask one short question that gently guides toward the answer with a helpful hint`,
  default: `Using the Socratic method, ask one short question that challenges assumptions`,
  high: `Using the Socratic method, ask one short, provocative question that directly confronts the weakest point in the reasoning`,
};

// Validate that the LLM produced a usable string. Without this, garbage
// (object/null/empty) propagates into history and renders as
// "Q: undefined\nA: undefined" in subsequent prompts.
const parseDialogueResponse = (response, kind) =>
  expectString(response, { chain: 'socratic', expected: `non-empty string from ${kind} LLM` });

// Prompt builders
const buildAskPrompt = (topic, historyText, challenge) =>
  `${historyText ? `${historyText}\n` : ''}${CHALLENGE_GUIDELINES[challenge] || CHALLENGE_GUIDELINES.default} about ${asXML(topic, { tag: 'topic' })}.`;

const buildAnswerPrompt = (question, historyText) => `${
  historyText ? `${historyText}\n` : ''
}Answer the question thoughtfully and briefly:
${asXML(question, { tag: 'question' })}`;

const defaultAsk = async ({
  topic,
  history = [],
  llm,
  temperature = 0.7,
  challenge,
  config,
  bundleContext = '',
} = {}) => {
  const historyText = history.map((turn) => `Q: ${turn.question}\nA: ${turn.answer}`).join('\n');
  const promptParts = [buildAskPrompt(topic, historyText, challenge), bundleContext];
  const prompt = promptParts.filter(Boolean).join('\n\n');

  const response = await retry(
    () =>
      callLlm(prompt, {
        ...config,
        llm,
        temperature,
        responseFormat: jsonSchema('socratic_question', socraticQuestionSchema),
      }),
    {
      label: 'socratic-ask',
      config,
      onProgress: scopePhase(config?.onProgress, 'ask'),
    }
  );

  return parseDialogueResponse(response, 'ask');
};

const defaultAnswer = async ({
  question,
  history = [],
  _topic,
  llm,
  temperature = 0.7,
  config,
  bundleContext = '',
} = {}) => {
  const historyText = history.map((turn) => `Q: ${turn.question}\nA: ${turn.answer}`).join('\n');
  const promptParts = [buildAnswerPrompt(question, historyText), bundleContext];
  const prompt = promptParts.filter(Boolean).join('\n\n');

  const response = await retry(
    () =>
      callLlm(prompt, {
        ...config,
        llm,
        temperature,
        responseFormat: jsonSchema('socratic_answer', socraticAnswerSchema),
      }),
    {
      label: 'socratic-answer',
      config,
      onProgress: scopePhase(config?.onProgress, 'answer'),
    }
  );

  return parseDialogueResponse(response, 'answer');
};

class SocraticMethod {
  static async create(statement, options = {}) {
    const { text: statementText, context: bundleContext } = resolveTexts(statement, []);
    const runConfig = nameStep(name, options);
    const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
    emitter.start();
    emitter.emit({ event: DomainEvent.input, value: statementText });
    const { challenge, temperature } = await getOptions(runConfig, {
      challenge: withPolicy(mapChallenge, ['challenge', 'temperature']),
    });
    return new SocraticMethod(
      statementText,
      { config: runConfig, emitter, bundleContext },
      {
        challenge,
        temperature,
      }
    );
  }

  constructor(statement, options = {}, resolved = {}) {
    // options may be { config, emitter } from create() or plain config (direct construction)
    const fromCreate = options.emitter && options.config;
    this.emitter = fromCreate ? options.emitter : undefined;
    this.bundleContext = fromCreate ? (options.bundleContext ?? '') : '';
    const opts = fromCreate ? options.config : options;

    const { ask = defaultAsk, answer = defaultAnswer, llm, abortSignal } = opts;
    this.statement = statement;
    this.ask = ask;
    this.answer = answer;
    this.llm = llm;
    this.config = opts;
    this.history = [];
    this.challenge =
      resolved.challenge ??
      (opts.challenge !== undefined ? mapChallenge(opts.challenge).challenge : undefined);
    this.temperature = resolved.temperature ?? opts.temperature ?? 0.7;
    if (!this.emitter) {
      // Direct construction path — create an emitter for result() emission
      const runConfig = nameStep(name, opts);
      this.config = runConfig;
      this.emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
    }
    this.abortSignal = abortSignal;
  }

  getDialogue() {
    return this.history;
  }

  async step() {
    const turnNumber = this.history.length + 1;

    this.emitter.emit({
      event: DomainEvent.step,
      stepName: 'asking-question',
      turnNumber,
      topic: this.statement,
    });

    const question = await this.ask({
      topic: this.statement,
      history: this.history,
      llm: this.llm,
      temperature: this.temperature,
      challenge: this.challenge,
      config: this.config,
      bundleContext: this.bundleContext,
    });

    this.emitter.emit({
      event: DomainEvent.step,
      stepName: 'answering-question',
      turnNumber,
      question,
    });

    const answer = await this.answer({
      question,
      history: this.history,
      topic: this.statement,
      llm: this.llm,
      temperature: this.temperature,
      config: this.config,
      bundleContext: this.bundleContext,
    });

    const turn = { question, answer };
    this.history.push(turn);

    return turn;
  }

  async run(depth = 3) {
    try {
      const roundDone = this.emitter.batch(depth);
      for (let i = 0; i < depth; i += 1) {
        this.emitter.emit({
          event: DomainEvent.phase,
          phase: `round-${i + 1}`,
          round: i + 1,
          totalRounds: depth,
        });

        // eslint-disable-next-line no-await-in-loop
        await this.step();
        roundDone(1);
      }

      this.emitter.emit({ event: DomainEvent.output, value: this.history });
      this.emitter.complete({ outcome: Outcome.success, turns: this.history.length });

      return this.history;
    } catch (err) {
      this.emitter.error(err);
      throw err;
    }
  }
}

export const socratic = (statement, options) => SocraticMethod.create(statement, options);

SocraticMethod.knownTexts = [];

export default SocraticMethod;
