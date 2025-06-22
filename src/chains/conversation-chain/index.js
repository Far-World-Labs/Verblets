import chatGPT from '../../lib/chatgpt/index.js';
import modelService from '../../services/llm-model/index.js';

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

const historySnippet = (history) =>
  history.map((m) => `${m.time} ${m.name} (${m.id}): ${m.comment}`).join('\n');

const speakersBlock = (speakers) => {
  return speakers
    .map((p, i) => {
      const name = p.name || `Speaker ${i + 1}`;
      const parts = [name];
      if (p.bio) parts.push(`- ${p.bio}`);
      if (p.agenda) parts.push(`agenda: ${p.agenda}`);
      return parts.join(' ');
    })
    .join('\n');
};

export const SPEAK_PROMPT =
  '{forOthersToReplace}\n{bios}\n{history}{speakerName} on "{topic}": respond to others, engage with the discussion, and contribute your perspective.';

export const BULK_SPEAK_PROMPT =
  '{forOthersToReplace}\n{bios}\n{history}Multiple speakers are responding to "{topic}". Generate responses for each speaker that engage with the discussion and reflect their unique perspectives. Return responses in order:\n\n{speakerNames}';

const buildPrompt = (template, vars) =>
  template
    .replace('{forOthersToReplace}', vars.customPrompt || '')
    .replace('{bios}', vars.bios)
    .replace('{history}', vars.history ? `${vars.history}\n` : '')
    .replace('{topic}', vars.topic)
    .replace('{speakerName}', vars.speakerName || '')
    .replace('{speakerNames}', vars.speakerNames || '');

const defaultBulkSpeakFn = async ({
  speakers,
  topic,
  history,
  rules,
  model = modelService.getBestPublicModel(),
}) => {
  const snippet = historySnippet(history);
  const bios = speakersBlock(speakers);
  const speakerNames = speakers
    .map((s, i) => `${i + 1}. ${s.name || `Speaker ${i + 1}`}`)
    .join('\n');

  const prompt = buildPrompt(BULK_SPEAK_PROMPT, {
    customPrompt: rules.customPrompt,
    bios,
    history: snippet,
    topic,
    speakerNames,
  });

  const budget = model.budgetTokens(prompt);
  const response = await chatGPT(prompt, { maxTokens: budget.completion });

  // Parse the response into individual comments
  // Simple parsing: split by numbered lines or speaker names
  const lines = response.split('\n').filter((line) => line.trim());
  const comments = [];
  let currentComment = '';

  for (const line of lines) {
    // Check if line starts with a number (1., 2., etc.) or speaker name
    const isNewSpeaker =
      /^\d+\./.test(line.trim()) || speakers.some((s) => line.includes(s.name || ''));

    if (isNewSpeaker && currentComment) {
      comments.push(currentComment.trim());
      currentComment = line.replace(/^\d+\.\s*/, '').replace(/^[^:]*:\s*/, '');
    } else if (isNewSpeaker) {
      currentComment = line.replace(/^\d+\.\s*/, '').replace(/^[^:]*:\s*/, '');
    } else {
      currentComment += ` ${line}`;
    }
  }

  if (currentComment) {
    comments.push(currentComment.trim());
  }

  // Ensure we have the right number of comments
  while (comments.length < speakers.length) {
    comments.push(`I agree with the previous points made.`);
  }

  return comments.slice(0, speakers.length);
};

// Keep the single speaker function for backward compatibility
const defaultSpeakFn = async ({
  speaker,
  topic,
  history,
  rules,
  model = modelService.getBestPublicModel(),
}) => {
  const snippet = historySnippet(history);
  const bios = speakersBlock([speaker]);
  const prompt = buildPrompt(SPEAK_PROMPT, {
    customPrompt: rules.customPrompt,
    bios,
    history: snippet,
    topic,
    speakerName: speaker.name || 'Speaker',
  });
  const budget = model.budgetTokens(prompt);
  return await chatGPT(prompt, { maxTokens: budget.completion });
};

export default class ConversationChain {
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
      speakFn = defaultSpeakFn,
      bulkSpeakFn = defaultBulkSpeakFn, // Default to bulk processing
    } = options;

    if (rules.shouldContinue && typeof rules.shouldContinue !== 'function') {
      throw new Error('shouldContinue must be a function');
    }

    this.topic = topic;
    this.speakers = speakers.slice();
    this.rules = Object.assign(
      {
        shouldContinue: (round) => round < 1,
      },
      rules
    );
    this.speakFn = speakFn;
    this.bulkSpeakFn = bulkSpeakFn;
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
      if (round >= 50) break;

      let order;
      if (typeof this.rules.turnPolicy === 'function') {
        order = this.rules.turnPolicy(round, this.messages.slice()) || [];
        order = order.filter((id) => this.speakers.some((p) => p.id === id));
      } else {
        order = this.speakers.map((p) => p.id);
      }

      if (order.length === 0) {
        order = this.speakers.map((p) => p.id);
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
