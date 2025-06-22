import chatGPT from '../../lib/chatgpt/index.js';
import modelService from '../../services/llm-model/index.js';

/**
 * @typedef {Object} Speaker
 * @property {string} id
 * @property {'participant'|'facilitator'} [role]
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
 * @property {boolean} [facilitatorTurns]
 * @property {boolean} [summaryRound]
 * @property {(round:number, history:Message[]) => string[]} [turnPolicy]
 * @property {(round:number, history:Message[]) => boolean} [shouldContinue]
 * @property {string} [customPrompt]
 */

const historySnippet = (history) =>
  history.map((m) => `${m.time} ${m.name} (${m.id}): ${m.comment}`).join('\n');

const speakersBlock = (speakers) => {
  const ordered = speakers.slice();
  const facIndex = ordered.findIndex((p) => p.role === 'facilitator');
  if (facIndex > -1) {
    const [fac] = ordered.splice(facIndex, 1);
    ordered.unshift(fac);
  }
  return ordered
    .map((p, i) => {
      const name = p.name || `Speaker ${i + 1}`;
      const parts = [`${name} (${p.role || 'participant'})`];
      if (p.bio) parts.push(`- ${p.bio}`);
      if (p.agenda) parts.push(`agenda: ${p.agenda}`);
      return parts.join(' ');
    })
    .join('\n');
};

export const FACILITATOR_PROMPT =
  '{forOthersToReplace}\n{bios}\n{history}Facilitate the conversation on "{topic}". Summarize progress and invite more discussion.';
export const SPEAK_PROMPT =
  '{forOthersToReplace}\n{bios}\n{history}{speakerName} on "{topic}": respond to others, push your agenda, note agreement or disagreement in two sentences or less.';
export const SUMMARY_PROMPT =
  '{forOthersToReplace}\n{bios}\n{history}Give a short closing statement summarizing {speakerName}\'s perspective on "{topic}".';

const buildPrompt = (template, vars) =>
  template
    .replace('{forOthersToReplace}', vars.customPrompt || '')
    .replace('{bios}', vars.bios)
    .replace('{history}', vars.history ? `${vars.history}\n` : '')
    .replace('{topic}', vars.topic)
    .replace('{speakerName}', vars.speakerName || '');

const defaultFacilitatorFn = async ({
  topic,
  rules,
  speakers,
  history,
  model = modelService.getBestPublicModel(),
}) => {
  const snippet = historySnippet(history);
  const bios = speakersBlock(speakers);
  const prompt = buildPrompt(FACILITATOR_PROMPT, {
    customPrompt: rules.customPrompt,
    bios,
    history: snippet,
    topic,
  });
  const budget = model.budgetTokens(prompt);
  return await chatGPT(prompt, { maxTokens: budget.completion });
};

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

const defaultSummaryFn = async ({
  speaker,
  topic,
  history,
  model = modelService.getBestPublicModel(),
}) => {
  const snippet = historySnippet(history);
  const bios = speakersBlock([speaker]);
  const prompt = buildPrompt(SUMMARY_PROMPT, {
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
      facilitatorFn = defaultFacilitatorFn,
      speakFn = defaultSpeakFn,
      summaryFn = defaultSummaryFn,
      bulkSpeakFn = null,
      bulkSummaryFn = null,
    } = options;

    if (rules.shouldContinue && typeof rules.shouldContinue !== 'function') {
      throw new Error('shouldContinue must be a function');
    }

    this.topic = topic;
    this.speakers = speakers.slice();
    this.rules = Object.assign(
      {
        facilitatorTurns: true,
        summaryRound: true,
        shouldContinue: (round) => round < 1,
      },
      rules
    );
    this.facilitatorFn = facilitatorFn;
    this.speakFn = speakFn;
    this.summaryFn = summaryFn;
    this.bulkSpeakFn = bulkSpeakFn;
    this.bulkSummaryFn = bulkSummaryFn;
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
    const facilitator = this.speakers.find((p) => p.role === 'facilitator');
    const others = this.speakers.filter((p) => p.role !== 'facilitator');

    let round = 0;
    let finalOrder = others.map((p) => p.id);
    while (this.rules.shouldContinue(round, this.messages.slice())) {
      if (round >= 50) break;
      if (facilitator && this.rules.facilitatorTurns !== false) {
        // eslint-disable-next-line no-await-in-loop
        const comment = await this.facilitatorFn({
          topic: this.topic,
          speakers: this.speakers,
          rules: this.rules,
          history: this.messages.slice(),
        });
        this._push(facilitator.id, comment);
      }

      let order;
      if (typeof this.rules.turnPolicy === 'function') {
        order = this.rules.turnPolicy(round, this.messages.slice()) || [];
        order = order.filter((id) => others.some((p) => p.id === id));
      } else {
        order = others.map((p) => p.id);
      }
      finalOrder = order.length ? order : others.map((p) => p.id);

      const speakers = finalOrder.map((id) => others.find((p) => p.id === id)).filter(Boolean);

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

    if (this.rules.summaryRound !== false) {
      const missing = others.filter((p) => !finalOrder.includes(p.id)).map((p) => p.id);
      const summaryOrder = [...finalOrder, ...missing];
      const summarySpeakers = summaryOrder
        .map((id) => others.find((p) => p.id === id))
        .filter(Boolean);

      if (this.bulkSummaryFn) {
        const comments = await this.bulkSummaryFn({
          speakers: summarySpeakers,
          topic: this.topic,
          history: this.messages.slice(),
        });
        comments.forEach((comment, idx) => {
          this._push(summarySpeakers[idx].id, comment);
        });
      } else {
        for (const speaker of summarySpeakers) {
          // eslint-disable-next-line no-await-in-loop
          const comment = await this.summaryFn({
            speaker,
            topic: this.topic,
            history: this.messages.slice(),
          });
          this._push(speaker.id, comment);
        }
      }
    }

    return this.messages;
  }
}
