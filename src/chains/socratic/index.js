import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import socraticQuestionSchema from './socratic-question-schema.js';
import socraticAnswerSchema from './socratic-answer-schema.js';
import {
  createLifecycleLogger,
  extractPromptAnalysis,
  extractResultValue,
} from '../../lib/lifecycle-logger/index.js';
import { emitStepProgress, track } from '../../lib/progress-callback/index.js';
import { nameStep, getOptions, withPolicy } from '../../lib/context/option.js';

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

// Prompt builders
const buildAskPrompt = (topic, historyText, challenge) =>
  `${historyText ? `${historyText}\n` : ''}${CHALLENGE_GUIDELINES[challenge] || CHALLENGE_GUIDELINES.default} about "${topic}".`;

const buildAnswerPrompt = (question, historyText) => `${
  historyText ? `${historyText}\n` : ''
}Answer the question thoughtfully and briefly:
"${question}"`;

//TODO:DOCS_OBSERVATIONS defaultAsk and defaultAnswer pass llm/temperature directly instead of through config — inconsistent with config-threading pattern used elsewhere
const defaultAsk = async ({
  topic,
  history = [],
  llm,
  logger,
  temperature = 0.7,
  challenge,
  config,
} = {}) => {
  const historyText = history.map((turn) => `Q: ${turn.question}\nA: ${turn.answer}`).join('\n');
  const prompt = buildAskPrompt(topic, historyText, challenge);

  logger?.logEvent('ask-prompt', extractPromptAnalysis(prompt));

  const response = await retry(
    () =>
      callLlm(prompt, {
        llm,
        temperature,
        response_format: jsonSchema('socratic_question', socraticQuestionSchema),
        logger,
      }),
    {
      label: 'socratic-ask',
      config,
    }
  );

  return response;
};

const defaultAnswer = async ({
  question,
  history = [],
  _topic,
  llm,
  logger,
  temperature = 0.7,
  config,
} = {}) => {
  const historyText = history.map((turn) => `Q: ${turn.question}\nA: ${turn.answer}`).join('\n');
  const prompt = buildAnswerPrompt(question, historyText);

  logger?.logEvent('answer-prompt', extractPromptAnalysis(prompt));

  const response = await retry(
    () =>
      callLlm(prompt, {
        llm,
        temperature,
        response_format: jsonSchema('socratic_answer', socraticAnswerSchema),
        logger,
      }),
    {
      label: 'socratic-answer',
      config,
    }
  );

  return response;
};

class SocraticMethod {
  static async create(statement, options = {}) {
    const runConfig = nameStep(name, options);
    const span = track(name, runConfig);
    const { challenge, temperature } = await getOptions(runConfig, {
      challenge: withPolicy(mapChallenge, ['challenge', 'temperature']),
    });
    return new SocraticMethod(
      statement,
      { config: runConfig, span },
      {
        challenge,
        temperature,
      }
    );
  }

  constructor(statement, options = {}, resolved = {}) {
    // options may be { config, span } from create() or plain config (direct construction)
    const fromCreate = options.span && options.config;
    this.span = fromCreate ? options.span : undefined;
    const opts = fromCreate ? options.config : options;

    const {
      ask = defaultAsk,
      answer = defaultAnswer,
      llm,
      logger,
      onProgress,
      abortSignal,
      now,
    } = opts;
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
    if (!this.span) {
      // Direct construction path — create a span for result() emission
      const runConfig = nameStep(name, opts);
      this.config = runConfig;
      this.span = track(name, runConfig);
    }
    this.onProgress = onProgress;
    this.abortSignal = abortSignal;
    this.now = now;
    this.logger = createLifecycleLogger(logger, 'chain:socratic');

    // Log construction
    this.logger.logStart({
      statement,
      hasCustomAsk: ask !== defaultAsk,
      hasCustomAnswer: answer !== defaultAnswer,
    });
  }

  getDialogue() {
    return this.history;
  }

  async step() {
    const turnNumber = this.history.length + 1;

    this.logger.logEvent('step-start', { turnNumber });

    emitStepProgress(this.onProgress, 'socratic', 'asking-question', {
      turnNumber,
      topic: this.statement,
      now: new Date(),
      chainStartTime: this.now,
    });

    // Log input (topic and history)
    this.logger.info({
      event: 'chain:socratic:input',
      value: {
        topic: this.statement,
        historyLength: this.history.length,
        history: this.history,
      },
    });

    const question = await this.ask({
      topic: this.statement,
      history: this.history,
      llm: this.llm,
      logger: this.logger,
      temperature: this.temperature,
      challenge: this.challenge,
      config: this.config,
    });

    // Log question as intermediate event
    this.logger.logEvent('question-generated', {
      value: question,
    });

    emitStepProgress(this.onProgress, 'socratic', 'answering-question', {
      turnNumber,
      question,
      now: new Date(),
      chainStartTime: this.now,
    });

    const answer = await this.answer({
      question,
      history: this.history,
      topic: this.statement,
      llm: this.llm,
      logger: this.logger,
      temperature: this.temperature,
      config: this.config,
    });

    const turn = { question, answer };
    this.history.push(turn);

    // Log output (the complete turn)
    this.logger.info({
      event: 'chain:socratic:output',
      value: turn,
    });

    this.logger.logEvent('step-complete', {
      turnNumber: this.history.length,
      question,
      answer,
    });

    return turn;
  }

  async run(depth = 3) {
    this.logger.logEvent('run-start', { depth });

    for (let i = 0; i < depth; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await this.step();
    }

    this.logger.logResult(this.history, extractResultValue(this.history, this.history));

    this.span.result();

    return this.history;
  }
}

export const socratic = async (statement, options) =>
  await SocraticMethod.create(statement, options);

export default SocraticMethod;
