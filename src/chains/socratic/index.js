import chatGPT from '../../lib/chatgpt/index.js';
import retry from '../../lib/retry/index.js';
import modelService from '../../services/llm-model/index.js';
import socraticQuestionSchema from './socratic-question-schema.js';
import socraticAnswerSchema from './socratic-answer-schema.js';
import {
  createLifecycleLogger,
  extractPromptAnalysis,
  extractResultValue,
} from '../../lib/lifecycle-logger/index.js';
import { emitStepProgress } from '../../lib/progress-callback/index.js';

// Socratic method guidelines
const socraticGuidelines = `Using the Socratic method, ask one short question that challenges assumptions`;

// Prompt builders
const buildAskPrompt = (topic, historyText) =>
  `${historyText ? `${historyText}\n` : ''}${socraticGuidelines} about "${topic}".`;

const buildAnswerPrompt = (question, historyText) => `${
  historyText ? `${historyText}\n` : ''
}Answer the question thoughtfully and briefly:
"${question}"`;

const defaultAsk = async ({
  topic,
  history = [],
  model = modelService.getBestPublicModel(),
  logger,
  maxAttempts = 3,
  onProgress,
  now = new Date(),
} = {}) => {
  const historyText = history.map((turn) => `Q: ${turn.question}\nA: ${turn.answer}`).join('\n');
  const prompt = buildAskPrompt(topic, historyText);

  logger?.logEvent('ask-prompt', extractPromptAnalysis(prompt));

  const budget = model.budgetTokens(prompt);
  const response = await retry(chatGPT, {
    label: 'socratic-ask',
    maxAttempts,
    onProgress,
    now,
    chainStartTime: now,
    chatGPTPrompt: prompt,
    chatGPTConfig: {
      maxTokens: budget.completion,
      temperature: 0.7,
      modelOptions: {
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'socratic_question',
            schema: socraticQuestionSchema,
          },
        },
      },
      logger,
    },
  });

  return response;
};

const defaultAnswer = async ({
  question,
  history = [],
  _topic,
  model = modelService.getBestPublicModel(),
  logger,
  maxAttempts = 3,
  onProgress,
  now = new Date(),
} = {}) => {
  const historyText = history.map((turn) => `Q: ${turn.question}\nA: ${turn.answer}`).join('\n');
  const prompt = buildAnswerPrompt(question, historyText);

  logger?.logEvent('answer-prompt', extractPromptAnalysis(prompt));

  const budget = model.budgetTokens(prompt);
  const response = await retry(chatGPT, {
    label: 'socratic-answer',
    maxAttempts,
    onProgress,
    now,
    chainStartTime: now,
    chatGPTPrompt: prompt,
    chatGPTConfig: {
      maxTokens: budget.completion,
      temperature: 0.7,
      modelOptions: {
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'socratic_answer',
            schema: socraticAnswerSchema,
          },
        },
      },
      logger,
    },
  });

  return response;
};

class SocraticMethod {
  constructor(
    statement,
    {
      ask = defaultAsk,
      answer = defaultAnswer,
      logger,
      maxAttempts = 3,
      onProgress,
      now = new Date(),
    } = {}
  ) {
    this.statement = statement;
    this.ask = ask;
    this.answer = answer;
    this.history = [];
    this.maxAttempts = maxAttempts;
    this.onProgress = onProgress;
    this.now = now;
    this.logger = createLifecycleLogger(logger, 'chain:socratic');

    // Log construction
    this.logger.logStart({
      statement,
      hasCustomAsk: ask !== defaultAsk,
      hasCustomAnswer: answer !== defaultAnswer,
      maxAttempts,
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
      logger: this.logger,
      maxAttempts: this.maxAttempts,
      onProgress: this.onProgress,
      now: this.now,
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
      logger: this.logger,
      maxAttempts: this.maxAttempts,
      onProgress: this.onProgress,
      now: this.now,
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
    return this.history;
  }
}

export const socratic = (statement, options) => new SocraticMethod(statement, options);

export default SocraticMethod;
