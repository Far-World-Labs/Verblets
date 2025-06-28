import chatGPT from '../../lib/chatgpt/index.js';
import modelService from '../../services/llm-model/index.js';

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

const SPEAK_PROMPT =
  '{forOthersToReplace}\n{bios}\n{history}{speakerName} on "{topic}": respond to others, engage with the discussion, and contribute your perspective.';

const buildPrompt = (template, vars) =>
  template
    .replace('{forOthersToReplace}', vars.customPrompt || '')
    .replace('{bios}', vars.bios)
    .replace('{history}', vars.history ? `${vars.history}\n` : '')
    .replace('{topic}', vars.topic)
    .replace('{speakerName}', vars.speakerName || '');

/**
 * Generate a conversation response for a single speaker
 *
 * @param {Object} options - Configuration options
 * @param {Object} options.speaker - Speaker object with id, name, bio, agenda
 * @param {string} options.topic - The conversation topic
 * @param {Array} options.history - Array of previous messages
 * @param {Object} options.rules - Conversation rules including customPrompt
 * @param {Object} options.model - LLM model to use (defaults to best public model)
 * @returns {Promise<string>} The speaker's response
 */
export default async function conversationTurn({
  speaker,
  topic,
  history = [],
  rules = {},
  model = modelService.getBestPublicModel(),
}) {
  if (!speaker) {
    throw new Error('Speaker is required');
  }

  if (!topic) {
    throw new Error('Topic is required');
  }

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
}
