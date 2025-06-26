import conversationTurn from '../../verblets/conversation-turn/index.js';
import conversationTurnMulti from '../../verblets/conversation-turn-multi/index.js';
import { defaultTurnPolicy } from './turn-policies.js';

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

    const {
      rules = {},
      speakFn = conversationTurn,
      bulkSpeakFn = conversationTurnMulti, // Default to bulk processing
    } = options;

    if (rules.shouldContinue && typeof rules.shouldContinue !== 'function') {
      throw new Error('shouldContinue must be a function');
    }

    this.topic = topic;
    this.speakers = speakers.slice();
    this.rules = Object.assign(
      {
        shouldContinue: (round) => round < 3, // Default to 3 rounds
      },
      rules
    );
    this.speakFn = speakFn;
    this.bulkSpeakFn = bulkSpeakFn;
    this.messages = [];

    // Create default turn policy for fallback
    this.defaultTurnPolicy = defaultTurnPolicy(this.speakers);
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
      if (round >= 50) break;

      let order;
      if (typeof this.rules.turnPolicy === 'function') {
        order = this.rules.turnPolicy(round, this.messages.slice()) || [];
        order = order.filter((id) => this.speakers.some((p) => p.id === id));
      } else {
        order = this.defaultTurnPolicy(round, this.messages.slice());
      }

      // If order is empty, fall back to default sampling policy
      if (order.length === 0) {
        order = this.defaultTurnPolicy(round, this.messages.slice());
      }

      const speakers = order.map((id) => this.speakers.find((p) => p.id === id)).filter(Boolean);

      if (this.bulkSpeakFn) {
        const comments = await this.bulkSpeakFn({
          speakers,
          topic: this.topic,
          history: this.messages.slice(),
          rules: this.rules,
        });
        comments.forEach((comment, idx) => {
          this._push(speakers[idx].id, comment);
        });
      } else {
        for (const speaker of speakers) {
          // eslint-disable-next-line no-await-in-loop
          const comment = await this.speakFn({
            speaker,
            topic: this.topic,
            history: this.messages.slice(),
            rules: this.rules,
          });
          this._push(speaker.id, comment);
        }
      }

      round += 1;
    }

    return this.messages;
  }
}
