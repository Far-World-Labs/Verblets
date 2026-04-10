import conversationTurnReduce from '../conversation-turn-reduce/index.js';
import { defaultTurnPolicy } from './turn-policies.js';
import { debug } from '../../lib/debug/index.js';
import { nameStep, getOptions, withPolicy } from '../../lib/context/option.js';
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { Outcome, ErrorPosture } from '../../lib/progress/constants.js';
import { parallel } from '../../lib/index.js';

const name = 'conversation';

/**
 * Map depth option. Accepts a number or 'shallow'|'deep'.
 * @param {string|number|undefined} value
 * @returns {number}
 */
export const mapDepth = (value) => {
  if (value === undefined) return 3;
  if (typeof value === 'number') return value;
  return { shallow: 1, med: 3, deep: 6 }[value] ?? 3;
};

/**
 * Map maxParallel option. Accepts a number or 'low'|'high'.
 * @param {string|number|undefined} value
 * @returns {number}
 */
export const mapMaxParallel = (value) => {
  if (value === undefined) return 3;
  if (typeof value === 'number') return value;
  return { low: 1, med: 3, high: 6 }[value] ?? 3;
};

/**
 * @typedef {Object} Speaker
 * @property {string} id
 * @property {string} [bio]
 * @property {string} [name]
 * @property {string} [agenda]
 */

/**
 * @typedef {Object} Message
 * @property {string} id
 * @property {string} name
 * @property {string} comment
 * @property {string} time
 */

/**
 * @typedef {Object} ConversationRules
 * @property {(round:number, history:Message[]) => string[]} [turnPolicy]
 * @property {(round:number, history:Message[]) => boolean} [shouldContinue]
 * @property {string} [customPrompt]
 */

export default class Conversation {
  static async create(topic, speakers, options = {}) {
    if (!speakers || speakers.length === 0) {
      throw new Error('Speakers required');
    }

    const idSet = new Set();
    speakers.forEach((p) => {
      if (idSet.has(p.id)) {
        throw new Error('Duplicate speaker id');
      }
      idSet.add(p.id);
    });

    const runConfig = nameStep(name, options);
    const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
    emitter.start();
    const { depth, maxParallel } = await getOptions(runConfig, {
      depth: withPolicy(mapDepth),
      maxParallel: withPolicy(mapMaxParallel),
    });
    return new Conversation(
      topic,
      speakers,
      { config: runConfig, emitter },
      { depth, maxParallel }
    );
  }

  //TODO:DOCS_OBSERVATIONS constructor is public but callers should use static create() — consider making constructor private or documenting the resolved parameter contract
  constructor(topic, speakers, options = {}, resolved = {}) {
    // options may be { config, emitter } from create() or plain config (direct construction)
    const fromCreate = options.emitter && options.config;
    this.emitter = fromCreate ? options.emitter : undefined;
    const config = fromCreate ? options.config : nameStep(name, options);

    const {
      rules = {},
      speakFn,
      bulkSpeakFn,
      llm,
      clock,
      onProgress: _onProgress,
      now: _now,
      operation: _operation,
      ...otherOptions
    } = config;

    if (rules.shouldContinue && typeof rules.shouldContinue !== 'function') {
      throw new Error('shouldContinue must be a function');
    }

    this.topic = topic;
    this.speakers = speakers.slice();
    const depth = resolved.depth ?? 3;
    this.rules = Object.assign(
      {
        shouldContinue: (round) => round < depth,
        turnPolicy: rules.turnPolicy || defaultTurnPolicy(this.speakers),
      },
      rules
    );
    this.speakFn = speakFn;
    this.bulkSpeakFn = bulkSpeakFn;
    this.maxParallel = resolved.maxParallel ?? 3;

    // If no functions provided, default to our conversationTurnReduce
    if (!this.speakFn && !this.bulkSpeakFn) {
      this.bulkSpeakFn = conversationTurnReduce;
    }
    this.llm = llm;
    this.clock = clock || (() => new Date());
    if (!this.emitter) {
      // Direct construction path — create an emitter for lifecycle emission
      this.emitter = createProgressEmitter(name, config.onProgress, config);
    }
    this.onProgress = config.onProgress;
    this.runConfig = config;
    this.otherOptions = otherOptions;
    this.messages = [];
  }

  _push(id, comment) {
    const trimmed = (comment ?? '').trim();
    if (!trimmed) return;
    const speaker = this.speakers.find((s) => s.id === id);
    const idx = this.speakers.indexOf(speaker);
    const name = speaker?.name || `Speaker ${idx + 1}`;
    const time = this.clock().toISOString().substring(11, 16);
    this.messages.push({ id, name, comment: trimmed, time });
  }

  async run() {
    try {
      let round = 0;
      const batchDone = this.emitter.batch();
      while (this.rules.shouldContinue(round, this.messages.slice())) {
        let order = this.rules.turnPolicy(round, this.messages.slice()) || [];
        order = order.filter((id) => this.speakers.some((p) => p.id === id));

        // If order is empty, use default policy
        if (order.length === 0) {
          order = defaultTurnPolicy(this.speakers)(round, this.messages.slice());
        }

        const speakers = order.map((id) => this.speakers.find((p) => p.id === id)).filter(Boolean);

        if (this.bulkSpeakFn) {
          // Use bulkSpeakFn (either provided or default conversationTurnReduce)
          const comments = await this.bulkSpeakFn({
            ...this.runConfig,
            ...this.otherOptions,
            speakers,
            topic: this.topic,
            history: this.messages.slice(),
            rules: this.rules,
            llm: this.llm,
            onProgress: scopePhase(this.runConfig.onProgress, `round-${round}`),
          });
          comments.forEach((comment, idx) => {
            this._push(speakers[idx].id, comment);
          });
        } else if (this.speakFn) {
          // Use provided speakFn with controlled concurrency
          const results = await parallel(
            speakers,
            async (speaker) => {
              try {
                const comment = await this.speakFn({
                  ...this.runConfig,
                  ...this.otherOptions,
                  speaker,
                  topic: this.topic,
                  history: this.messages.slice(),
                  rules: this.rules,
                  llm: this.llm,
                  onProgress: scopePhase(this.runConfig.onProgress, `round-${round}`),
                });
                return { speaker, comment };
              } catch (error) {
                debug(`Speaker ${speaker.id} failed: ${error.message}`);
                return { speaker, comment: '' };
              }
            },
            {
              maxParallel: this.maxParallel,
              errorPosture: ErrorPosture.resilient,
              abortSignal: this.runConfig?.abortSignal,
            }
          );

          // Push comments in original speaker order (parallel preserves order)
          results.forEach(({ speaker, comment }) => {
            if (comment) {
              this._push(speaker.id, comment);
            }
          });
        }

        round += 1;
        batchDone(1);
      }

      this.emitter.complete({ outcome: Outcome.success });

      return this.messages;
    } catch (err) {
      this.emitter.error(err);
      throw err;
    }
  }
}
