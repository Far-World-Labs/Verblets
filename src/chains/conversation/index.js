import conversationTurnReduce from '../conversation-turn-reduce/index.js';
import { defaultTurnPolicy } from './turn-policies.js';
import pLimit from 'p-limit';

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
  constructor(topic, speakers, options = {}) {
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

    const { rules = {}, speakFn, bulkSpeakFn, maxParallel = 3, llm, ...otherOptions } = options;

    if (rules.shouldContinue && typeof rules.shouldContinue !== 'function') {
      throw new Error('shouldContinue must be a function');
    }

    this.topic = topic;
    this.speakers = speakers.slice();
    this.rules = Object.assign(
      {
        shouldContinue: (round) => round < 3, // Default to 3 rounds
        turnPolicy: rules.turnPolicy || defaultTurnPolicy(this.speakers),
      },
      rules
    );
    this.speakFn = speakFn;
    this.bulkSpeakFn = bulkSpeakFn;
    this.maxParallel = maxParallel;

    // If no functions provided, default to our conversationTurnReduce
    if (!this.speakFn && !this.bulkSpeakFn) {
      this.bulkSpeakFn = conversationTurnReduce;
    }
    this.llm = llm;
    this.otherOptions = otherOptions;
    this.messages = [];
  }

  _push(id, comment) {
    const trimmed = (comment ?? '').trim();
    if (!trimmed) return;
    const speaker = this.speakers.find((s) => s.id === id);
    const idx = this.speakers.indexOf(speaker);
    const name = speaker?.name || `Speaker ${idx + 1}`;
    const time = new Date().toISOString().substring(11, 16);
    this.messages.push({ id, name, comment: trimmed, time });
  }

  async run() {
    let round = 0;
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
          speakers,
          topic: this.topic,
          history: this.messages.slice(),
          rules: this.rules,
          llm: this.llm,
          ...this.otherOptions,
        });
        comments.forEach((comment, idx) => {
          this._push(speakers[idx].id, comment);
        });
      } else if (this.speakFn) {
        // Use provided speakFn with controlled concurrency
        const limit = pLimit(this.maxParallel);

        const speakerPromises = speakers.map((speaker, index) =>
          limit(() =>
            this.speakFn({
              speaker,
              topic: this.topic,
              history: this.messages.slice(),
              rules: this.rules,
              llm: this.llm,
              ...this.otherOptions,
            })
              .then((comment) => ({ speaker, comment, index }))
              .catch((error) => {
                console.warn(`Speaker ${speaker.id} failed:`, error.message);
                return { speaker, comment: '', index };
              })
          )
        );

        const results = await Promise.all(speakerPromises);

        // Push comments in original speaker order
        results
          .sort((a, b) => a.index - b.index)
          .forEach(({ speaker, comment }) => {
            if (comment) {
              this._push(speaker.id, comment);
            }
          });
      }

      round += 1;
    }

    return this.messages;
  }
}
