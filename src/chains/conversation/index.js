import conversationTurnReduce from '../conversation-turn-reduce/index.js';
import { defaultTurnPolicy } from './turn-policies.js';
import { resolveTexts } from '../../lib/instruction/index.js';
import { debug } from '../../lib/debug/index.js';
import { nameStep, getOptions, withPolicy } from '../../lib/context/option.js';
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { DomainEvent, Outcome, ErrorPosture } from '../../lib/progress/constants.js';
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

    const { text: topicText, context: bundleContext } = resolveTexts(topic, []);
    const runConfig = nameStep(name, options);
    const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
    emitter.start();
    emitter.emit({ event: DomainEvent.input, value: { topic: topicText, speakers } });
    const { depth, maxParallel } = await getOptions(runConfig, {
      depth: withPolicy(mapDepth),
      maxParallel: withPolicy(mapMaxParallel),
    });
    return new Conversation(
      topicText,
      speakers,
      { config: runConfig, emitter, bundleContext },
      { depth, maxParallel }
    );
  }

  constructor(topic, speakers, options = {}, resolved = {}) {
    // options may be { config, emitter } from create() or plain config (direct construction)
    const fromCreate = options.emitter && options.config;
    this.emitter = fromCreate ? options.emitter : undefined;
    this.bundleContext = fromCreate ? (options.bundleContext ?? '') : '';
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
    this.speakerMemory = new Map();
  }

  _push(id, comment) {
    const trimmed = (comment ?? '').trim();
    if (!trimmed) return;
    const speaker = this.speakers.find((s) => s.id === id);
    const idx = this.speakers.indexOf(speaker);
    const name = speaker?.name || `Speaker ${idx + 1}`;
    const time = this.clock().toISOString().substring(11, 16);
    const message = { id, name, comment: trimmed, time };
    this.messages.push(message);
    if (!this.speakerMemory.has(id)) {
      this.speakerMemory.set(id, []);
    }
    this.speakerMemory.get(id).push(message);
  }

  async run() {
    try {
      let round = 0;
      let speakersFailed = 0;
      let speakersAttempted = 0;
      const batchDone = this.emitter.batch();
      while (this.rules.shouldContinue(round, this.messages.slice())) {
        let order = this.rules.turnPolicy(round, this.messages.slice()) || [];
        order = order.filter((id) => this.speakers.some((p) => p.id === id));

        // If order is empty, use default policy
        if (order.length === 0) {
          order = defaultTurnPolicy(this.speakers)(round, this.messages.slice());
        }

        const speakers = order.map((id) => this.speakers.find((p) => p.id === id)).filter(Boolean);

        const memorySnapshot = new Map(
          [...this.speakerMemory].map(([id, msgs]) => [id, msgs.slice()])
        );

        if (this.bulkSpeakFn) {
          // Use bulkSpeakFn (either provided or default conversationTurnReduce)
          const comments = await this.bulkSpeakFn({
            ...this.runConfig,
            ...this.otherOptions,
            speakers,
            topic: this.topic,
            bundleContext: this.bundleContext,
            history: this.messages.slice(),
            speakerMemory: memorySnapshot,
            rules: this.rules,
            llm: this.llm,
            onProgress: scopePhase(this.runConfig.onProgress, `round-${round}`),
          });
          // Validate boundary contract: bulkSpeakFn must return array aligned
          // with speakers. Undefined entries (failed slots) are accepted —
          // _push silently drops empty/whitespace comments.
          if (!Array.isArray(comments) || comments.length !== speakers.length) {
            throw new Error(
              `conversation: bulkSpeakFn must return an array of length ${speakers.length} (got ${
                Array.isArray(comments) ? `array of ${comments.length}` : typeof comments
              })`
            );
          }
          comments.forEach((comment, idx) => {
            this._push(speakers[idx].id, comment);
          });
        } else if (this.speakFn) {
          speakersAttempted += speakers.length;
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
                  bundleContext: this.bundleContext,
                  history: this.messages.slice(),
                  speakerMemory: memorySnapshot,
                  rules: this.rules,
                  llm: this.llm,
                  onProgress: scopePhase(this.runConfig.onProgress, `round-${round}`),
                });
                return { speaker, comment, failed: false };
              } catch (error) {
                debug(`Speaker ${speaker.id} failed: ${error.message}`);
                return { speaker, comment: '', failed: true, error };
              }
            },
            {
              maxParallel: this.maxParallel,
              errorPosture: ErrorPosture.resilient,
              abortSignal: this.runConfig?.abortSignal,
            }
          );

          // Push comments in original speaker order (parallel preserves order)
          results.forEach(({ speaker, comment, failed }) => {
            if (failed) speakersFailed += 1;
            if (comment) {
              this._push(speaker.id, comment);
            }
          });
        }

        round += 1;
        batchDone(1);
      }

      // Total-failure detection: if any rounds ran but no messages produced,
      // surface explicitly rather than silently returning an empty conversation.
      if (round > 0 && this.messages.length === 0) {
        const err = new Error(
          `conversation: ${round} round${round === 1 ? '' : 's'} ran but no speakers produced messages`
        );
        this.emitter.error(err);
        throw err;
      }

      const outcome = speakersFailed > 0 ? Outcome.degraded : Outcome.success;
      this.emitter.emit({ event: DomainEvent.output, value: this.messages });
      this.emitter.complete({
        outcome,
        rounds: round,
        speakersAttempted,
        speakersFailed,
        messageCount: this.messages.length,
      });

      return this.messages;
    } catch (err) {
      this.emitter.error(err);
      throw err;
    }
  }
}

Conversation.knownTexts = [];
